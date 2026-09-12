<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WTip from "../../../../common/WTip.vue";

const props = defineProps({
  ...FormComponentMixin.props
})

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
  <el-form-item label="地址格式">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>

</template>

<style lang="less" scoped>
.w-text-option {
  --el-color-text: var(--el-text-color-primary) !important;
}
.w-text-option {
  display: flex;
  justify-content: space-between;
  align-items: center;

  & > div {
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
