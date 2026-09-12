<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";

const isDebug = inject('isDebug')
const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()

</script>

<template>
  <div style="position: relative;">
    <node :readonly="readonly" :class="{'w-p-branch-end': branch.length === index + 1}" :show-body="false"
          @insertNode="type => $emit('insertNode', branch, index, type)" @paste="$emit('paste')"/>
    <el-text v-if="isDebug && _value.id" style="position: absolute; top: 0" size="small" type="warning">{{_value.id}}</el-text>
  </div>
</template>

<style scoped lang="less">
:deep(.w-p-branch-end .w-p-node-add) {
  &:after {
    //border: none;
  }
}
</style>
