<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";
import {dayjs} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-input :placeholder="config.props?.placeholder"
            v-model="_value" :clearable="config.props?.enableClear"
  />
</template>

<style scoped>

</style>
