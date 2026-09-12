<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {dayjs} from "element-plus";
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props,
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

const type = computed(() => {
  switch (props.config.props.format) {
    case 'YYYY':
      return 'year'
    case 'YYYY-MM':
      return 'month'
    case 'YYYY-MM-DD':
      return 'date'
    case 'YYYY-MM-DD HH:mm':
      return 'datetime'
    default:
      return 'datetime'
  }
})

useFormCpDefaultValue(props, _value, () => {
  _value.value = dayjs().format(props.config.props.format)
})
</script>

<template>
  <el-date-picker style="width: 100%;" v-model="_value" :value-format="config.props.format"
                  :format="config.props.format" :disabled="mode === 'R'" v-if="mode !== 'V'"
                  clearable :type="type" :placeholder="config.props.placeholder"/>
  <span v-else>{{_value || ''}}</span>
</template>

<style scoped>

</style>
