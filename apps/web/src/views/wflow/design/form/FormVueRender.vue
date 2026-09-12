<script setup>

const ComponentRender = defineAsyncComponent(() => import("../../common/dynamic/ComponentRender.vue"));
import componentMixin from "../../design/form/FormComponentMixin.js";

const render = ref()
const props = defineProps({
  ...componentMixin.props,
  modelValue: {
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
  },
  config: String
})
const emit = defineEmits([...componentMixin.emits])
const _value = defineModel()

const getFields = () => render.value.getFields()
const validate = () => render.value.validate()

function getPermConf() {
  return props.permConf
}

defineExpose({getFields, validate, getPermConf})
</script>

<template>
  <component-render :cp-ref="(refs) => render = refs" :mode="mode" style="padding: 10px"
                    v-model="_value" :sfc="config" :perm-conf="permConf"/>
</template>

<style scoped lang="less">

</style>
