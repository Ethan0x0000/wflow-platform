<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";
import {ProcessCondition} from "@/utils/ConditionCompare.js";
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
  if (!prop.hasCondition) {
    if (!prop.target || !prop.target.name) return '未设置路由目标节点'
    else return `路由至[${prop.target.name}]节点`
  }
  if (prop.groups.length > 0 && prop.groups[0].conditions.length > 0) {
    const desc = prop.groups.map(group => {
      if ((group.conditions || []).length === 0) {
        return '请添加路由条件'
      }
      const hasMore = prop.groups.length > 1 && group.conditions.length
      return (hasMore ? '[' : '') + group.conditions.map(cd => {
        if (ProcessCondition[cd.group]) {
          return ProcessCondition[cd.group].desc(cd)
        }
        return '未配置路由条件'
      }).join(` ${group.logic ? '且' : '或'} `) + (hasMore ? ']' : '')
    }).join(` ${prop.logic ? '且' : '或'} `)
    return `当[${desc}]时，路由至[${prop.target?.name ? prop.target?.name : '?'}]节点`
  } else {
    return '请设置路由条件'
  }
})

function validate(errs) {
  //校验非默认节点
  showErr.value = true
  errInfo.value = validNodeName(_value.value.name, errs)
  if (!isEmpty(errInfo.value)) return
  const prop = _value.value.props
  if (!prop.hasCondition) {
    if (!prop.target || !prop.target.name) {
      errInfo.value = '请设置路由目标节点'
      errs.push(`${_value.value.name}未设置路由目标节点`)
      return
    }
  } else if (prop.groups.length === 0) {
    errInfo.value = '请添加条件组'
    errs.push(`条件 ${_value.value.name}未添加条件组`)
    return;
  } else {
    for (let i = 0; i < prop.groups.length; i++) {
      const group = prop.groups[i]
      if (group.conditions.length === 0) {
        errInfo.value = '请给条件组设置条件'
        errs.push(`${_value.value.name}-条件组${i+1} 未添加条件`)
        return
      }
      for (const cd of group.conditions) {
        if (!cd.compare || hasEmpty(cd.compareVal || []) || isEmpty(cd.symbol)) {
          if (cd.compare !== 'EM' && cd.compare !== 'NEM') {
            errInfo.value = `请完善路由条件项: ${(cd.name || []).join('-')}`
            errs.push(`${_value.value.name}-条件组${i + 1}内条件未完善`)
            return
          }
        }
      }
    }
  }
  showErr.value = false
}

function hasEmpty(arr) {
  return arr.length === 0 || arr.findIndex(v => {
    return v === null || v === undefined || String(v).trim() === ''
  }) > -1
}

defineExpose({validate})
</script>

<template>
  <node v-model="_value" :readonly="readonly" :show-error="showErr"
        :error-info="errInfo" header-color="#ff4500" header-icon="Paperclip"
        :content="content" @select="emit('select', modelValue)"
        @insertNode="type => emit('insertNode', branch, index, type)"
        @delete="emit('delete', branch, index)" :id="_value.id"
        @paste="$emit('paste')"
  />
</template>

<style scoped>

</style>
