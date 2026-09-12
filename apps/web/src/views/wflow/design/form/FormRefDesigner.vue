<script setup>
import componentMixin from "./FormComponentMixin.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WTip from "../../common/WTip.vue";
import FormRefRender from "./FormRefRender.vue";

const props = defineProps({
  ...componentMixin.props,
  modelValue: {
    type: Object,
    default: () => {
      return {
        type: 'LOCAL',
        pcPath: null,
        mbPath: null,
      }
    }
  }
})
const emit = defineEmits([...componentMixin.emits])
const _value = defineModel()
const formData = ref({})
const refType = {
  LOCAL: 'LOCAL', // 本地
  URL: 'URL', // 远程
  CODE: 'CODE'
}
const FormOptions = import.meta.glob('/src/**/*.vue');
const FormComponents = {}
Object.keys(FormOptions).forEach((key) => {
  FormComponents[key] = defineAsyncComponent(FormOptions[key])
})
const pcFormRef = ref()
const {setFormFields} = useWflowStore()
const mbFormPreviewUrl = import.meta.env.VITE_MB_BASE_URL + '/formPreview'

onMounted(() => {
  if (!_value.value.type) {
    _value.value.type = refType.LOCAL
  }
})

async function getFields() {
  if (pcFormRef.value && pcFormRef.value.getFields) {
    const fields = await pcFormRef.value.getFields() || []
    setFormFields(fields)
    return fields
  }
  setFormFields([])
  return []
}

function validate() {
  return pcFormRef.value.designerValidate()
}

function changeType() {
  _value.value.pcPath = null
  _value.value.mbPath = null
}

function showDemo(isMobile = false, type) {
  if (type === 1) {
    if (_value.value.type === refType.URL) {
      if (!isMobile) _value.value.pcPath = location.origin + '/urlTestForm'
    } else if (_value.value.type === refType.LOCAL) {
      if (!isMobile) _value.value.pcPath = 'demo/form/TestForm.vue'
      else _value.value.mbPath = 'demo/form/TestForm.vue'
    }
  } else if (type === 2) {
    if (_value.value.type === refType.URL) {
      if (!isMobile) _value.value.pcPath = location.origin + '/urlTestForm'
      else _value.value.mbPath = location.origin + '/urlTestForm'
    } else if (_value.value.type === refType.LOCAL) {
      if (!isMobile) _value.value.pcPath = 'demo/form/UserForm.vue'
      else _value.value.mbPath = 'demo/form/UserForm.vue'
    }
  }
}

defineExpose({getFields, validate})

watchEffect (() => {
  if (pcFormRef.value && _value.value.pcPath) {
    setTimeout(async () => setFormFields(await pcFormRef.value.getFields() || []), 1500)
  }
})

</script>

<template>
  <div class="w-designer-panel">
    <el-form inline :model="_value">
      <el-form-item label="引用类型">
        <el-radio-group v-model="_value.type" @change="changeType">
          <el-radio value="LOCAL">
            从本地引用
            <w-tip content="从本地项目内加载写好的.vue表单组件"/>
          </el-radio>
          <el-radio value="URL">
            从URL引用
            <w-tip content="从远程URL加载表单页面"/>
          </el-radio>
<!--          <el-radio value="CODE">
            根据编号引用
            <w-tip content="根据编号挂载系统内已有的表单"/>
          </el-radio>-->
        </el-radio-group>
      </el-form-item>
      <div class="w-designer-conf">
        <el-form-item label-position="top" class="w-form-item" prop="pcPath">
          <template #label>
            <el-text style="margin-right: 20px">PC端配置</el-text>
            <el-button link type="primary" @click="showDemo(false, 1)">案例A</el-button>
            <el-button link type="primary" @click="showDemo(false, 2)">案例B</el-button>
          </template>
          <el-input v-if="_value.type === refType.LOCAL" placeholder="请设置PC端表单vue组件路径" clearable
                    v-model="_value.pcPath">
            <template #prepend>views/</template>
          </el-input>
          <el-input v-else-if="_value.type === refType.URL" placeholder="请输入表单URL地址" clearable v-model="_value.pcPath"/>
<!--          <el-select v-else-if="_value.type === refType.CODE" placeholder="请选择表单" clearable v-model="_value.pcPath"/>-->
        </el-form-item>
        <el-form-item label-position="top" class="w-form-item" prop="mbPath">
          <template #label>
            <el-text style="margin-right: 20px">移动端配置</el-text>
            <el-button link type="primary" @click="showDemo(true, 1)">案例A</el-button>
            <el-button link type="warning" @click="showDemo(true, 2)">案例B</el-button>
          </template>
          <el-input v-if="_value.type === refType.LOCAL" placeholder="请设置移动端表单vue组件路径" clearable v-model="_value.mbPath">
            <template #prepend>views/</template>
          </el-input>
          <el-input v-else-if="_value.type === refType.URL" placeholder="请输入表单URL地址" clearable v-model="_value.mbPath"/>
<!--          <el-select v-else-if="_value.type === refType.CODE" placeholder="请选择表单" clearable v-model="_value.mbPath"/>-->
        </el-form-item>
      </div>
    </el-form>
    <el-tabs :key="_value.type">
      <el-tab-pane label="PC端表单预览">
        <form-ref-render ref="pcFormRef" v-model="formData" mode="E" :config="_value"/>
      </el-tab-pane>
      <el-tab-pane label="移动端表单预览">
        <div class="w-fd-mb_preview">
          <iframe ref="mobileRef" :src="`${mbFormPreviewUrl}?ref=${_value.mbPath}`"></iframe>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>

</template>

<style scoped lang="less">
.w-designer-panel {
  margin: 0 auto;
  padding: 20px;
  border-radius: 5px;
  background-color: var(--el-bg-color);
  width: 650px;
  min-height: calc(100vh - 100px);

  .w-designer-conf {
    display: flex;
    justify-content: space-between;

    .w-form-item {
      display: flex;
      flex-direction: column;
      width: 48%;
      margin-right: 0;
    }
  }
}

.w-fd-mb_preview {
  display: flex;
  justify-content: center;
  transform: scale(0.9);
  transform-origin: top center;

  & > div {
    padding: 20px 10px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }

  iframe {
    border: 1px solid var(--el-border-color-light);
    width: 375px;
    height: 667px;
    display: block;
  }
}
</style>
