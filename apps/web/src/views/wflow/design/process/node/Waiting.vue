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
  let desc = '请设置等待规则';
  const prop = _value.value.props
  switch (prop.type){
    case 'FIXED':
      let unit = ''
      switch (prop.timeUnit) {
        case 'D': unit = '天'; break
        case 'H': unit = '小时'; break
        case 'M': unit = '分钟'; break
        case 'S': unit = '秒'; break
      }
      desc = `等待 ${prop.timeout ? prop.timeout : '?'}${unit} 后继续`
      break;
    case 'TODAY':
      desc = `等到当天 ${prop.time ? prop.time : '?'} 后继续`
      break;
    case 'DATETIME':
      desc = `等到当天 ${prop.dateTime ? prop.dateTime : '?'} 后继续`
      break;
    case 'SIGNAL':
      desc = `等收到${prop.globalSignal ? '全局':'局部'}信号 ${isEmpty(prop.signal) ? '?' : prop.signal} 后继续`
      break
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
    case 'FIXED':
      if (!prop.timeout) {
        errInfo.value = '请设置等待时长'
        errs.push(`节点 ${_value.value.name} 的等待时长不能为空`)
        return
      }
      break
    case 'TODAY':
      if (!prop.time) {
        errInfo.value = '请设置当天时间点'
        errs.push(`节点 ${_value.value.name} 的当前等待时间点不能为空`)
        return
      }
      break
    case 'DATETIME':
      if (!prop.dateTime) {
        errInfo.value = '请指定时间点'
        errs.push(`节点 ${_value.value.name} 的等待时间点未指定`)
        return
      }
      break
    case 'SIGNAL':
      if (isEmpty(prop.signal)) {
        errInfo.value = '请输入信号名称'
        errs.push(`节点 ${_value.value.name} 的信号名称未设置`)
        return
      }
      break
  }
  showErr.value = false
}
</script>

<template>
<node v-model="_value" :readonly="readonly" :show-error="showErr"
      :error-info="errInfo" header-color="#E04765" header-icon="Timer"
      :content="content" @select="emit('select', modelValue)"
      @insertNode="type => emit('insertNode', branch, index, type)"
      @delete="emit('delete', branch, index)" :id="_value.id"
      @paste="$emit('paste')"
/>
</template>

<style scoped>

</style>
