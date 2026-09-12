<template>
  <!-- 引用模式 -->
  <form-ref-render v-if="formType === 2" :mode="mode" :perm-conf="permConf"
                   ref="form" v-model="_value" :config="config"/>
  <!-- 拖拽模式 -->
  <form-render v-else-if="formType === 0" ref="form" :mode="mode"
               v-model="_value" :config="config" :perm-conf="permConf"/>
  <!-- 代码模式 -->
  <form-vue-render v-else-if="formType === 1" :mode="mode" ref="form"
                   v-model="_value" :config="config.pc" :perm-conf="permConf"/>
</template>

<script setup>

import FormRender from "./FormRender.vue";
import FormRefRender from "./FormRefRender.vue";
import FormVueRender from "./FormVueRender.vue";

const props = defineProps({
  mode: {
    type: String,
    default: 'E'
  },
  formType: Number,
  config: {
    type: [Object, String],
    default: () => {
      return {}
    }
  },
  permConf: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const form = ref();
const _value = defineModel();

const validate = () => {
  if (props.formType === 4) return new Promise((resolve) => {resolve()})
  else return form.value?.validate();
}

const getFields = () => {
  if (props.formType === 4) return []
  else return form?.value?.getFields()
}

const getPermConf = () => {
  if (props.formType === 4) return {}
  else return form.value?.getPermConf()
}

defineExpose({validate, getFields, getPermConf})
</script>

<style scoped lang="less">

</style>
