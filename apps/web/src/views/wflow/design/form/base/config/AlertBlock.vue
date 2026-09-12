<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const colors = ['primary', 'success', 'warning', 'error', 'info']

</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="文字内容">
    <el-input v-model="config.props.content" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="主题色">
    <div class="w-alert-text-option">
      <div v-for="color in colors" @click="config.props.type = color"
           :style="`background-color: var(--el-color-${color})`">
        <el-icon v-if="color === config.props.type"><Select /></el-icon>
      </div>
    </div>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="隐藏图标">
    <el-switch v-model="config.props.hideIcon"/>
  </el-form-item>
  <el-form-item label="允许关闭">
    <el-switch v-model="config.props.closable"/>
  </el-form-item>
</template>

<style lang="less" scoped>
.w-alert-text-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  &> div {
    width: 25px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    margin-right: 10px;
    color: white;
    cursor: pointer;
  }
}
</style>
