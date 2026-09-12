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
  <el-input :placeholder="config.props?.placeholder" :disabled="mode === 'R'"
            v-if="mode !== 'V'" prefix-icon="Postcard" v-model="_value" clearable>
  </el-input>
  <span v-else>{{_value}}</span>
</template>

<style scoped>

</style>
