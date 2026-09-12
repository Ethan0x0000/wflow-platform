<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {dayjs} from "element-plus";
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props,
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value, () => {
  _value.value = dayjs().format('HH:mm:ss')
})
</script>

<template>
  <el-time-picker style="width: 100%;" v-model="_value" value-format="HH:mm:ss"
                  :format="config.props.format" v-if="mode !== 'V'" :disabled="mode === 'R'"
                  clearable :placeholder="config.props.placeholder"/>
  <span v-else>{{_value || ''}}</span>
</template>

<style scoped>

</style>
