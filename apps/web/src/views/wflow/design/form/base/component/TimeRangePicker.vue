<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props,
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-time-picker v-model="_value" clearable is-range arrow-control range-separator="~" value-format="HH:mm:ss"
                  :start-placeholder="config.props.placeholder[0]" style="width: calc(100% - 20px);"
                  :end-placeholder="config.props.placeholder[1]" :disabled="mode === 'R'" v-if="mode !== 'V'"/>
  <span v-else>{{(_value || []).join(" ~ ")}}</span>
</template>

<style scoped>

</style>
