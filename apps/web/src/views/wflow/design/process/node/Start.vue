<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";
import {validNodeName} from "@/utils/ProcessUtil.js";
import {isEmpty} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...nodeMixin.props
})

const emit = defineEmits(nodeMixin.emits)
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
<node v-model="_value" :readonly="readonly" :show-close="false" :show-error="showErr"
      @select="emit('select', modelValue)" :error-info="errInfo" :id="_value.id"
      @insert-node="type => emit('insertNode', branch, index, type)"
      header-color="#80929C" header-icon="UserFilled" content="流程从本节点开始"
      @paste="$emit('paste')"
/>
</template>

<style scoped>

</style>
