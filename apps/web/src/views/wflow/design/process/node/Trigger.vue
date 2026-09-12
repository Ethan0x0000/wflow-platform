<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";
import {getDefault, validNodeName} from "@/utils/ProcessUtil.js";
import {isEmpty} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const showErr = ref(false)
const errInfo = ref(null)
const urlReg = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i

const content = computed(() => {
  let desc = '请设置触发动作';
  const prop = _value.value.props
  switch (prop.type){
    case 'EL':
      desc = `执行EL表达式[${getDefault(prop.el, '?')}]`
      break;
    case 'JS':
      desc = '执行JS脚本'
      break;
    case 'SIGNAL':
      let scope = ''
      switch (prop.signal.scope){
        case 'GLOBAL': scope = '所有流程'; break
        case 'PROCESS': scope = `编号为[${getDefault(prop.signal.code, '?')}]的流程`; break
        case 'LOCAL': scope = '当前流程实例'; break
        case 'INSTANCE': scope = `流程实例[${getDefault(prop.signal.instId, '?')}]`; break
      }
      desc = `抛出信号[${getDefault(prop.signal.name, '?')}] 给${scope}`
      break;
    case 'HTTP':
      desc = `${getDefault(prop.http.method, '?')} 请求：${getDefault(prop.http.url, '?')}`
      break;
  }
  return desc
})

defineExpose({ validate })
function validate(errs){
  showErr.value = true
  errInfo.value = validNodeName(_value.value.name, errs)
  if (!isEmpty(errInfo.value)) return
  const prop = _value.value.props
  switch (prop.type){
    case 'EL':
      if (isEmpty(prop.el)){
        errInfo.value = '请输入EL表达式'
        errs.push(`节点 ${_value.value.name} 未设置EL表达式`)
        return
      }
      break;
    case 'JS':
      if (isEmpty(prop.jsCode)){
        errInfo.value = '请输入JS脚本'
        errs.push(`节点 ${_value.value.name} 未设置要执行的JS脚本`)
        return
      }
      break;
    case 'SIGNAL':
      if (isEmpty(prop.signal.name)){
        errInfo.value = '信号名称未设置'
        errs.push(`节点 ${_value.value.name} 信号名称未设置`)
        return
      } else if (prop.signal.scope === 'PROCESS' && isEmpty(prop.signal.code)){
        errInfo.value = '未指定允许接收信号的流程类型'
        errs.push(`节点 ${_value.value.name} 信号接收流程未设置`)
        return
      }else if (prop.signal.scope === 'INSTANCE' && isEmpty(prop.signal.code)){
        errInfo.value = '未指定允许接收信号的流程实例'
        errs.push(`节点 ${_value.value.name} 信号接收流程实例未设置`)
        return
      }
      break;
    case 'HTTP':
      if (isEmpty(prop.http.url)) {
        errInfo.value = '未设置HTTP请求URL'
        errs.push(`节点 ${_value.value.name} HTTP请求URL未设置`)
        return
      } else if (!urlReg.test(prop.http.url)) {
        errInfo.value = 'HTTP请求URL格式不正确'
        errs.push(`节点 ${_value.value.name} HTTP请求URL格式不正确`)
        return
      }
      break;
  }
  showErr.value = false
}
</script>

<template>
<node v-model="_value" :readonly="readonly" :show-error="showErr"
      :error-info="errInfo" header-color="#15bc83" header-icon="SetUp"
      :content="content" @select="emit('select', modelValue)"
      @insertNode="type => emit('insertNode', branch, index, type)"
      @delete="emit('delete', branch, index)" :id="_value.id"
      @paste="$emit('paste')"
/>
</template>

<style scoped>

</style>
