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
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="渲染方式">
    <el-radio-group v-model="config.props.render">
      <el-radio label="html嵌入" value="vue"/>
      <el-radio label="Iframe" value="iframe"/>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="窗口高度" v-if="config.props.render === 'iframe'">
    <el-input type="number" v-model="config.props.height" placeholder="请设置iframe高度">
      <template #append>px</template>
    </el-input>
  </el-form-item>
  <el-form-item label="html内容">
    <el-input type="textarea" rows="4" v-model="config.props.code" placeholder="请输入html代码"/>
  </el-form-item>
</template>

<style lang="less" scoped>

</style>
