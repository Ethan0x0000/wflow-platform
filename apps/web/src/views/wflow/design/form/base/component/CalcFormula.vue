<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import request from "@/api/request.js";
import {compileHook, evaluateFormula} from '@/utils/form-runtime';

const props = defineProps({
  ...FormComponentMixin.props
})
const formData = inject('formData', {})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
let calcFuc = null
const calcReg = /^[+\-*/()]+$/;
//const calcExplain = $debounce(doExc, 500)

const calcText = computed(() => {
  let text = ''
  props.config.props.explain.forEach(v => {
    if (v.label) {
      text += ` ${v.label} `
    }else {
      text += v
    }
  })
  return text
})

function doExc() {
  if (!calcFuc) {
    if (!props.config.props.isCustom) {
      const explainText = props.config.props.explain.map(v => {
        return v.value ? calcReg.test(v.value) ? `${v.value}` : ` formData.${v.value} ` : v
      }).join('')
      calcFuc = (data) => evaluateFormula(explainText, data)
    } else {
      calcFuc = compileHook(['formData', 'index', 'request'], props.config.props.jsCode)
    }
  }
  try {
    const result = calcFuc(formData.value, props.index || 0, request)
    if (result instanceof Promise) {
      result.then(val => _value.value = formatValue(val))
          .catch(() => _value.value = 0)
    } else {
      _value.value = formatValue(result)
    }
  } catch (e) {
    _value.value = 0
  }
}

function formatValue(val) {
  return parseFloat((val || 0).toFixed(props.config.props.precision || 0))
}

onMounted(() => {
  if (_value) {
    _value.value = 0
  }
})

watch(() => formData.value, () => {
  //这里每次表单值变化都会触发重新计算，为了加速就不消抖了先
  doExc()
}, {deep: true, immediate: true})
</script>

<template>
  <el-text v-if="mode === 'D'">
    {{config.props.prefix}}
    {{config.props.isCustom ? 'JS计算' : (calcText === '' ? '请设置公式' : calcText)}}
    {{config.props.suffix}}
  </el-text>
  <el-text v-else>{{config.props.prefix}} {{_value}} {{config.props.suffix}}</el-text>
</template>

<style scoped>

</style>
