<script setup>
import {useRoute} from 'vue-router';
import FromDesigner from "../design/form/FormDesigner.vue";
import ProcessDesigner from "./ProcessDesigner.vue";
import BaseSetting from "./BaseSetting.vue";
import PlusSetting from "./PlusSetting.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import WDialog from "../common/WDialog.vue";
import {
  deploy,
  getHisModels,
  getProcActiveModel,
  saveModel,
  getProcModelByVer,
  activeModel,
  updateModel
} from "@/api/model.js";
import FormVueDesigner from "../design/form/FormVueDesigner.vue";
import FormRefDesigner from "../design/form/FormRefDesigner.vue";
import InitiateProcess from "@/views/wflow/pages/workspace/subs/InitiateProcess.vue";
import router from "@/router/index.js";

const _this = getCurrentInstance()
const active = ref('BASE')
const route = useRoute();
const validVisible = ref(false)
const mockVisible = ref(false)
const loading = ref(true)
const loadingAll = ref(false)
//几个设置页面的ref
const validIndex = ref(0)
const form = ref()
const process = ref()
const validRefs = ref([
  {_ref: 'base', name: '基础设置', status: ''},
  {_ref: 'form', name: '表单设计', status: ''},
  {_ref: 'process', name: '流程设计', status: ''},
  {_ref: 'plus', name: '扩展设置', status: ''}
])
//校验结果
const validResult = ref({})
const hisModels = ref([])
//请求版本清单参数
const verParams = reactive({
  pageNo: 1,
  pageSize: 10,
  code: null
})

const activePd = computed(() => {
  return active.value === 'PROCESS'
})

const validIcon = computed(() => {
  if (!validResult.value.finished) {
    return 'loading'
  } else if (validResult.value.success) {
    return 'success'
  } else {
    return 'warning'
  }
})
//错误信息
const errTitle = computed(() => {
  if (validResult.value.finished && !validResult.value.success) {
    return (validResult.value.title + ` (${validResult.value.errs.length}项错误)`)
  }
  return validResult.value.title
})

const noMainForm = computed(() => designData.value.formType === 4)

//设计器数据
const designData = ref({
  procName: '未命名流程',
  logo: {
    name: 'file-icons:omnigraffle',
    bgc: '#4C87F3',
    color: '#FFFFFF'
  },
  groupId: route.params.groupId,
  formJson: {
    conf: {
      labelPosition: 'right',//标签位置
      labelWidth: 100,//标签宽度，
      _labelPosition: 'top',//移动端标签位置
      _labelWidth: 100,//移动端标签宽度，
      size: 'default',
      valid: { //校验规则
        type: 'SIMPLE',
        js: null,
        rules: []
      },
      showHide: { //显隐规则
        type: 'SIMPLE',
        js: null,
        rules: []
      },
      actionRule: {//表单联动
        type: 'SIMPLE',
        js: null,
        rules: []
      },
      onLoad: { //表单加载成功时的钩子
        type: 'SIMPLE',
        js: null,
        actions: []
      }
    },
    datasource: [],
    components: []
  },
  formType: 0,
  formCode: {
    pc: null,
    mb: null
  },
  formRef: {
    type: 'LOCAL', //LOCAL=本地组件, URL=URL挂载表单，CODE=通过编号挂载
    pcPath: null,
    mbPath: null
  },
  formFields: [], //表单字段清单
  //流程json
  process: [],
  events: {
    retry: 0,
    async: false,
    startup: [],
    pass: [],
    reject: [],
    revoked: []
  }, //流程事件监听器
  startupRange: 'ALL',
  startupPerm: [],
  adminPerm: [],
  setting: {
    code: { //流程编号设置
      type: "DEFAULT", //规则类型
      rules: [] //自定义规则
    },
    accessPerm: false, //开启查看权限控制
    discuss: {
      enable: true,
      endEnable: false
    }, //开启讨论组
    comment: {
      enable: true,
      endEnable: false
    }, //允许评论
    endComment: true, //是否允许评论已结束的流程
    endDiscuss: true, //是否允许讨论已结束的流程
    enableUrging: true, //允许催办
    enableCancel: false,
    agreeSign: false, //审批签字设置
    reloadUser: false, //是否每次都重新解析节点
    returnSkip: false, //退回再次流转是否跳过
    cancel: { //允许撤销已结束的流程
      timeout: 30,
      enable: false
    },
    revise: { //允许修改已结束的流程
      timeout: 30,
      enable: false
    },
    enableAgent: false, //允许代提交
    enableRevoke: false, //允许撤回操作
    print: { //打印设置
      type: 'DEFAULT', //DEFAULT、CUSTOM
      template: null
    },
    formSync: { //表单数据同步
      enable: false,
      range: false,
      events: [], //同步哪些事件
      type: 'DB', //同步类型 DB=数据库 API=接口
      apiUrl: null, //接口地址
      preCover: false, //前置处理
      preJs: 'return ctx',
      tbName: null, //数据库表名
      fieldMapping: [] //字段映射
    },
    deduplication: { //审批人去重规则
      type: 'NONE', //NONE、ONCE、NEXT
      isSkip: false //自动同意还是直接跳过
    }
  },
  remark: null
})

provide('designData', designData)
provide('noMainForm', noMainForm)

function getStepNum(pos) {
  switch (pos) {
    case 0: return '①';
    case 1: return '②';
    case 2: return noMainForm.value ? '②' : '③';
    case 3: return noMainForm.value ? '③' : '④';
  }
}
function switchMenu(index) {
  active.value = index
}

//获取表单字段清单
async function getFormFields() {
  const fields = form.value?.getFields()
  const isAsync = fields && typeof fields.then === 'function'
  const _fields = isAsync ? await fields : fields
  if (!fields) return []
  return _fields.map(v => {
    const val = {...v}
    delete val['props']
    return val
  })
}

function doSave(call) {
  const lastVersion = designData.value.lastVersion
  if (lastVersion &&  lastVersion!== designData.value.version) {
    ElMessageBox.confirm('检测到本流程存在未发布的草稿 [版本 v' + lastVersion + ']，保存当前数据将会覆盖并切换到草稿，是否继续?', '提示', {
      confirmButtonText: '保存并覆盖',
      cancelButtonText: '再看下吧',
      type: 'warning',
    }).then(() => {
      doSaveReq(() => {
        doSwitchVer(designData.value.code, lastVersion)
        if (call) call()
      })
    })
  } else {
    doSaveReq(call)
  }
}

async function doSaveReq(call){
  _this.refs.base.validate().then(() => {
    loadingAll.value = true
    const design = Object.assign({}, designData.value)
    coverModelData(design).finally(() => {
      saveModel(design).then(res => {
        loadingAll.value = false
        ElMessage.success('保存成功')
        designData.value.code = res.data
        if (call) call()
      }).catch(err => {
        loadingAll.value = false
        ElMessage.error(err.msg)
      })
    })
  }).catch(() => {
    active.value = 'BASE'
    ElMessage.error("请完善基础设置")
  })
}

async function mock(){
  try {
    for (let i = 0; i < validRefs.value.length; i++) {
      validIndex.value = i
      if (!(noMainForm.value && i === 1))
        await _this.refs[validRefs.value[validIndex.value]._ref].validate()
    }
    mockVisible.value = true
  } catch (err) {
    ElMessageBox.alert('模拟校验失败，请检查配置：' + (err || []).join('、'), '提示', {
      type: 'warning',
      confirmButtonText: '去处理'
    }).then(() => {
      doFix()
    })
  }
}

//分步校验流程表单设计
async function validate() {
  validVisible.value = true
  validIndex.value = 0
  validResult.value = {
    errs: [],
    finished: false,
    success: false,
    title: '检查中...',
    action: '去处理',
    desc: '正在检查设置项',
  }
  validRefs.value.forEach(v => v.status = '')
  for (let i = 0; i < validRefs.value.length; i++) {
    validIndex.value = i
    //阻塞一下
    if (!(noMainForm.value && i === 1)) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await _this.refs[validRefs.value[validIndex.value]._ref].validate()
    }
    validRefs.value[validIndex.value].status = 'success'
  }
}

function publish() {
  validate().then(() => {
    reloadValidResult(true)
  }).catch(errs => {
    reloadValidResult(false)
    validRefs.value[validIndex.value].status = 'error'
    if (Array.isArray(errs)) {
      validResult.value.errs.push(...errs)
    }
  })
}

//重置校验结果
function reloadValidResult(isSuccess) {
  validResult.value.finished = true
  validResult.value.success = isSuccess
  validResult.value.desc = ''
  validResult.value.action = isSuccess ? '去发布' : '去处理'
  validResult.value.title = isSuccess ? '校验成功😃' : '校验失败😥，发现'
  validRefs.value[validIndex.value].status = isSuccess ? 'success' : 'error'
}

function getModel(code) {
  loading.value = true
  getProcActiveModel(code).then(res => {
    loading.value = false
    loadModelData(designData, res)
    setTimeout(() => process.value.loadNodeMap(), 500)
    sessionStorage.designCode = designData.value.code
    if (res.data.lastVersion && designData.value.version !== res.data.lastVersion) {
      ElMessageBox.confirm('检测到本流程存在未发布的草稿 [版本 v' + res.data.lastVersion + ']，是否加载未发布的内容?', '提示', {
        confirmButtonText: '切换草稿',
        cancelButtonText: '不使用草稿',
        type: 'warning',
      }).then(() => {
        doSwitchVer(code, res.data.lastVersion)
      })
    }
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function loadModelData(designData, res){
  designData.value = res.data
  designData.value.logo = JSON.parse(res.data.logo)
  designData.value.formJson = JSON.parse(res.data.formJson)
  designData.value.formRef = JSON.parse(res.data.formRef || '{}')
  designData.value.process = JSON.parse(res.data.process)
  designData.value.startupPerm = JSON.parse(res.data.startupPerm || '[]')
  designData.value.adminPerm = JSON.parse(res.data.adminPerm || '[]')
  designData.value.setting = JSON.parse(res.data.setting || '{}')
  designData.value.formCode = getFormCode(res.data.formCode)
  designData.value.formFields = []
  designData.value.events = JSON.parse(res.data.events || JSON.stringify({
    startup: [], pass: [], reject: [], revoked: []}))
  //补充字段评论和讨论组设置，防止旧数据没有字段异常
  if (!designData.value.setting.comment) {
    designData.value.setting.comment = {
      enable: false,
      endEnable: false
    }
  }
  if (!designData.value.setting.discuss) {
    designData.value.setting.discuss = {
      enable: false,
      endEnable: false
    }
  }
}

async function coverModelData(design){
  design.logo = JSON.stringify(design.logo)
  design.formJson = JSON.stringify(design.formJson || {})
  design.formRef = JSON.stringify(design.formRef)
  design.process = JSON.stringify(design.process)
  design.adminPerm = JSON.stringify(design.adminPerm)
  design.startupPerm = JSON.stringify(design.startupPerm)
  design.setting = JSON.stringify(design.setting)
  design.formCode = JSON.stringify(design.formCode)
  design.events = JSON.stringify(design.events)
  const fields = await getFormFields()
  //这里从表单里面解析字段出来
  design.formFields = JSON.stringify(fields || [])
}

/**
 * 转换表单代码模式代码，兼容PC+移动端
 * @param formCode
 * @returns {{pc: null, mb: null}|any}
 */
function getFormCode(formCode) {
  try {
    return JSON.parse(formCode || '{}')
  } catch (e) {
    return {pc: formCode, mb: null};
  }
}

function getModelHisVer() {
  verParams.code = designData.value.code
  getHisModels(verParams).then(res => {
    hisModels.value = res.data
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

onMounted(() => {
  designData.value.groupId = route.query.groupId
  const code = route.query.code || sessionStorage.designCode
  if (code) {
    //是编辑流程，那么就从后端获取流程模型数据
    getModel(code)
  } else {
    const local = localStorage.getItem("designData")
    if (local) {
      const localData = JSON.parse(local)
      for (let key in designData.value) {
        designData.value[key] = localData[key]
      }
    }
    loading.value = false
  }
})

function doPublish(){
  ElMessageBox.confirm('您确定要发布该流程吗，发布后将生成新版本，是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(e => {
    loadingAll.value = true
    doSave(() => {
      validVisible.value = false
      deploy(designData.value.code).then(res => {
        ElMessage.success('发布成功')
        loadingAll.value = false
        getModel(designData.value.code)
      }).catch(err => {
        loadingAll.value = false
        ElMessage.error(err.msg)
      })
    })
  })
}

async function doUpdate() {
  ElMessageBox.confirm('本操作不会生成新版本流程，仅可更新【图标、名称、分组、备注、流程管理可发起权限设置、扩展设置】，其他内容的修改将被忽略，是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(e => {
    const design = Object.assign({}, designData.value)
    coverModelData(design).finally(() => {
      design.formFields = null
      design.process = null
      design.formJson = null
      updateModel(design).then(res => {
        ElMessage.success(res.data)
        validVisible.value = false
      }).catch(err => {
        ElMessage.error(err.msg)
      })
    })
  })
}

function doFix() {
  active.value = validRefs.value[validIndex.value]._ref.toUpperCase()
  validVisible.value = false
}

function doSwitchVer(code, version) {
  getProcModelByVer(code, version).then(res => {
    loadModelData(designData, res)
    setTimeout(() => process.value.loadNodeMap(), 500)
    ElMessage.success(`加载版本 v${version} 成功`)
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function switchVer(ver) {
  ElMessageBox.confirm('您确定要加载 [版本 v' + ver.version + ' ] 的流程设计吗，切换前请确保需要保存的内容已保存，是否继续?', '提示', {
    confirmButtonText: '取消',
    cancelButtonText: '切换',
    distinguishCancelAndClose: true,
    type: 'warning',
  }).catch(e => {
    if (e === 'cancel') {
      doSwitchVer(designData.value.code, ver.version)
    }
  })
}

function activeVer(ver) {
  ElMessageBox.confirm('您确定要将本流程激活到 [版本 v' + ver.version + ' ]，激活后新流程都将按照该版本发起，是否继续?', '提示', {
    confirmButtonText: '我再想想',
    cancelButtonText: '确定激活',
    distinguishCancelAndClose: true,
    type: 'warning',
  }).catch(e => {
    if (e === 'cancel') {
      activeModel(ver.id).then(res => {
        ElMessage.success(res.data)
        getProcModelByVer(designData.value.code, ver.version).then(res => {
          loadModelData(designData, res)
        }).catch(err => {
          ElMessage.error(err.msg)
        })
      }).catch(err => {
        ElMessage.error(err.msg)
      })
    }
  })
}

function back(){
  ElMessageBox.confirm('您确定要返回吗，返回前记得保存设计哦？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    router.push('/workspace/dashboard')
  })
}

function getVerType(ver) {
  if (ver.status === 1) {
    return 'success'
  } else if (!ver.defineId){
    return 'info'
  } else {
    return 'warning'
  }
}

/*window.onbeforeunload = function (e) {
  var message = '离开前请确认数据已经保存';
  e = e || window.event;
  if (e) {
    e.returnValue = message;
  }
  return message;
};*/

onBeforeUnmount(() => {
  window.onbeforeunload = null
})

watch(() => verParams.pageNo, getModelHisVer)

</script>

<template>
  <div class="w-designer" v-loading="loadingAll">
    <el-container>
      <el-header style="padding: 0">
        <el-menu :default-active="active" class="w-designer-menu" mode="horizontal" @select="switchMenu">
          <div>
            <el-button icon="ArrowLeft" circle @click="back"></el-button>
            <iconify :icon="designData.logo.name" class="w-process-icon"
                     :style="{'background': designData.logo.bgc, color: designData.logo.color}"/>
            <el-text>{{ designData.procName }}</el-text>
          </div>
          <el-menu-item index="BASE">{{getStepNum(0)}} {{ $t('design.nav.base') }}</el-menu-item>
          <el-menu-item index="FORM" v-if="designData.formType !== 4">{{ getStepNum(1) }} {{ $t('design.nav.form') }}</el-menu-item>
          <el-menu-item index="PROCESS">{{ getStepNum(2) }} {{ $t('design.nav.process') }}</el-menu-item>
          <el-menu-item index="PLUS">{{ getStepNum(3) }} {{ $t('design.nav.plus') }}</el-menu-item>
          <el-space size="large">
            <el-popover placement="bottom-end" :width="300" trigger="click" v-if="designData.code">
              <template #reference>
                <el-badge is-dot type="primary" :offset="[-100, 13]">
                  <el-text @click="verParams.pageNo = 1; getModelHisVer()" style="cursor: pointer" size="small">
                    当前版本: v{{ designData.version }}
                    <el-icon>
                      <ArrowDown/>
                    </el-icon>
                  </el-text>
                </el-badge>
              </template>
              <div>
                <el-scrollbar>
                  <div class="w-mode-ver" :key="md.id" v-for="md in hisModels.records">
                    <el-text truncated style="flex: 1" size="small">
                      {{ md.procName }}
                      <el-tag size="small" :type="getVerType(md)">
                        v{{ md.version }}
                      </el-tag>
                    </el-text>
                    <el-text style="padding: 0 5px" size="small" type="success" v-if="md.version === designData.version">当前版本</el-text>
                    <el-button v-else @click="switchVer(md)" link type="primary" size="small" icon="switch">
                      切换
                    </el-button>
                    <el-text v-if="md.status === 1" type="success" size="small">
                      <el-icon><CircleCheck/></el-icon> 已激活</el-text>
                    <el-text style="margin-left: 7px" size="small" v-else-if="!md.defineId" type="info">
                      <el-icon><Remove/></el-icon> 未发布</el-text>
                    <el-button v-else @click="activeVer(md)" link type="primary" size="small" icon="MagicStick">
                      激活
                    </el-button>
                  </div>
                </el-scrollbar>
                <div v-if="hisModels.pages > 1" style="display: flex; justify-content: space-between;">
                  <el-button type="primary" :disabled="verParams.pageNo <= 1" text @click="verParams.pageNo --">上一页</el-button>
                  <el-text>{{verParams.pageNo}}/{{hisModels.pages}}</el-text>
                  <el-button type="primary" :disabled="verParams.pageNo >= hisModels.pages" text @click="verParams.pageNo ++">下一页</el-button>
                </div>
              </div>
            </el-popover>
            <el-tooltip content="保存过的内容才能生效">
              <el-button type="warning" icon="MagicStick" @click="mock" text round>模拟</el-button>
            </el-tooltip>
            <el-button icon="FolderChecked" @click="doSave()" round>{{ $t('design.nav.save') }}</el-button>
            <el-button icon="Promotion" type="primary" @click="publish" round>{{ $t('design.nav.publish') }}</el-button>
          </el-space>
        </el-menu>
      </el-header>
      <el-main v-loading="loading" :class="{'w-designer-container': true, 'w-no-padding': active === 'FORM' && designData.formType !== 2}">
        <base-setting ref="base" v-model="designData" v-show="active === 'BASE'"/>
        <div v-if="!loading" v-show="active === 'FORM'" style="height: calc(100% - 30px)">
          <from-designer v-if="designData.formType === 0" :code="designData.code"
                         :version="designData.version" ref="form" v-model="designData.formJson"/>
          <form-vue-designer v-else-if="designData.formType === 1" :code="designData.code"
                             :version="designData.version" ref="form" v-model="designData.formCode"/>
          <form-ref-designer v-else-if="designData.formType === 2" v-model="designData.formRef" :code="designData.code"
                             :version="designData.version" ref="form"/>
        </div>
        <process-designer ref="process" :formItems="designData.formJson.components" v-model="designData.process"
                          :active="activePd" v-model:events="designData.events" v-show="activePd" :define-id="designData.defineId"/>
        <plus-setting ref="plus" v-model="designData" v-show="active === 'PLUS'" :process="designData.process"/>
      </el-main>
    </el-container>
    <w-dialog :border="false" v-model="validVisible" width="550" title="表单流程设计校验" :show-footer="false">
      <el-steps align-center :active="validIndex" finish-status="success">
        <template v-for="(step, i) in validRefs" :key="step._ref">
          <el-step :title="step.name"  v-if="!(noMainForm && i === 1)"
                   :icon="step.icon" :status="step.status" :description="step.description"/>
        </template>

      </el-steps>
      <el-result :icon="validIcon" :title="errTitle" :subTitle="validResult.desc">
        <template #icon>
          <el-icon size="30" class="is-loading" v-if="!validResult.finished">
            <Loading/>
          </el-icon>
        </template>
        <template #sub-title>
          <el-scrollbar v-if="validResult.errs.length > 0">
            <div class="w-valid-err-info">
              <el-text tag="div" truncated v-for="(err, i) in validResult.errs" :key="i + '_err'">
                <el-icon>
                  <Warning/>
                </el-icon>
                {{ err }}
              </el-text>
            </div>
          </el-scrollbar>
        </template>
        <template #extra v-if="validResult.finished">
          <template v-if="validResult.success">
            <el-tooltip placement="top" content="发布生成新版本，版本号递增">
              <el-button icon="Promotion" type="primary" @click="doPublish">
                去发布
              </el-button>
            </el-tooltip>
            <el-tooltip v-if="designData.defineId" placement="top" content="保持当前版本，仅更新除流程及表单之外的数据【📢谨慎操作】">
              <el-button icon="Refresh" type="info" @click="doUpdate" plain>
                仅更新
              </el-button>
            </el-tooltip>
          </template>
          <el-button icon="Pointer" type="warning" v-else @click="doFix">
            去处理
          </el-button>
        </template>
      </el-result>
    </w-dialog>
    <w-dialog close-free :border="false" fullscreen v-model="mockVisible" width="550" title="模拟发起流程" :show-footer="false">
      <initiate-process is-mock :code="designData.code" :version="designData.version"/>
    </w-dialog>
  </div>

</template>

<style lang="less" scoped>
.w-designer {
  background: var(--el-bg-color-page);

  .w-designer-menu {
    display: flex;
    align-items: center;
    background: var(--el-bg-color);
    justify-content: center;
    position: relative;

    & > div:first-child {
      position: absolute;
      left: 20px;
      display: flex;
      align-items: center;

      .w-process-icon {
        margin: 0 10px 0 20px;
      }
    }

    & > div:last-child {
      position: absolute;
      right: 20px;
    }
  }

  .w-designer-container {
    overflow: auto;
    height: calc(100vh - 60px);
  }

  .w-no-padding {
    padding: 0;
  }
}

.w-valid-err-info {
  max-height: 200px;

  & > div {
    display: block;
    text-align: left;
    padding: 2px 5px;
    border-radius: 5px;
    margin: 2px;
    background: var(--el-bg-color-page);
  }
}

.w-mode-ver {
  display: flex;
  margin: 1px;
  padding: 5px;
  border-radius: 2px;
  background-color: var(--el-fill-color-lighter);
}
</style>
