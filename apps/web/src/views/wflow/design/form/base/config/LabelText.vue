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
  <el-form-item label="提示文字">
    <el-input v-model="config.props.placeholder" placeholder="输入提示"/>
  </el-form-item>
  <el-form-item label="标签颜色">
    <el-color-picker :predefine="['#1989fa', '#35b881', '#f78f5f', '#E04765', '#909399']"
                     color-format="hex" v-model="config.props.color"/>
  </el-form-item>
  <el-form-item label="显示底色">
    <el-switch v-model="config.props.showBgc"/>
  </el-form-item>
</template>

<style lang="less" scoped>

</style>
