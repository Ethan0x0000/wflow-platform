<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-input :placeholder="config.props?.placeholder"
            :disabled="config.props?.disable || mode === 'R'"
            v-if="mode !== 'V'" v-model="_value" :clearable="config.props?.enableClear"
  />
  <span v-else>{{_value || ''}}</span>
</template>

<style scoped>

</style>
