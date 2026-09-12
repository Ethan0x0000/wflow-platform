<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import ComponentDev from "../../../../common/dynamic/ComponentDev.vue";
import WDialog from "../../../../common/WDialog.vue";
import {ElMessage} from "element-plus";
import valueType from "../../ValueType.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const sfcVisible = ref(false)
const codeTemp = reactive({pc: null, mb: null})
const codeDev = ref()
const pcMode = ref(true)
const emit = defineEmits([...FormComponentMixin.emits])

function confirmCode() {
  if(codeDev.value.validate()){
    props.config.props.sfc = codeTemp.pc
    props.config.props.mbSfc = codeTemp.mb
    sfcVisible.value = false
  } else {
    ElMessage.error('组件代码渲染异常，请检查')
  }
}

function editCode() {
  //兼容下之前的格式
  codeTemp.pc = props.config.props.sfc
  codeTemp.mb = props.config.props.mbSfc
  sfcVisible.value = true
}
</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="值类型">
    <el-select v-model="config.valueType" placeholder="请选择组件值类型">
      <el-option v-for="type in valueType" :label="type" :value="type"/>
    </el-select>
  </el-form-item>
  <el-form-item label="组件代码">
    <el-button icon="Edit" @click="editCode">编辑组件SFC代码</el-button>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <w-dialog close-free title="编写Vue-SFC代码" v-model="sfcVisible" fullscreen @ok="confirmCode">
    <component-dev v-model:mode="pcMode" ref="codeDev" v-model="codeTemp[pcMode ? 'pc':'mb']"/>
  </w-dialog>
</template>

<style lang="less" scoped>

</style>
