<script setup>
import {getInstDetail, uploadSign} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import {storeToRefs} from 'pinia'
import WAvatar from "../../../common/WAvatar.vue";
import ProcessInstDiscuss from "./ProcessInstDiscuss.vue";
import ProcessInstRecord from "./ProcessInstRecord.vue";
import ProcessPreview from "./ProcessPreview.vue";
import WDialog from "../../../common/WDialog.vue";
import {getOldSign, searchOrgs} from "@/api/org.js";
import {getFallbackNodes, getWithdrawNodes, handlerTask, reviseInstance, urgingTask} from "@/api/task.js";
import {getManagerInstDetail, managerHandleTask} from "@/api/manager.js";
import WOrgPlusPicker from "../../../common/WOrgPlusPicker.vue";
import SignaturePad from "signature_pad";
import {
  base64ImgToFormData,
  copyValue,
  deepCopy,
  getRes,
  isEmpty,
  resizeBase64Img,
  useDragWidth,
} from "@/utils/GlobalFunc.js";
import WResUpload from "../../../common/WResUpload.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../common/WBrightBlock.vue";
import {getPrintConf} from "@/api/model.js";
import DefaultPrint from "../../../print/DefaultPrint.vue";
import WFormRender from "../../../design/form/WFormRender.vue";
const CustomPrintRender = defineAsyncComponent(() => import("../../../print/CustomPrintRender.vue"));

const {loginUser, instDrawerW} = storeToRefs(useWflowStore())
//拖拽设置宽度
const {setInstDrawerW} = useWflowStore()
useDragWidth('w-inst-drag', instDrawerW, {
  minWidth: 600,
  maxWidth: 1200,
  changeWidth: (w) => setInstDrawerW(w),
});

const show = ref(false)
const loading = ref(false)
const pLoading = ref(false)
const instId = ref(null)
const instance = ref({})
const parentInst = ref({})
const activeTab = ref('form')
const handlerDialog = ref(false)
const handlerLoading = ref(false)
const urgingDialog = ref(false)
const signDialog = ref(false)
const reviseMode = ref(false)
const printDialog = ref(false)
const printWidth = ref('50%')
const customPrint = ref(false)
const printConf = reactive({
  type: 'DEFAULT'
})

const printRef = ref()
const urgingForm = ref()
const instFormRef = ref()
const submitForm = ref()
const formPermConf = ref({})

const updateKey = ref(0)
const oldSign = ref(null)
let signaturePad = null
//@人员搜索列表
const atList = ref([])
const atLoading = ref(false)
//可回退/可撤回节点列表
const nodeOptions = ref([])
//缓存下当前要处理的task
const currentTask = ref()
const adminMode = ref(false)

//注入流程发起人数据
provide('initiator', instance.value.initiator)
//注入流程发起人部门数据
provide('startDept', instance.value.startDeptInfo)
//是否是发起流程状态
provide('isStart', false)

const urgingParams = reactive({
  instId: instId,
  targetUserIds: [],
  remark: null
})
//处理任务参数
const handlerParams = reactive({
  taskId: null,
  instId: instId,
  title: '处理任务',
  action: 'agree',
  signature: null, //签名
  saveSign: false, //是否保存签名
  useOldSign: true, //使用上次签名
  formData: {}, //表单数据
  variable: {}, //附加变量
  targetUsers: [], //目标人员
  targetNode: null, //目标节点ID
  otherNodeUsers: {}, //指定其他节点用户
  atUsers: [], //被@的人
  comment: { //评论意见
    text: '',
    images: [],
    files: []
  }
})
//快捷评论
const comments = {
  shows: [
    {text: '同意', type: 'primary'},
    {text: '情况属实', type: 'primary'},
    {text: '请补充材料', type: 'danger'},
    {text: '已核实', type: 'success'},
  ],
  options: ['请按规定办理', '退回修改']
}
//默认的表单模式
const formDfMode = computed(() => {
  return reviseMode.value ? 'E' : instance.value.defaultFieldPerm
})

const noMainForm = computed(() => {
  return instance.value.formType === 4
})

//没有可操作选项
const noOptions = computed(() => {
  const keys = Object.keys(instance.value.operationPerm)
  return keys.length === 0 || keys.every(v => !instance.value.operationPerm[v].enable)
})

const status = computed(() => {
  switch (instance.value.status) {
    case "RUNNING":
      return {
        text: '进行中',
        type: 'primary'
      }
    case "REFUSE":
      return {
        text: '被驳回',
        type: 'danger'
      }
    case "REVOKED":
      return {
        text: '被撤销',
        type: 'info'
      }
    case "PASS":
      return {
        text: '审批通过',
        type: 'success'
      }
  }
})
//要处理的任务
const activeTask = computed(() => {
  const idx = instance.value.todoTasks.findIndex(v => v.taskId === handlerParams.taskId)
  return idx > -1 ? instance.value.todoTasks[idx] : {}
})

const isNextAction = computed(() => ['agree', 'complete', 'reject'].includes(handlerParams.action))

const oPerm = computed(() => instance.value.operationPerm)
const aboutUserAction = computed(() => ['forward', 'beforeAdd', 'afterAdd'].includes(handlerParams.action))

const emit = defineEmits(['change'])
const formFields = ref([])

function open(id, taskId = null, nodeId = null, options = {}) {
  signaturePad = null
  adminMode.value = !!options.adminMode
  reviseMode.value = false
  activeTab.value = 'form'
  show.value = true
  instId.value = id
  currentTask.value = taskId
  handlerParams.taskId = taskId
  handlerParams.instId = id
  instance.value = {}
  parentInst.value = {}
  getDetail(nodeId)
}

function getParentInstDetail() {
  if (parentInst.value.instId || activeTab.value !== 'parentForm') return
  pLoading.value = true
  const request = adminMode.value
      ? getManagerInstDetail(instance.value.parentInstId, null, instance.value.parentNodeId)
      : getInstDetail(instance.value.parentInstId, instance.value.parentNodeId)
  request.then(res => {
    pLoading.value = false
    parentInst.value = res.data
    try {
      parentInst.value.formSource = JSON.parse(parentInst.value.formSource)
    } catch (e) {
      parentInst.value.formSource = {}
    }
  }).catch(err => {
    pLoading.value = false
    parentInst.value = {}
    ElMessage.error(err.msg)
  })
}

function getDetail(nodeId) {
  loading.value = true
  const request = adminMode.value
      ? getManagerInstDetail(instId.value, handlerParams.taskId, nodeId)
      : getInstDetail(instId.value, nodeId)
  return request.then(res => {
    loading.value = false
    instance.value = res.data
    try {
      instance.value.formSource = JSON.parse(instance.value.formSource)
    } catch (e) {
      instance.value.formSource = {}
    }
    activeTab.value = noMainForm.value ? 'record' : 'form'
    if (!handlerParams.taskId && instance.value.todoTasks.length > 0) {
      handlerParams.taskId = instance.value.todoTasks[0].taskId
    }
  }).catch(err => {
    loading.value = false
    instance.value = {}
    ElMessage.error(err.msg)
  })
}

function revise() {
  getDetail('node_root')
  reviseMode.value = true
}

function handler(action) {
  handlerParams.requestId = crypto.randomUUID()
  handlerParams.action = action
  handlerParams.title = oPerm.value[action].alisa || '处理流程'
  handlerParams.otherNodeUsers = {}
  handlerParams.targetUsers.length = 0
  handlerParams.targetNode = null
  handlerParams.atUsers.length = 0
  handlerParams.formData = {}
  handlerParams.comment = {
    text: '',
    images: [],
    files: []
  }
  //撤销流程屏蔽修改操作
  if (action === 'cancel') reviseMode.value = false
  if (isNextAction.value) {
    const doNext = () => {
      handlerDialog.value = true
      loadNodeAssignUser()
      if (action === 'agree' && activeTask.value.needSign) {
        loadOldSign()
      } else {
        handlerParams.signature = null
      }
    }
    //注意，默认机制是只有同意/拒绝/提交的时候才校验逻辑
    if (instFormRef.value?.validate) {
      instFormRef.value.validate().then(() => {
        //表单校验通过才打开操作弹框
        doNext()
      }).catch((err) => {
        activeTab.value = 'form'
        ElMessage.warning('校验失败: ' + err)
      })
    } else {
      doNext()
    }
  } else {
    handlerDialog.value = true
    if (action === 'fallback' || action === 'withdraw') {
      getNodeOptionsList()
    }
  }
}

function submit() {
  if (handlerParams.action === 'comment') {
    //评论必须填写意见
    if (isEmpty(handlerParams.comment.text)) {
      ElMessage.warning('请填写评论意见')
      return
    }
  }
  submitForm.value.validate().then(() => {
    const param = Object.assign({}, handlerParams)
    if (aboutUserAction.value) {
      //要把人员设置为ID
      param.targetUsers = param.targetUsers.map(u => u.id)
      //判断选中的人不能包含待处理的人
      if (param.targetUsers.findIndex(v => v == loginUser.id) > -1) {
        ElMessage.warning(`不能${handlerParams.title}给自己`)
        handlerLoading.value = false
        return
      }
    }
    if (isNextAction.value) {
      Object.keys(param.otherNodeUsers).forEach(key => {
        param.otherNodeUsers[key] = param.otherNodeUsers[key].map(u => u.id)
      })
      //只取可编辑的表单数据
      const fieldPermKeys = Object.keys(instance.value.fieldPerm)
      fieldPermKeys.forEach(key => {
        if (instance.value.fieldPerm[key] === 'E') {
          param.formData[key] = instance.value.formData[key]
        }
      })
      //如果是走默认权限，且是可编辑状态，那么所有表单字段都能编辑
      if (fieldPermKeys.length === 0 && formDfMode.value === 'E') {
        param.formData = deepCopy(instance.value.formData)
      }
    }
    handlerLoading.value = true;
    //判断是修改已结束的流程还是处理任务
    const request = reviseMode.value ? reviseInstance : (adminMode.value ? managerHandleTask : handlerTask)
    request(param).then(res => {
      handlerLoading.value = false
      handlerDialog.value = false
      reviseMode.value = false
      updateKey.value++;
      emit('change')
      //这里要切换到表单，防止下次处理没有渲染表单
      if (!noMainForm.value) activeTab.value = 'form'
      getDetail().then(() => {
        if (isNextAction.value || handlerParams.action === 'reject') {
          //处理成功后要移除指定的节点id任务
          currentTask.value = null
          //如果有任务，则默认处理第一个任务
          if (instance.value.todoTasks.length > 0) {
            handlerParams.taskId = instance.value.todoTasks[0].taskId
          }
        }
      })
    }).catch(err => {
      updateKey.value++
      handlerLoading.value = false
      ElMessage.error(err.msg)
    })
  }).catch(() => {
    ElMessage.warning('请完成表单项')
  })
}

function atRemove(pattern) {
  handlerParams.atUsers = handlerParams.atUsers.filter(u => u.name !== pattern)
}

function atSearch(pattern) {
  atLoading.value = true
  searchOrgs(pattern).then(res => {
    atLoading.value = false
    atList.value = res.data.map(u => {
      return {
        id: u.id,
        label: u.name,
        value: u.name,
        avatar: u.avatar
      }
    })
  }).catch(err => {
    atLoading.value = false
    ElMessage.error(err.msg)
  })
}

function atSelect(obj) {
  if (!handlerParams.atUsers.some(u => u.id === obj.id)) {
    handlerParams.atUsers.push({id: obj.id, name: obj.value})
  }
}

function getNodeOptionsList() {
  nodeOptions.value.length = 0
  const request = handlerParams.action === 'fallback' ?
      getFallbackNodes(instId.value, handlerParams.taskId)
      : getWithdrawNodes(instId.value)
  request.then(res => {
    nodeOptions.value = res.data
    if (nodeOptions.value.length > 0)
      handlerParams.targetNode = nodeOptions.value[0].nodeId
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function openUrging() {
  urgingDialog.value = true
  nextTick(() => {
    urgingForm.value.resetFields()
  })
}

function doUrging() {
  urgingForm.value.validate().then(() => {
    urgingTask(urgingParams).then(() => {
      urgingDialog.value = false
      ElMessage.success('催办成功')
    }).catch(err => {
      urgingDialog.value = false
      ElMessage.error('催办异常')
    })
  }).catch(() => ElMessage.warning("请完善催办信息"))
}

async function print() {
  formFields.value = await instFormRef.value.getFields(false)
  formPermConf.value = instFormRef.value?.getPermConf?.() || {}
  getPrintConf(instance.value.defineId).then(res => {
    printConf.type = res.data.type
    printConf.template = JSON.parse(res.data?.template)
    printDialog.value = true
    reloadPrintWidth()
  })
}

function reloadPrintWidth() {
  nextTick(() => {
    printWidth.value = printRef.value?.$el.offsetWidth + 20 || '800px'
  })
}

function signOk() {
  if (signaturePad.isEmpty()) {
    ElMessage.warning('请先签名')
  } else {
    signDialog.value = false
    submitForm.value.clearValidate('signature')
    resizeBase64Img(signaturePad.toDataURL('image/png'), 160, 80).then(data => {
      base64ImgToFormData(data, formData => {
        uploadSign(formData).then(res => {
          handlerParams.signature = `${res.data.url}?isSign=true`
        })
      })
    })
  }
}

function loadOldSign() {
  getOldSign().then(res => {
    oldSign.value = res.data
    handlerParams.signature = res.data
  })
}

function initSign() {
  if (signaturePad) {
    signaturePad.clear()
  } else {
    let canvas = document.getElementById('signPanel')
    canvas.setAttribute('width', '650px')
    canvas.setAttribute('height', '300px')
    signaturePad = new SignaturePad(canvas, {
      penColor: '#000000',
      minWidth: 2,
      maxWidth: 5,
    })
    signaturePad.onEnd = () => {
    }
  }
}

//禁止选中的人，比如加签防止优化故意重复选择某人
function getExcludeUsers() {
  return []
}

function copyInstId() {
  copyValue(instance.value.instId, () => ElMessage.success('复制成功'))
}

function doSign() {
  signDialog.value = true
  nextTick(() => initSign())
}

//加载节点指定的用户到参数用于回显
function loadNodeAssignUser() {
  const task = instance.value.todoTasks.find(t => t.taskId === handlerParams.taskId);
  if (task) {
    task.nodeAssigns?.forEach(nd => handlerParams.otherNodeUsers[nd.nodeId] = [...nd.assignedUsers])
  }
}

defineExpose({open})
</script>

<template>
  <el-drawer destroy-on-close class="w-inst" :size="instDrawerW" v-model="show">
    <template #header>
      <div class="w-inst-title">
        <el-tooltip effect="dark" content="拖拽调整宽度" placement="top">
          <el-icon id="w-inst-drag">
            <DCaret/>
          </el-icon>
        </el-tooltip>
        <el-text size="large">流程实例详情</el-text>
      </div>
    </template>
    <div v-loading="loading" :key="loading">
      <div class="w-inst-header" v-if="instance.initiator">
        <div class="w-flex-col-ct">
          <el-text tag="b" size="large" style="font-size: 18px; margin-right: 20px">{{ instance.defineName }}</el-text>
          <el-tag :type="status?.type">{{ status?.text }}</el-tag>
        </div>
        <el-tooltip content="点击复制" placement="top">
          <el-button link tag="p" style="margin: 10px 0" @click="copyInstId">
            <el-tag v-if="instance.parentInstId" size="small" type="primary" style="margin-right: 10px">子流程</el-tag>
            流水号：{{ instance.instId }}
          </el-button>
        </el-tooltip>
        <el-tag size="small" type="info" style="margin-left: 10px">v{{ instance.version }}</el-tag>
        <div class="w-flex-col-ct">
          <template v-if="instance.isAgent">
            <w-avatar :size="31" :id="instance.startUser.id" :name="instance.startUser.name"
                      :src="instance.startUser.avatar"/>
            <el-tag type="warning" size="small" style="margin: 0 10px">代</el-tag>
          </template>
          <w-avatar :size="31" :id="instance.initiator.id" :name="instance.initiator.name"
                    :src="instance.initiator.avatar"/>
          <el-divider direction="vertical"/>
          <el-text class="w-flex-col-ct">
            <img style="width: 20px; height: 20px; margin-right: 5px" src="/image/dept.png"/>
            {{ instance.startDept }}
          </el-text>
          <el-divider direction="vertical"/>
          <el-text>提交于 {{ instance.createTime }}</el-text>
        </div>
        <div class="w-inst-header-option">
          <el-button link icon="Printer" @click="print">打印</el-button>
        </div>
      </div>
      <el-tabs v-model="activeTab" :key="updateKey" v-if="instance.instId" @tab-change="getParentInstDetail">
        <el-tab-pane name="form" label="表单信息" v-if="instance.formType !== 4">
          <w-form-render v-model="instance.formData" :form-type="instance.formType"
                         :perm-conf="instance.fieldPerm" :config="instance?.formSource"
                         ref="instFormRef" :mode="formDfMode"/>
        </el-tab-pane>
        <el-tab-pane name="parentForm" lazy label="父流程表单" v-if="instance.parentInstId">
          <div v-loading="pLoading">
            <w-form-render v-model="parentInst.formData" :form-type="parentInst.formType"
                           :perm-conf="parentInst.fieldPerm" :config="parentInst?.formSource"
                           ref="instFormRef" mode="R"/>
          </div>
        </el-tab-pane>
        <el-tab-pane name="record" lazy label="流转记录">
          <process-inst-record :is-agent="instance.isAgent" :initiator="instance.initiator"
                               :status="instance.status" :inst-id="instance.instId"/>
        </el-tab-pane>
        <el-tab-pane name="process" lazy label="流程图">
          <process-preview :inst-id="instance.instId"/>
        </el-tab-pane>
        <el-tab-pane name="discuss" lazy label="讨论组" v-if="instance.discuss.showDiscuss">
          <process-inst-discuss :inst-id="instance.instId" :disable="!instance.discuss.enableDiscuss"/>
        </el-tab-pane>
      </el-tabs>
      <el-empty v-else description="未找到该流程数据😢"></el-empty>
    </div>
    <template #footer>
      <div class="w-inst-actions" v-if="oPerm && !noOptions">
        <div>
          <el-button text icon="ChatLineSquare" @click="handler('comment')" v-if="oPerm.comment.enable">
            {{ oPerm.comment.alisa }}
          </el-button>
          <el-button text icon="Switch" style="margin-left: 0" @click="handler('forward')" v-if="oPerm.forward.enable">
            {{ oPerm.forward.alisa }}
          </el-button>
          <el-button style="margin-left: 0" text icon="Back" @click="handler('fallback')" v-if="oPerm.fallback.enable">
            {{ oPerm.fallback.alisa }}
          </el-button>
          <el-dropdown v-if="oPerm.beforeAdd.enable || oPerm.afterAdd.enable" placement="top-start">
            <el-button text icon="CirclePlus" v-if="oPerm.beforeAdd.enable || oPerm.afterAdd.enable">
              加签
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item icon="BottomLeft" @click="handler('beforeAdd')" v-if="oPerm.beforeAdd.enable">
                  {{ oPerm.beforeAdd.alisa }}
                </el-dropdown-item>
                <el-dropdown-item icon="BottomRight" @click="handler('afterAdd')" v-if="oPerm.afterAdd.enable">
                  {{ oPerm.afterAdd.alisa }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button text type="warning" icon="TopLeft" @click="handler('withdraw')" v-if="oPerm.withdraw.enable">
            {{ oPerm.withdraw.alisa }}
          </el-button>
          <!--          <el-button text icon="Remove">减签</el-button>-->
          <el-button text icon="Bell" style="margin-left: 0" :disabled="(instance.todoUsers || []).length === 0"
                     v-if="oPerm.urging.enable" @click="openUrging">催办
          </el-button>
          <el-button type="warning" text icon="Edit" v-if="oPerm.revise.enable" @click="revise">
            {{ oPerm.revise.alisa }}
          </el-button>
          <el-button type="warning" text icon="RefreshLeft" v-if="oPerm.revoke.enable" @click="handler('revoke')">
            {{ oPerm.revoke.alisa }}
          </el-button>
        </div>
        <el-button plain type="primary" icon="Pointer" @click="handler('complete')" v-if="oPerm.complete.enable">
          {{ oPerm.complete.alisa }}
        </el-button>
        <el-button plain type="danger" icon="CircleClose" @click="handler('reject')" v-if="oPerm.reject.enable">
          {{ oPerm.reject.alisa }}
        </el-button>
        <el-button plain type="primary" icon="Finished" @click="handler('agree')" v-if="oPerm.agree.enable">
          {{ oPerm.agree.alisa }}
        </el-button>
      </div>
      <el-text type="info" v-else>不可操作</el-text>
    </template>
    <w-dialog v-model="handlerDialog" :ok-loading="handlerLoading" width="600" :title="handlerParams.title"
              close-free @ok="submit">
      <w-bright-block style="margin-bottom: 10px" v-if="reviseMode" show-icon
                      content="修改表单数据将会通知流程相关所有人员，且只能修改一次"/>
      <el-form label-position="top" ref="submitForm" :model="handlerParams" class="w-inst-handler">
        <el-form-item required prop="taskId" label="选择任务" v-if="instance.todoTasks.length > 1">
          <el-select style="flex: 1" :disabled="currentTask" v-model="handlerParams.taskId"
                     @change="loadNodeAssignUser">
            <el-option v-for="task in instance.todoTasks" :key="task.taskId"
                       :label="task.taskName" :value="task.taskId"/>
          </el-select>
        </el-form-item>
        <template v-if="isNextAction && instance.todoTasks.length > 0 && (activeTask.nodeAssigns || []).length > 0">
          <el-text>您可以指定/变更以下节点参与人</el-text>
          <el-form style="margin-top: 10px; margin-left: 10px">
            <el-form-item :label="node.nodeName" v-for="node in (activeTask.nodeAssigns || [])" :key="node.nodeId">
              <w-org-plus-picker :multiple="node.multiple" v-model="handlerParams.otherNodeUsers[node.nodeId]"
                                 type="user" placeholder="您可指定本节点参与人"/>
            </el-form-item>
          </el-form>
        </template>
        <el-form-item :rules="{required: true, message: `请选择${handlerParams.title}到哪个节点`}"
                      prop="targetNode" :label="`${handlerParams.title}节点`"
                      v-if="handlerParams.action === 'fallback' || handlerParams.action === 'withdraw' ">
          <el-select v-model="handlerParams.targetNode" :placeholder="`请选择${handlerParams.title}到哪个节点`">
            <el-option v-for="nd in nodeOptions" :key="nd.nodeId" :label="nd.nodeName" :value="nd.nodeId"/>
          </el-select>
        </el-form-item>
        <el-form-item :rules="{required: true, message: '请选择目标人员'}"
                      prop="targetUsers" label="选择人员" v-if="aboutUserAction">
          <w-org-plus-picker v-model="handlerParams.targetUsers" type="user"
                             :excludes="getExcludeUsers()"
                             :placeholder="`请设置要${handlerParams.title}给谁`"/>
        </el-form-item>
        <el-form-item label="处理意见" v-if="handlerParams.action !== 'withdraw'">
          <!-- el版本 >= 2.10.4 -->
          <el-mention v-model="handlerParams.comment.text" type="textarea" :options="atList"
                      :loading="atLoading" @search="atSearch" whole @select="atSelect"
                      placement="bottom" placeholder="输入处理意见，使用@可以指定人员"
                      :maxlength="250" show-word-limit @whole-remove="atRemove">
            <template #label="{ item }">
              <w-avatar :size="30" :name="item.label" :src="item.avatar"/>
            </template>
          </el-mention>
          <div>
            <w-res-upload block v-model:files="handlerParams.comment.files"
                          v-model:images="handlerParams.comment.images">
              <el-divider direction="vertical"/>
              <el-text>快捷意见：</el-text>
              <el-tag style="margin-right: 5px; cursor: pointer" v-for="cm in comments.shows"
                      :type="cm.type" @click="handlerParams.comment.text = cm.text">{{ cm.text }}
              </el-tag>
              <el-dropdown>
                <el-button style="padding: 10px" link icon="More">更多</el-button>
                <template #dropdown>
                  <el-dropdown-item v-for="cm in comments.options" @click="handlerParams.comment.text = cm">
                    {{ cm }}
                  </el-dropdown-item>
                </template>
              </el-dropdown>
            </w-res-upload>
          </div>
        </el-form-item>
        <el-form-item :rules="{required: true, message: '请使用鼠标完成签字'}" prop="signature" label="手写签字"
                      v-if="handlerParams.action === 'agree' && activeTask.needSign">
          <div :class="{'w-inst-sign': true, 'w-inst-sign-no': isEmpty(handlerParams.signature)}" @click="doSign">
            <img v-if="handlerParams.signature" style="cursor: pointer"
                 :src="getRes(handlerParams.signature)" width="100%"/>
          </div>
          <div class="w-flex-col-ct">
            <el-checkbox v-model="handlerParams.saveSign">保存本次签名</el-checkbox>
            <el-checkbox v-if="oldSign" v-model="handlerParams.useOldSign">使用上次签名</el-checkbox>
          </div>
        </el-form-item>
      </el-form>
    </w-dialog>
    <w-dialog title="请使用鼠标签字" width="700px" v-model="signDialog" @ok="signOk">
      <canvas id="signPanel"></canvas>
    </w-dialog>
    <w-dialog v-model="urgingDialog" width="600" title="流程催办" @ok="doUrging">
      <el-form label-width="80" ref="urgingForm" :model="urgingParams">
        <el-form-item prop="targetUserIds" required label="目标人员"
                      :rules="[{ required: true, type: 'array', message: '请设置催办人员' }]">
          <el-select v-model="urgingParams.targetUserIds" multiple placeholder="催办哪些人">
            <el-option v-for="user in instance.todoUsers.filter(v => v.id != loginUser.id)" :key="user.id"
                       :label="user.name" :value="user.id"/>
          </el-select>
        </el-form-item>
        <el-form-item prop="remark" label="附言">
          <el-input type="textarea" v-model="urgingParams.remark" :max="125" show-word-limit
                    placeholder="附加在对方催办通知的信息"/>
        </el-form-item>
      </el-form>
    </w-dialog>
    <w-dialog :width="printWidth" close-free v-model="printDialog" @ok="printRef.doPrint()">
      <template #title>
        <div class="w-flex-col-ct">
          <span>{{ instance.defineName }}-打印预览</span>
          <template v-if="!isEmpty(printConf.template)">
            <el-divider direction="vertical"/>
            <el-radio-group v-model="customPrint" @change="reloadPrintWidth">
              <el-radio label="默认模板" :value="false"/>
              <el-radio label="自定义模板" :value="true"/>
            </el-radio-group>
          </template>
        </div>
      </template>
      <default-print v-if="!customPrint" :perm-conf="formPermConf" :form-fields="formFields" :instance="instance"
                     ref="printRef"/>
      <custom-print-render v-else :config="printConf.template" :perm-conf="formPermConf"
                           :form-fields="instFormRef.getFields(false)"
                           @renderOk="reloadPrintWidth" :instance="instance" ref="printRef"/>
    </w-dialog>
  </el-drawer>
</template>

<style lang="less">
.w-inst {
  .el-drawer__header {
    margin-bottom: 0 !important;
  }

  .w-inst-title {
    display: flex;
    align-items: center;
    position: relative;

    .el-icon {
      color: var(--el-text-color-secondary);
      left: -17px;
      position: absolute;
      cursor: w-resize;
      transform: rotate(90deg);

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}

.w-inst-sign {
  cursor: pointer;
  width: 120px;
  height: 60px;
  margin-right: 20px;
  border: 1px solid var(--el-bg-color);
  border-radius: 5px;
  background: var(--el-fill-color-light);

  &:hover {
    border: 1px dashed var(--el-color-primary-light-3);
  }
}

.w-inst-sign-no {
  &:before {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--el-text-color-secondary);
    content: '点我签字';
  }
}

.w-inst-header {
  position: relative;

  .w-inst-header-option {
    position: absolute;
    top: 0;
    right: 0;
  }
}

.el-drawer__footer {
  padding: 10px !important;
  box-shadow: 0 0 5px 0 var(--el-border-color);
  //border-top: 1px solid var(--el-border-color);

  .w-inst-actions {
    display: flex;

    & > :first-child {
      flex: 1;
      text-align: left;
    }
  }
}

</style>
