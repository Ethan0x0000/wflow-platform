<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props
})

const emit = defineEmits([...FormComponentMixin.emits])

</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
<!--  <el-divider direction="horizontal">数据校验</el-divider>-->
  <el-form-item label="URL地址">
    <el-input v-model="config.props.url" placeholder="请设置URL地址，支持${变量名}"/>
  </el-form-item>
  <el-form-item label="高度设置">
    <el-input-number :min="20" :max="2000" controls-position="right" v-model="config.props.height" placeholder="显示高度"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>

</template>

<style lang="less" scoped>

</style>
