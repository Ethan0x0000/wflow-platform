<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {isEmpty, useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-input-number :max="isEmpty(config.props.max) ? undefined : config.props.max" :min="config.props.min"
                   controls-position="right" v-model="_value" v-if="mode !== 'V'"
                   class="w-number-input" :disabled="config.props.disable || mode === 'R'"
                   :precision="config.props.precision" style="width: 100%;"
                   :placeholder="config.props.placeholder"/>
  <span v-else>{{_value || ''}}</span>
</template>

<style scoped>
</style>
