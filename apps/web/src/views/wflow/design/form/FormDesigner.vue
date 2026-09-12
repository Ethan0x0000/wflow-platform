<script setup>
import {VueDraggable} from 'vue-draggable-plus'
import {BaseComponents, KitComponents, FormComponentConfigs} from "./FormComponents.js";
import {storeToRefs} from 'pinia'
import componentMixin from "./FormComponentMixin.js";
import {ElMessage, ElMessageBox} from "element-plus";
import WDialog from "../../common/WDialog.vue";
import FormRender from "./FormRender.vue";
import FormComponent from "./base/component/FormComponent.vue";
import {
  generateStr,
  deepCopy,
  $debounce,
  copyValue,
  loadDsVars,
  isRequired
} from "@/utils/GlobalFunc.js";
import {getFormCps} from "@/api/form.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {exportText, resolveFormJson} from "@/utils/ProcessUtil.js";
import FormConfig from "./base/conf/FormConfig.vue";
import FormComponentShop from "./shop/FormComponentShop.vue";
import DatasourceConfig from "./base/conf/DatasourceConfig.vue";
import WBrightBlock from "@/views/wflow/common/WBrightBlock.vue";
import ValueType from "@/views/wflow/design/form/ValueType.js";

const mbFormPreviewUrl = import.meta.env.VITE_MB_BASE_URL + '/formPreview'
//保存编辑历史
const history = []
const customCps = ref([])
const pcMode = ref(true)
const showTip = ref(true)
const active = ref({})
const fileInput = ref()
const customCpLoading = ref(false)
const previewVisible = ref(false)
const createCpVisible = ref(false)
const cpShopVisible = ref(false)
const formModeViewer = ref('pc')

const wflowStore = useWflowStore()
const {formFields} = storeToRefs(wflowStore)
const {setFormFields, setDsVars} = wflowStore

const formMode = ref('E')
const formData = ref({})
const formRenderRef = ref()
const mobileRef = ref()

const viewModeOptions = [
  {label: '电脑', value: 'pc', icon: 'Monitor'},
  {label: '手机', value: 'mb', icon: 'Cellphone'}
]

//系统内置全局变量
const sysVars = [
  {
    label: '流程未发起',
    value: 'isStart',
    type: 'DS',
    valueType: ValueType.bool
  },
  {
    label: '发起人ID',
    value: 'startUserId',
    type: 'DS',
    valueType: ValueType.string
  },
  {
    label: '发起人姓名',
    value: 'startUsername',
    type: 'DS',
    valueType: ValueType.string
  },
  {
    label: '发起人',
    value: 'startUser',
    type: 'DS',
    valueType: ValueType.org
  },
  {
    label: '发起人部门ID',
    value: 'startDeptId',
    type: 'DS',
    valueType: ValueType.string
  },
  {
    label: '发起人部门名',
    value: 'startDeptName',
    type: 'DS',
    valueType: ValueType.string
  },
  {
    label: '发起人部门',
    value: 'startDept',
    type: 'DS',
    valueType: ValueType.orgArray
  }
]

watch(formMode, reloadMbPerm)

defineExpose({validate, getFields})
const props = defineProps({
  ...componentMixin.props,
  code: String,
  version: Number
})
const emit = defineEmits([...componentMixin.emits])
const _value = defineModel({
  type: Object,
  default: () => {
    return {}
  }
})
const _showTip = computed(() => {
  return showTip.value && _value.value.components.length === 0
})
//数据源缓存
const dsVars = ref({})
//提取所有数据源变量
const dsOptions = computed(() => {
  const list = _value.value.datasource.map(ds => {
    return {
      label: ds.name,
      value: ds.id,
      children: ds.handler.map(h => {
        return {
          label: h.label,
          value: h.value,
          type: 'DS',
          valueType: h.valueType
        }
      })
    }
  })
  list.push({
    label: '内置变量（模拟可用）',
    value: 'sysVars',
    children: sysVars
  })
  return list
})

provide('dsOptions', dsOptions)
provide('dsVars', dsVars)
const libOptions = [
  {label: '组件库', value: 0},
  {label: '套件', value: 1},
  {label: '扩展库', value: 2},
]

const configOptions = [
  {label: '组件设置', value: 0},
  {label: '表单设置', value: 1},
  {label: '数据源', value: 2}
]
const keyMap = new Map()
const activeLib = ref(libOptions[0].value)
const activeConfig = ref(configOptions[0].value)
const tempFormConf = ref({})
const _loadFields = $debounce(loadFields, 2000)

//初始化设置表单数据
onMounted(() => {
  _loadFields()
  geCustomCpList()
  dsChange()
})

watch(() => _value.value.components, () => {
  _loadFields()
}, {deep: true})

async function loadFields() {
  await setFormFields(resolveFormJson(_value.value.components))
}

function dsChange() {
  dsVars.value = {}
  loadDsVars(_value.value.datasource, formData.value, dsVars, () => {
    //加载完成后把它塞pina
    setDsVars(dsVars.value)
  })
}

function reloadMbPerm() {
  if (mobileRef.value && mobileRef.value.contentWindow) {
    mobileRef.value.contentWindow.postMessage({perm: formMode.value}, '*')
  }
}

function onClone(el) {
  const clone = JSON.parse(JSON.stringify(el))
  clone.key = clone.type + '_' + generateStr(8)
  clone.id = 'wflow_' + generateStr(8)
  return clone
}

function customCpClone(el) {
  const key = el.type + '_' + generateStr(5)
  return {
    id: 'wflow_' + key,
    name: el.name,
    icon: el.icon,
    key: key,
    valueType: el.valueType,
    type: 'CustomComponent',
    props: {
      cpId: null,
      cpType: el.type
    }
  }
}

function addHis(v) {
  history.push(v)
  if (history.length >= 50) {
    history.splice(0, 1)
  }
}

function onChoose(ev) {

}

function _onChoose(cp) {
  active.value = cp
}

function geCustomCpList() {
  customCpLoading.value = true
  getFormCps({active: true}).then(res => {
    customCpLoading.value = false
    customCps.value = res.data.records
    customCps.value.forEach(cp => cp.id = null)
  }).catch(err => {
    customCpLoading.value = false
    ElMessage.error(err.msg)
  })
}

function clearForm() {
  ElMessageBox.confirm('您确定要清空表单设计区吗?', '提醒', {
    confirmButtonText: '我再想想',
    cancelButtonText: '确认清空',
    distinguishCancelAndClose: true,
    type: 'warning',
  }).catch(e => {
    if (e === 'cancel') {
      addHis(deepCopy(_value.value.components))
      _value.value.components.length = 0
      _value.value.datasource.length = 0
      _value.value.conf = {
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
      }
    }
  })
}

function previewForm() {
  formData.value = {}
  tempFormConf.value = deepCopy(_value.value)
  previewVisible.value = true
}

function testFormValid() {
  formRenderRef.value.validate().then(() => {
    ElMessage.success('表单校验通过')
  }).catch(err => {
    ElMessage.error(err || '请完善表单')
  })
}

function validate() {
  return new Promise((resolve, reject) => {
    if (_value.value.components.length > 0) {
      //检查key值设置
      const errs = []
      keyMap.clear()
      formFields.value.forEach(v => {
        if (keyMap.has(v.key)) {
          errs.push(`表单字段 ${v.name} 与 ${keyMap.get(v.key).name} 的key值[${v.key}]重复`)
        } else {
          keyMap.set(v.key, v)
        }
      })
      if (errs.length > 0){
        reject(errs)
      }else {
        resolve()
      }
    } else {
      reject(['表单组件为空'])
    }
  })
}

function createComponent() {
  createCpVisible.value = true
}

function getFields() {
  loadFields()
  return formFields.value
}

function copyForm() {
  if (_value.value.components.length === 0) {
    ElMessage.warning("请先添加组件")
    return
  }
  copyValue(JSON.stringify(_value.value), () => {
    ElMessage.success("复制成功，您可以去到其他流程内粘贴了")
  })
}

async function pasteForm() {
  if (!navigator.clipboard) {
    ElMessageBox.alert("粘贴板权限被禁用或不在https环境则无法使用本功能😥", {
      type: 'warning',
      title: '粘贴失败'
    })
    return
  }
  navigator.clipboard.readText().then(function(text) {
    try {
      const json = JSON.parse(text)
      if (json && json.components && json.conf) {
        ElMessageBox.confirm('粘贴将会覆盖当前表单配置项，是否确认进行粘贴替换？', '提醒', {
          confirmButtonText: '我再想想',
          cancelButtonText: '确认粘贴',
          distinguishCancelAndClose: true,
          type: 'warning',
        }).catch(e => {
          if (e === 'cancel') {
            _value.value = json
          }
        })
      } else {
        ElMessage.warning('复制的内容无法识别')
      }
    } catch (e) {
      ElMessage.warning('请先复制正确格式的表单')
    }
  });
}

function importForm() {
  fileInput.value.click()
}

function configOnload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      fileInput.value.value = null
      const jsonData = JSON.parse(e.target.result);
      _value.value = {...jsonData}
      ElMessage.success("导入表单设计成功")
    } catch (error) {
      ElMessage.warning("解析表单json文件失败")
    }
  };
  reader.readAsText(file);
}

function exportForm() {
  exportText(JSON.stringify(_value.value), 'wflow-form.json')
}
</script>

<template>
  <el-container class="w-form-designer">
    <el-aside width="300px" class="w-form-d-lib">
      <div class="w-cp-lib">
        <el-segmented v-model="activeLib" :options="libOptions" block>
          <template #default="{ item }">
            <div>{{ item.label }}</div>
          </template>
        </el-segmented>
        <el-scrollbar>
          <div class="w-scroll-h">
            <template v-if="activeLib === 0">
              <div v-for="(group, gi) in BaseComponents" :key="gi" class="w-cp-group">
                <div>{{ group.name }}</div>
                <vue-draggable v-model="group.components"
                               :group="{ name: 'FormDesign', pull: 'clone', put: false }"
                               :sort="false" :clone="onClone" class="w-cp-items">
                  <div v-for="(formCp, ci) in group.components" :key="formCp.type" class="w-cp-item">
                    <iconify :icon="formCp.icon"/>
                    <span>{{ formCp.name }}</span>
                  </div>
                </vue-draggable>
              </div>
            </template>
            <template v-else-if="activeLib === 1">
              <div v-for="(group, gi) in KitComponents" :key="gi" class="w-cp-group">
                <div>{{ group.name }}</div>
                <vue-draggable v-model="group.components"
                               :group="{ name: 'FormDesign', pull: 'clone', put: false }"
                               :sort="false" :clone="onClone" class="w-cp-items">
                  <div v-for="(formCp, ci) in group.components" :key="formCp.type" class="w-cp-item">
                    <iconify :icon="formCp.icon"/>
                    <span>{{ formCp.name }}</span>
                  </div>
                </vue-draggable>
              </div>
              <el-empty v-if="KitComponents.length === 0" description="暂无可用套件"></el-empty>
            </template>
            <template v-else-if="activeLib === 2">
              <div class="w-cp-shop">
                <span>没有想要的组件？去</span>
                <el-text type="primary" icon="Handbag" @click="cpShopVisible = true">
                  <el-icon><Handbag /></el-icon>
                  组件商店
                </el-text>
                <span>看看吧</span>
              </div>
              <template v-if="customCps.length > 0">
                <vue-draggable v-model="customCps"
                               :group="{ name: 'FormDesign', pull: 'clone', put: false }"
                               :sort="false" :clone="customCpClone" class="w-cp-custom w-cp-items">
                  <div v-for="(formCp, ci) in customCps" :key="formCp.type" class="w-cp-item">
                    <iconify :icon="formCp.icon"/>
                    <span>{{ formCp.name }}</span>
                  </div>
                </vue-draggable>
              </template>
              <el-empty v-else description="无自定义组件">
                <el-button icon="Plus" @click="createComponent">去创建组件</el-button>
              </el-empty>
            </template>
          </div>
        </el-scrollbar>
      </div>
    </el-aside>
    <el-container style="display:flex; flex-direction: column">
      <input style="display: none" @change="configOnload" type="file" ref="fileInput" accept=".json">
      <div class="w-form-d-toolbar">
<!--        <div>
          <el-tooltip effect="dark" content="撤销" placement="top">
            <iconify icon="ooui:undo-ltr"/>
          </el-tooltip>
          <el-tooltip effect="dark" content="重做" placement="top">
            <iconify icon="ooui:undo-rtl"/>
          </el-tooltip>
        </div>-->
        <div class="w-form-d-t_mode">
          <el-tooltip effect="dark" content="电脑端" placement="top">
            <iconify icon="mi:computer" :class="{'w-f-d-t-active': pcMode}"/>
          </el-tooltip>
        </div>
        <div>
          <el-tooltip effect="dark" content="清空设计及规则" placement="top">
            <el-text class="w-option" size="small" type="danger" @click="clearForm">
              <iconify icon="fluent:delete-12-regular"/>
              清除
            </el-text>
          </el-tooltip>
          <el-tooltip effect="dark" content="预览表单" placement="top">
            <el-text class="w-option" size="small" type="primary" @click="previewForm">
              <iconify icon="solar:eye-scan-bold"/>
              预览
            </el-text>
          </el-tooltip>
          <el-divider direction="vertical"/>
          <el-dropdown size="small">
            <el-text class="w-option" size="small" type="primary">
              更多 <el-icon><ArrowDown/></el-icon>
            </el-text>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="copyForm">
                  <iconify icon="mdi:content-copy"/>
                  <span>&nbsp 复制表单</span>
                </el-dropdown-item>
                <el-dropdown-item @click="pasteForm">
                  <iconify icon="mdi:content-paste"/>
                  <span>&nbsp 粘贴表单</span>
                </el-dropdown-item>
                <el-dropdown-item @click="importForm" divided>
                  <iconify icon="mdi:database-import-outline"/>
                  <span>&nbsp 导入配置</span>
                </el-dropdown-item>
                <el-dropdown-item @click="exportForm">
                  <iconify icon="mdi:database-export-outline"/>
                  <span>&nbsp 导出配置</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <el-scrollbar>
        <div class="w-scroll-h" style="min-width: 500px;">
          <el-form :label-width="_value.conf.labelWidth" :label-position="_value.conf.labelPosition"
                   :size="_value.conf.size" class="w-form-d-ctx" @submit.prevent="() => {}">
            <vue-draggable v-model="_value.components" :animation="150" ghostClass="w-f-cp-select"
                           @choose="onChoose" @add="showTip = false" @remove="showTip = true" handle=".w-cp-move"
                           group="FormDesign" class="w-form-d-ctx-ep" :swapThreshold="0.2">
              <template v-for="(cp, i) in _value.components" :key="cp.id">
                <el-form-item :label="cp.name" v-if="!cp.props.isContainer" @click="_onChoose(cp)"
                              :required="isRequired(cp.props.required, 'D')"
                              :class="{'w-form-d-item': true, 'w-form-cp-active': active?.id === cp.id,
                              'w-form-cp-nlb':cp.props.hideLabel, 'w-form-item-ep': cp.props.allowPut}">
                  <form-component :index="i" :parents="_value.components" mode="D" :type="cp.type" :config="cp"
                                  v-model:active="active"/>
                </el-form-item>
                <form-component v-else :type="cp.type" class="w-form-d-item" :index="i" :parents="_value.components"
                                :config="cp" v-model:active="active" @click="_onChoose(cp)" mode="D"
                                :class="{'w-form-d-item': true, 'w-form-cp-ct': true, 'w-form-cp-active': active?.id === cp.id}"/>
              </template>
            </vue-draggable>
            <div class="w-form-d-tip" v-if="_showTip">
              <el-text>💕 请从左侧组件库拖拽表单组件到此处</el-text>
            </div>
          </el-form>
        </div>
      </el-scrollbar>
    </el-container>
    <el-aside width="300px" class="w-form-d-conf">
      <el-scrollbar>
        <div class="w-scroll-h">
          <el-form label-width="80" class="w-cp-lib">
            <el-segmented v-model="activeConfig" :options="configOptions" block>
              <template #default="{ item }">
                <div>{{ item.label }}</div>
              </template>
            </el-segmented>
            <div style="padding: 10px">
              <template v-if="activeConfig === 0">
                <component v-if="active.type && FormComponentConfigs[active.type]" v-model="active" :is="FormComponentConfigs[active.type]" :config="active"/>
                <el-empty description="请拖拽组件到中间设计区😘" v-else-if="_value.components.length === 0"/>
                <el-empty description="请选中一个有效组件🤔" v-else-if="!active.type"/>
                <el-empty description="该组件配置面板缺失😥" v-else/>
              </template>
              <template v-else-if="activeConfig === 1">
                <form-config v-model:config="_value.conf"/>
              </template>
              <template v-else-if="activeConfig === 2">
                <datasource-config v-model="_value.datasource" @change="dsChange"/>
              </template>
            </div>
          </el-form>
        </div>
      </el-scrollbar>
    </el-aside>
    <w-dialog v-model="previewVisible" width="800px" title="表单预览" closeFree
              :border="false" :show-footer="formModeViewer === 'pc'"
              ok-text="表单校验" @ok="testFormValid" cancel-text="关闭">
      <template #title>
        <span style="margin-right: 20px">表单预览</span>
        <el-segmented v-model="formModeViewer" :options="viewModeOptions" @change="reloadMbPerm">
          <template #default="scope">
            <div class="w-flex-col-ct">
              <el-icon style="margin-right: 5px">
                <component :is="scope.item.icon" />
              </el-icon>
              {{scope.item.label}}
            </div>
          </template>
        </el-segmented>
        <el-divider direction="vertical"/>
        <el-radio-group v-model="formMode">
          <el-radio label="编辑模式" value="E"/>
          <el-radio label="只读模式" value="R"/>
          <el-radio label="阅读模式" value="V"/>
        </el-radio-group>
      </template>
      <form-render :key="formMode" v-if="formModeViewer === 'pc'" :mode="formMode" ref="formRenderRef" :config="tempFormConf" v-model="formData"/>
      <div class="w-fd-mb_preview" v-else>
        <iframe ref="mobileRef" :src="`${mbFormPreviewUrl}?code=${code}&ver=${version}&perm=${formMode}`"></iframe>
      </div>
    </w-dialog>
    <w-dialog v-model="cpShopVisible" width="850px" title="WFLOW 表单组件商店" closeFree :border="false" :show-footer="false">
      <w-bright-block content="📢 未来规划的功能，此处仅作展示预告，暂不可用" type="warning"/>
      <form-component-shop/>
    </w-dialog>
  </el-container>
</template>

<style lang="less" scoped>
@tool-nav-height: 38px;

.w-scroll-h {
  max-height: calc(100vh - 100px);
}

.w-cp-shop {
  padding: 10px 0 0;
  display: flex;
  align-items: center;
  font-size: 14px;
  justify-content: center;

  .el-text {
    cursor: pointer;
    margin: 0 2px;
  }
}

.w-fd-mb_preview {
  display: flex;
  justify-content: center;

  iframe {
    border: none;
    width: 375px;
    height: 667px;
    display: block;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }
}

.w-form-designer {
  min-width: 1000px;
  font-size: var(--el-font-size-base);
  color: var(--el-text-color);
  height: calc(100% + 27px);
}

.w-form-d-lib {
  border-right: 1px solid var(--el-border-color);
}

:deep(.w-form-d-conf) {
  border-left: 1px solid var(--el-border-color);
}

.w-cp-custom {
  padding: 10px 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.w-cp-lib, .w-cp-conf {
  font-size: small;

  .el-segmented {
    border-radius: 0;
  }

  & > div:first-child {
    height: @tool-nav-height - 2px;
    line-height: @tool-nav-height - 2px;
    text-align: center;
    background: var(--el-bg-color);
  }

  & > div:last-child {
    padding: 0 15px;
  }
}

.w-cp-group {
  & > div:first-child {
    padding: 15px 0;
  }

  .w-cp-items {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }
}

.w-cp-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--el-bg-color);
  width: 110px;
  border: 1px solid var(--el-border-color);
  margin-bottom: 5px;
  color: var(--el-text-color-primary);

  & > span {
    margin-left: 5px;
  }

  &:hover {
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    cursor: grab;
  }
}

.w-form-d-toolbar {
  display: flex;
  height: @tool-nav-height;
  align-items: center;
  background: var(--el-bg-color);
  position: relative;
  padding: 0 20px;

  .w-f-d-t-active {
    color: #656363;
  }

  .w-form-d-t_mode {
    flex: 1;

  }

  & > div:last-child {
    display: flex;
    align-items: center;
  }

  .w-option {
    cursor: pointer;
    margin: 0 5px;
  }
}

.w-form-d-ctx {
  margin: 10px;
  padding: 5px;
  position: relative;
  background-color: var(--el-bg-color);
  border-radius: 5px;
  min-height: calc(100vh - 125px);

  .w-form-d-tip {
    padding: 20px;
    position: relative;
    display: flex;
    justify-content: center;

    & > * {
      position: absolute;
      top: -25vh;
    }
  }

  :deep(.w-form-d-ctx-ep) {
    min-height: calc(100vh - 125px);
  }
}

.w-f-cp-select {
  border-radius: 2px;
  border: 1px dashed var(--el-color-primary) !important;
}
</style>
