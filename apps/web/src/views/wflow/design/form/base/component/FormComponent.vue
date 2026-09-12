<script setup>
import componentMixin from "../../FormComponentMixin.js";
import {FormComponents} from "../../FormComponents.js";
import {copyField, delField} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...componentMixin.props,
  type: String,
  modelValue: { //组件值
    default: undefined
  },
  parents: { //本组件所在的组件列表
    default: () => {
      return []
    }
  },
  colIndex: Number,
  index: Number //本组件所在列表parents的索引位置
})

const emit = defineEmits([...componentMixin.emits])
const _value = defineModel()
const _active = computed(componentMixin.computed._active(props, emit))
const showActive = computed(() => {
 return _active.value?.id === props.config.id
     && props.mode === 'D'
})

</script>

<template>
  <div style="position: relative; width: 100%;" :class="{'w-form-cp-active': showActive,
       'w-border-no': !config.props.isContainer && !config.props.allowPut}">
    <div class="w-form-component" v-if="showActive">
      <el-icon color="#ffffff" class="w-cp-move"><Rank /></el-icon>
      <el-icon color="#ffffff" @click="copyField(parents, colIndex || index)"><CopyDocument /></el-icon>
      <el-icon color="#ffffff" @click="delField(parents, colIndex || index)"><Delete /></el-icon>
    </div>
    <component :config="config" v-model="_value" :is="FormComponents[type]"
               :index="index" :mode="mode" v-model:active="_active"/>
  </div>
</template>

<style scoped lang="less">

.w-border-no {
  border: none !important;
}

.w-cp-move {
  cursor: move !important;
}

.w-form-component {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 9;
  display: none;
  border-radius: 5px 0 0 0;
  overflow: hidden;

  i {
    padding: 5px;
    cursor: pointer;
    background: var(--el-color-primary);
    &:hover {
      background: var(--el-color-primary-light-3);
    }
  }
}
</style>
