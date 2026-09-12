<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {getFormById, getFormByType} from "@/api/form.js";
const ComponentRender = defineAsyncComponent(() => import("../../../../common/dynamic/ComponentRender.vue"));

const props = defineProps({
  ...FormComponentMixin.props
})

const emit = defineEmits([...FormComponentMixin.emits])
const sfc = ref('')
const loading = ref(false)
const isError = ref(false)
const error = ref('')

function getCpDetail(cp) {
  loading.value = true
  isError.value = false
  const getFormCp = cp.props.cpId ? getFormById(cp.props.cpId) : getFormByType(cp.props.cpType)
  getFormCp.then(res => {
    loading.value = false
    sfc.value = res.data.configSfc
  }).catch(err => {
    isError.value = true
    loading.value = false
    error.value = err.msg
  })
}

onBeforeMount(() => {
  getCpDetail(props.config)
})
</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-text v-if="isError" type="danger" truncated>组件配置加载失败: {{error}}</el-text>
  <component-render v-else v-loading="loading" v-model="config.props" :sfc="sfc"/>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <el-form-item label="是否禁用">
    <el-switch v-model="config.props.disabled"/>
  </el-form-item>
</template>

<style lang="less" scoped>

</style>
