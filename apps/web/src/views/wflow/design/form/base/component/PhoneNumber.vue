<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {isEmpty, isRequired, useFormCpInit} from "@/utils/GlobalFunc.js";

const validates = inject('validates', {})
const permConf = inject('permConf', {})
const props = defineProps({
  ...FormComponentMixin.props,
})
const reg = /^1[3|4|5|6|7|8|9][0-9]\d{8}$/
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel({
  type: Object,
  default: () => {
    return {}
  }
})

useFormCpInit(props, _value, 'prefix', {prefix: '86', number: null})

onBeforeMount(() => {
  //加载自定义校验规则
  if (validates.value){
    validates.value[props.config.key] = (rule, value, callback) => {
      if (isEmpty(_value.value?.number)){
        if (isRequired(props.config.props.required, permConf[props.config.key] || props.mode))
          callback(new Error('手机号不能为空'))
        else callback()
      } else if (!reg.test(value.number)) {
        callback(new Error('请正确输入手机号'))
      } else {
        callback()
      }
    }
  }
})
</script>

<template>
  <el-input :placeholder="config.props?.placeholder" :disabled="mode === 'R'" v-if="mode !== 'V'" clearable
             prefix-icon="Cellphone" :model-value="_value?.number" @update:model-value="v => _value.number = v">
    <template #prepend>
      <el-select style="width: 100px;" :model-value="_value?.prefix" @update:model-value="v => _value.prefix = v" :disabled="mode === 'R'">
        <el-option label="+86" value="86"/>
        <el-option label="+62" value="62"/>
      </el-select>
    </template>
  </el-input>
  <span v-else>+{{_value?.prefix}} {{_value?.number}}</span>
</template>

<style scoped>

</style>
