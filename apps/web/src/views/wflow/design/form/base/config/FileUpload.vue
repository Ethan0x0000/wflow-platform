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
  <el-form-item label="提示文字">
    <el-input v-model="config.props.placeholder" placeholder="输入提示"/>
  </el-form-item>
  <el-form-item label="数量限制">
    <el-input-number controls-position="right" :precision="0" v-model="config.props.maxNumber" placeholder="最多上传几张图片"/>
  </el-form-item>
  <el-form-item label="大小限制">
    <el-input-number controls-position="right" :precision="1" v-model="config.props.maxSize" placeholder="单个文件最大大小"/>
    <el-text>&nbsp MB</el-text>
  </el-form-item>
  <el-form-item label="类型限制">
    <el-select style="width: 100%" v-model="config.props.fileTypes" multiple filterable
               allow-create default-first-option clearable placeholder="允许上传文件的后缀格式，可设置多种"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
</template>

<style lang="less" scoped>

</style>
