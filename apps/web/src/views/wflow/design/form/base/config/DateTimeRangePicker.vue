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
    <el-input v-model="config.props.placeholder[0]" placeholder="开始日期"/>
    <el-input v-model="config.props.placeholder[1]" placeholder="结束日期"/>
  </el-form-item>
  <el-form-item label="数据格式">
    <el-select v-model="config.props.format">
      <el-option label="年-月-日" value="YYYY-MM-DD"/>
      <el-option label="年-月-日 时:分" value="YYYY-MM-DD HH:mm"/>
      <el-option label="年-月-日 时:分:秒" value="YYYY-MM-DD HH:mm:ss"/>
    </el-select>
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
