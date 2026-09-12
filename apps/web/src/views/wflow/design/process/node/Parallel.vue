<script setup>

import BranchNode from "./base/BranchNode.vue";
import nodeMixin from "../NodeMixin.js";
import {validNodeName} from "@/utils/ProcessUtil.js";
import {isEmpty} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...nodeMixin.props,
  moveLn: Boolean,
  moveRn: Boolean
})
const emit = defineEmits([...nodeMixin.emits, 'moveL', 'moveR'])
const _value = defineModel()
const showErr = ref(false)
const errInfo = ref(null)

defineExpose({ validate })
function validate(errs){
  showErr.value = true
  errInfo.value = validNodeName(_value.value.name, errs)
  if (!isEmpty(errInfo.value)) return
  showErr.value = false
}

</script>

<template>
  <branch-node v-model="_value" :readonly="readonly" desc="并行执行"
               :show-error="showErr" :error-info="errInfo"
               color="#718dff" header-icon="Operation" :id="_value.id"
               content="并行流程分支" :moveRn="moveRn" :moveLn="moveLn"
               @insertNode="type => emit('insertNode', type)"
               @move-l="emit('moveL')" @move-r="emit('moveR')" @paste="$emit('paste')"
               @delete="emit('delete')" @select="emit('select', modelValue)"/>
</template>

<style scoped>

</style>
