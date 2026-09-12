<script setup>
import {getDrafts, getForecast, saveDraft, delDraft, getStartupModel, getForecastMock} from "@/api/startup.js";
import {useRoute, useRouter} from "vue-router";
import ProcessForecast from "./ProcessForecast.vue";
import ProcessRender from "../../../design/process/ProcessRender.vue";
import WDialog from "../../../common/WDialog.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import {getUserDeptList} from "@/api/org.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {getInstDetail, startProcess} from "@/api/instance.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
import WOrgPlusPicker from "../../../common/WOrgPlusPicker.vue";
import WFormRender from "../../../design/form/WFormRender.vue";

const props = defineProps({
  instId: String, //流程实例ID
  code: String, //流程编号
  version: Number, //流程版本
  isMock: Boolean, //是否是模拟
  layoutX: Boolean, //布局false=横向，true=纵向
  initiator: String //流程发起人
})

const route = useRoute();
const router = useRouter();
//发起流程所需要的参数
const startParams = reactive({
  defineId: null, //流程定义ID
  startDeptId: null, //发起人的部门ID
  initiator: null, //发起人ID
  formData: {}, //表单数据
  processData: {} //流程数据
})
//注入初始状态，表单流程内可以获取
provide('isStart', true)
const {loginUser} = useWflowStore()
const processImgVisible = ref(false)
const container = ref()
const process = ref()
const procForm = ref()
const scale = ref(100)
const startUser = ref([])
const agentSubmit = ref(false)
const processLoading = ref(true)
const formLoading = ref(true)
const draftLoading = ref(false)
const processNodes = ref([])
const submitLoading = ref(false)
//手动设置模拟发起者
const mockInitiator = ref([])
//模型数据
const modelDetail = ref({})
//发起人部门列表，发起人可能在多个部门下，需要选择一个作为发起部门
const myDepts = ref([])
const startDept = ref({})
//查询保存的草稿
const drafts = ref([])
//实时计算发起人
const _initiator = computed(() => {
  let user = null
  if (props.isMock && mockInitiator.value.length > 0) {
    startParams.initiator = mockInitiator.value[0].id
    return mockInitiator.value[0]
  }
  if (modelDetail.value.enableAgent && startUser.value.length > 0){
    user = startUser.value[0]
  } else {
    user = {
      id: loginUser.id,
      name: loginUser.name,
      avatar: loginUser.avatar,
      type: 'user'
    }
  }
  startParams.initiator = user.id
  return user
})
//注入流程发起人数据
provide('initiator', _initiator)
//注入流程发起人部门数据
provide('startDept', startDept)

const noMainForm = computed(() => {
  return modelDetail.value.formType === 4
})

//返回不同类型表单配置
const formConfig = computed(() => {
  if (modelDetail.value.formType === 2)
    return {type: 2, config: modelDetail.value.formRef}
  else if (modelDetail.value.formType === 0)
    return {type: 0, config: modelDetail.value.formJson}
  else if (modelDetail.value.formType === 1)
    return {type: 1, config: modelDetail.value.formCode}
})

onBeforeMount(() => {
  getUserDepts(getModel)
  if (props.instId || route.query.instId) {
    //判断是重新提交
    loadInstDetail()
  }
})

function loadInstDetail() {
  getInstDetail(props.instId || route.query.instId).then(res => {
    startParams.formData = res.data.formData || {}
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function getModel() {
  processLoading.value = true
  formLoading.value = true
  getStartupModel(props.code || route.query.code, props.version).then(res => {
    formLoading.value = false
    modelDetail.value = res.data
    modelDetail.value.logo = JSON.parse(res.data.logo)
    modelDetail.value.process = JSON.parse(res.data.process)
    modelDetail.value.setting = JSON.parse(res.data.setting || '{}')
    startParams.defineId = res.data.defineId
    //表单
    switch (modelDetail.value.formType) {
      case 0: //拖拽表单
        modelDetail.value.formJson = JSON.parse(res.data.formJson)
        break
      case 1: //代码表单
        try {
          modelDetail.value.formCode = JSON.parse(res.data.formCode || '{}')
        } catch (e) {
          modelDetail.value.formCode = {}
        }
        break
      case 2: //引用表单
        modelDetail.value.formRef = JSON.parse(res.data.formRef)
        break
    }
    //加载流程预测数据
    getForecastData()
  }).catch(err => {
    formLoading.value = false
    ElMessage.error(err.msg || err)
  })
}

function getForecastData() {
  processLoading.value = true;
  (!props.isMock ? getForecast(startParams) :
      getForecastMock(startParams, props.code, props.version)).then(res => {
        processLoading.value = false
        processNodes.value = res.data
      }).catch(err => {
    processLoading.value = false
    ElMessage.error(err.msg || err)
  })
}

function getUserDepts(call) {
  getUserDeptList(_initiator.value.id).then(res => {
    myDepts.value = res.data
    if (myDepts.value.length === 0) {
      ElMessageBox.alert("当前用户未设置所在部门，请检查", "提示", {
        confirmButtonText: "确定",
        type: "warning",
      })
    } else {
      startDept.value = myDepts.value[0]
      startParams.startDeptId = myDepts.value[0].id
    }
    if (call instanceof Function) call()
  })
}

function getProcDrafts() {
  draftLoading.value = true
  getDrafts({code: modelDetail.value.code}).then(res => {
    draftLoading.value = false
    drafts.value = res.data.records
  }).catch(err => {
    draftLoading.value = false
    ElMessage.error(err.msg || err)
  })
}

function saveProcDraft() {
  saveDraft({
    code: modelDetail.value.code,
    defineId: modelDetail.value.defineId,
    version: modelDetail.value.version,
    formData: JSON.stringify(startParams.formData || {}),
    processData: JSON.stringify(startParams.processData || {})
  }).then(res => {
    ElMessage.success(res.data)
  }).catch(err => {
    ElMessage.error(err.msg || err)
  })
}

function delProcDraft(draft) {
  delDraft(draft.id).then(res => {
    ElMessage.success(res.data)
    getProcDrafts()
  }).catch(err => {
    ElMessage.error(err.msg || err)
  })
}

function userDraft(draft) {
  startParams.formData = JSON.parse(draft.formData || '{}')
  startParams.processData = JSON.parse(draft.processData || '{}')
  setTimeout(() => procForm.value.validate(), 500)
}

function getScale() {
  nextTick(() => {
    const containerRatio = container.value.clientWidth / container.value.clientHeight;
    const contentRatio = process.value.clientWidth / process.value.clientHeight;
    if (containerRatio > contentRatio) {
      scale.value = container.value.clientHeight / process.value.clientHeight;
    } else {
      scale.value = container.value.clientWidth / process.value.clientWidth;
    }
  })
}

function goBack() {
  router.push('/workspace/submitted')
}

function submitAndStartInst() {
  if (procForm.value?.validate) {
    procForm.value.validate().then(res => {
      doSubmit()
    }).catch(err => {
      ElMessage.error(isEmpty(err) ? '表单校验失败，请检查' : err)
    })
  } else {
    doSubmit()
  }
}

function doSubmit() {
  if (props.isMock) {
    ElMessage.success('表单校验通过')
    return
  }
  submitLoading.value = true
  startProcess(startParams).then(res => {
    ElMessage.success('发起流程成功')
    submitLoading.value = false
    goBack()
  }).catch(err => {
    submitLoading.value = false
    ElMessage.error(err.msg || err)
  })
}

watch(_initiator, getUserDepts)

</script>

<template>
  <div class="w-initiate-proc">
    <div>
      <el-button icon="ArrowLeft" @click="goBack" text>返回</el-button>
      <div class="w-flex-col-ct" style="margin-left: 20px">
        <el-text size="large">
          {{ modelDetail.procName }}
          <el-tag size="small">v{{ modelDetail.version }}</el-tag>
        </el-text>
        <el-text size="small" v-if="(modelDetail.remark || '').trim().length > 0">
          - {{ modelDetail.remark }}
        </el-text>
        <template v-if="isMock">
          <el-divider direction="vertical"/>
          <div class="w-flex-col-ct">
            <span style="margin-right: 10px">模拟发起者:</span>
            <w-org-plus-picker v-model="mockInitiator" type="user" :excludes="[loginUser]"
                               :selected="startUser" placeholder="选择模拟谁发起，默认本人"/>
          </div>
        </template>
      </div>
      <el-popover width="300" placement="bottom-end" trigger="click">
        <div v-loading="draftLoading">
          <el-scrollbar v-if="drafts.length > 0" style="max-height: 250px">
            <div v-for="draft in drafts" class="w-draft">
              <el-text size="small">{{ draft.createTime }}</el-text>
              <div style="flex: 1; margin-left: 5px">
                <el-tag size="small" type="primary">v{{ draft.version }}</el-tag>
              </div>
              <div>
                <el-button type="danger" size="small" link @click="delProcDraft(draft)">删除</el-button>
                <el-divider direction="vertical"/>
                <el-button type="primary" size="small" link @click="userDraft(draft)">使用</el-button>
              </div>
            </div>
          </el-scrollbar>
          <el-empty v-else :image-size="100" description="本流程没有暂存的草稿😉"></el-empty>
        </div>
        <template #reference>
          <el-button link type="warning" icon="Files" @click="getProcDrafts" :disabled="isMock">草稿箱</el-button>
        </template>
      </el-popover>
    </div>
    <el-row :gutter="20">
      <el-col v-loading="formLoading" :span="15" :lg="15" :md="24" :sm="24" :xs="24">
        <el-form :label-width="modelDetail.formJson?.conf?.labelWidth"
                 :size="modelDetail.formJson?.conf?.size" style="overflow-x: hidden"
                 :label-position="modelDetail.formJson?.conf?.labelPosition">
          <template v-if="modelDetail.enableAgent">
            <el-form-item label="可选配置">
              <el-checkbox v-model="agentSubmit">代他人提交流程</el-checkbox>
              <template v-if="agentSubmit">
                <el-divider direction="vertical"/>
                <w-org-plus-picker v-model="startUser" type="user" :excludes="[loginUser]"
                                   :selected="startUser" placeholder="您可以选择代谁提交流程"/>
              </template>
            </el-form-item>
          </template>
          <el-form-item label="发起人部门" v-if="myDepts.length > 1">
            <el-radio-group v-model="startParams.startDeptId">
              <el-radio :label="dept.name" :value="dept.id" v-for="dept in myDepts"
                        :key="dept.id" @click="startDept = dept"/>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template v-if="!noMainForm">
          <!--这里渲染表单-->
          <w-form-render v-model="startParams.formData" :form-type="modelDetail.formType"
                         :perm-conf="modelDetail.fieldPermMap" :config="formConfig?.config"
                         ref="procForm" mode="E"/>
        </template>
        <el-empty v-else description="本流程未启用主表单😅"/>
        <el-space size="large" style="margin-top: 20px">
          <el-button icon="close" @click="goBack" :disabled="isMock">取 消</el-button>
          <el-button icon="FolderChecked" @click="saveProcDraft" type="primary" plain :disabled="isMock">暂 存</el-button>
          <el-button icon="Finished" :loading="submitLoading" type="primary" @click="submitAndStartInst">
            {{isMock ? '模 拟':''}} 提 交
          </el-button>
        </el-space>
      </el-col>
      <el-col :span="9" :lg="9" :md="24" :sm="24" :xs="24" v-loading="processLoading">
        <div style="margin-bottom: 10px">
          <el-text style="margin-right: 20px">流程执行预测</el-text>
          <el-button icon="refresh" type="primary" link @click="getForecastData()">刷新预测</el-button>
          <el-button icon="view" type="primary" link @click="processImgVisible = true;">查看流程图</el-button>
        </div>
        <!--这里渲染流程预测-->
        <process-forecast v-if="!processLoading" v-model="startParams.processData" :form-data="startParams.formData"
                          :process="processNodes"/>
        <el-text v-else type="warning">正在预测流程执行步骤...</el-text>
      </el-col>
    </el-row>
    <w-dialog fullscreen width="100%" :title="`${modelDetail.procName}的流程图`"
              v-model="processImgVisible" :show-footer="false">
      <el-scrollbar ref="container" class="w-process-view">
        <el-space class="w-p-d-operation-zoom">
          <el-button icon="Minus" @click="scale -= 5" circle/>
          <span>{{ scale }}%</span>
          <el-button icon="Plus" @click="scale += 5" circle/>
        </el-space>
        <div :style="`transform: scale(${scale / 100})`">
          <process-render style="position: absolute" ref="process" :model-value="modelDetail.process" readonly/>
        </div>
      </el-scrollbar>
    </w-dialog>
  </div>

</template>

<style scoped lang="less">
.w-initiate-proc {
  border-radius: 5px;
  overflow: hidden;
  background: var(--el-bg-color);

  & > :first-child {
    padding: 10px 5px;
    background: var(--el-fill-color-light);
    display: flex;
    align-items: center;
    //霸占空位置
    & > :nth-child(2) {
      flex: 1;
    }

    //草稿箱按钮
    & > :last-child {
      margin-right: 20px;
    }
  }

  & > :nth-child(2) {
    padding: 10px;

  }

  & > :last-child {
    padding: 10px;
  }
}

.w-draft {
  display: flex;
  padding: 5px;
  background: var(--el-fill-color-light);
  border-radius: 5px;
  margin: 5px 0;
}

.w-process-view {
  position: relative;
  height: calc(100vh - 94px);
  background: var(--el-bg-color-page);

  .w-p-d-operation-zoom {
    z-index: 99;
    position: absolute;
    top: 20px;
    right: 20px;
  }
}
</style>
