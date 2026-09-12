<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {validNodeName} from "@/utils/ProcessUtil.js";

const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const showErr = ref(false)
const errInfo = ref(null)

const content = computed(() => {
  const prop = _value.value.props
  return isEmpty(prop.name) ? '请选择子流程'
      : `🚀发起流程: ${prop.name}${prop.isBindVer ? '-v' + prop.version : ''}`
})

defineExpose({ validate })
function validate(errs){
  showErr.value = true
  errInfo.value = validNodeName(_value.value.name, errs)
  if (!isEmpty(errInfo.value)) return
  const prop = _value.value.props
  if (isEmpty(prop.code)) {
    errInfo.value = '请指定子流程'
    errs.push(`子流程节点 ${_value.value.name} 未指定流程`)
    return
  } else if (prop.initiatorType === 'FIXED') {
    if (isEmpty(prop.fixedUser)) {
      errInfo.value = '未指定子流程发起人'
      errs.push(`子流程节点 ${_value.value.name} 未指定发起人`)
      return
    } else if (isEmpty(prop.fixedDept)) {
      errInfo.value = '子流程发起人无部门信息'
      errs.push(`子流程节点 ${_value.value.name} 设置的发起人没有部门`)
      return
    }
  }
  showErr.value = false
}
</script>

<template>
<node v-model="_value" :readonly="readonly" :show-error="showErr"
      :error-info="errInfo" header-color="#9274E7" header-icon="money"
      :content="content" @select="emit('select', modelValue)"
      @insertNode="type => emit('insertNode', branch, index, type)"
      @delete="emit('delete', branch, index)" :id="_value.id"
      @paste="$emit('paste')"
/>
</template>

<style scoped>

</style>
