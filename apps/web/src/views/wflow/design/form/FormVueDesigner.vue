<script setup>
import ComponentDev from "../../common/dynamic/ComponentDev.vue";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {useWflowStore} from "@/stores/modules/wflow.js";

const _value = defineModel({
  default: () => {
    return {
      pc: null,
      mb: null
    }
  }
})
const pcMode = ref(true)
const formRef = ref()
const {setFormFields} = useWflowStore()

function getFields() {
  if (!formRef.value) return []
  const cpRenderRef = formRef.value.getRef()
  if (cpRenderRef && cpRenderRef.getFields) {
    const fields = cpRenderRef.getFields() || []
    setFormFields(fields)
    return fields
  }
  setFormFields([])
  return []
}

function validate() {
  const cpRenderRef = formRef.value.getRef()
  return new Promise((resolve, reject) => {
    if (!cpRenderRef){
      reject(['表单未渲染'])
    } else if(!cpRenderRef.getFields){
      reject(['表单未实现/未暴露 getFields 函数'])
    } else if(!cpRenderRef.validate){
      reject(['表单未实现/未暴露 validate 校验函数'])
    } else {
      resolve()
    }
  })
}

defineExpose({getFields, validate})

</script>

<template>
  <component-dev @render="getFields" ref="formRef" title-code="使用Vue代码在线编写表单"
                 style="height: 100%" v-model:mode="pcMode" v-model="_value[pcMode ? 'pc' : 'mb']"/>
</template>

<style scoped lang="less">

</style>
