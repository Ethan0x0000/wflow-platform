<script setup>
import DefaultValue from "./common/DefaultValue.vue";
import OptionsConf from "@/views/wflow/design/form/base/config/common/OptionsConf.vue";

const props = defineProps({
  config: {
    type: Object,
    default: () => {
      return {}
    }
  }
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
  <options-conf v-model="config.props"/>
  <el-form-item label="默认值">
    <default-value v-model="config.props.defaultValue" :config="config" placeholder="设置默认值"/>
  </el-form-item>
  <el-form-item label="选项展开">
    <el-switch v-model="config.props.expanding"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
</template>

<style lang="less" scoped>
:deep(.w-fd-options) {
  .el-input-group__append, .el-input-group__prepend {
    padding: 0 10px;
  }
}

.w-move {
  cursor: move;
}
</style>
