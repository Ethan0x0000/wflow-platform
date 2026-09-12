<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {useFormCpInit} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel({
  type: Object,
  default: () => {
    return {}
  }
})

useFormCpInit(props, _value, 'text', {
  type: '', date: [], text: ''
})

function getFields() {
  return [
    {id: 'type0001', name: '请假类型', key: 'type', valueType: 'option'},
    {id: 'date0001', name: '请假时间', key: 'date', valueType: 'datetimeRange'},
  ]
}
</script>

<template>
  <div style="width: 100%;">
    <el-form-item label="请假类型">
      <el-text type="info">这仅仅是一个演示套件组件</el-text>
      <el-select value-key="label" v-if="mode !== 'V'" :disabled="mode === 'R'" v-model="_value.type">
        <el-option v-for="op in config.props.typeOptions" :key="op.value" :label="op.label" :value="op"/>
      </el-select>
      <el-text v-else>{{_value.type?.label}}</el-text>
    </el-form-item>
    <el-form-item label="请假时长">
      <el-date-picker v-if="mode !== 'V'" :disabled="mode === 'R'"  v-model="_value.date" type="datetimerange" value-format="YYYY-MM-DD HH:mm"/>
      <el-text v-else>{{(_value.date || []).join(' ~ ')}}</el-text>
    </el-form-item>
  </div>

</template>

<style scoped>

</style>
