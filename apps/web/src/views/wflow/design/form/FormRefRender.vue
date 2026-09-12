<script setup>
import componentMixin from "./FormComponentMixin.js";
import {createWflowFormTrans} from "@/utils/IframeFormTrans.js"

const props = defineProps({
  ...componentMixin.props,
  modelValue: {
    type: Object,
    default: () => {
      return {}
    }
  },
  config: { //表单配置
    type: Object,
    default: () => {
      return {}
    }
  },
  permConf: { //字段权限配置
    type: Object,
    default: () => {
      return {}
    }
  }
})

const refType = {
  LOCAL: 'LOCAL', // 本地
  URL: 'URL', // 远程
  CODE: 'CODE'
}

const formRef = ref()
const emit = defineEmits([...componentMixin.emits, 'load'])
const _value = defineModel()
const formLoading = ref(true)
let formRrans

const FormOptions = import.meta.glob('/src/**/*.vue');
const FormComponents = {}

Object.keys(FormOptions).forEach((key) => {
  FormComponents[key] = defineAsyncComponent(FormOptions[key])
})

const pcForm = computed(() => FormComponents[`/src/views/${props.config.pcPath}`])

onMounted(() => {
  if (!props.config.type) {
    props.config.type = refType.LOCAL
  } else if (props.config.type === refType.URL) {
    // 初始化双向交互
    loadUrlForm()
  }
})

function loadUrlForm() {
  const onLoad = () => {
    formLoading.value = false
    //给一个时间，加载表单数据和权限控制
    setTimeout(() => {
      formRrans.setFormData(toRaw(_value.value))
      formRrans.setFormPerm(toRaw(props.mode))
      formRrans.setFormPerm(toRaw(getPermConf()))
    }, 500)
  }
  formRef.value.addEventListener('load', onLoad);
  // 创建通信实例
  formRrans = createWflowFormTrans({
    isParent: true,
    el: () => formRef.value,
    //可以自定义允许的域
    // targetOrigin: "*",
    // allowedOrigins: ["*"],
    onReportFormData: (formData) => {
      _value.value = formData
    }
  }).iframeTrans;
  onBeforeUnmount(() => {
    formRef.value.removeEventListener('load', onLoad);
    formRrans?.stop?.()
  })
}

function designerValidate() {
  return new Promise((resolve, reject) => {
    if (props.config.type === refType.LOCAL && !pcForm) {
      reject('找不到配置的表单组件')
    } else if(!(formRef.value.getFields || formRrans.getFields)){
      reject('表单未实现/未暴露 getFields 获取字段函数')
    } else if(!(formRef.value.validate || formRrans.validate)){
      reject('表单未实现/未暴露 validate 校验函数')
    } else {
      resolve()
    }
  })
}

function validate() {
  return new Promise((resolve, reject) => {
    designerValidate().then(() => {
      if (formRrans) {
        formRrans?.validate?.().then(({result, msg}) => {
          if (result) resolve()
          else reject(msg)
        })
      } else {
        formRef.value?.validate?.().then(() => resolve())
            .catch(() => reject('请完善表单数据'))
      }
    }).catch(err => reject(err))
  })
}

function getPermConf() {
  return props.permConf
}

async function getFields() {
  if (props.config.type === refType.URL) {
    return await formRrans.getFields()
  }
  return formRef.value?.getFields?.()
}

defineExpose({validate, designerValidate, getPermConf, getFields})
</script>

<template>
  <iframe v-if="config.type === refType.URL" ref="formRef" :src="config.pcPath"/>
  <template v-else>
    <component v-if="pcForm" :mode="mode" :perm-conf="permConf" ref="formRef" v-model="_value" :is="pcForm"/>
    <el-alert type="warning" :closable="false" v-else :title="`😥无法渲染表单，请检查配置 ${config}`"></el-alert>
  </template>
</template>

<style scoped lang="less">
iframe {
  border: none;
  width: 100%;
  min-height: 400px;
  max-height: 90vh;
  display: block;
}
</style>
