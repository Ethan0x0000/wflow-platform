<script setup>
import {CompareOptions} from "@/utils/ConditionCompare.js";
import WConditionCompareValue from "../../../../common/WConditionCompareValue.vue";

const props = defineProps({
  valueType: {
    type: String
  },
  modelValue: {
    type: Object
  },
  field: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const _value = defineModel()

const options = ref([])

</script>

<template>
  <div style="display:inline-flex; align-items: center">
    <!-- 基础条件选项 -->
    <el-select v-model="_value.compare" @change="_value.compareVal.length = 0" style="max-width: 30%;">
      <el-option v-for="op in CompareOptions[valueType]" :key="op.symbol" :label="op.name" :value="op.symbol"/>
    </el-select>
    <template v-if="_value.compare !== 'EM' && _value.compare !== 'NEM'">
      <el-divider direction="vertical"/>
      <w-condition-compare-value v-model="_value" style="flex: 1" :value-type="valueType" :field="field"/>
    </template>
  </div>
</template>

<style scoped lang="less">

</style>
