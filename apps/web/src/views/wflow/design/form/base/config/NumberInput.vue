<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import DefaultValue from "./common/DefaultValue.vue";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {ElMessage} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})

const emit = defineEmits([...FormComponentMixin.emits])

async function changeMax() {
  const prop = props.config.props
  if (!isEmpty(prop.max) && prop.min > prop.max) {
    prop.max = prop.min
    ElMessage.warning("最大值不能小于最小值")
  }
}

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
  <el-form-item label="输入范围">
    <el-input type="number" style="width: 47%;" @blur="changeMax" v-model.number="config.props.min" placeholder="最小值"/>
    ~
    <el-input type="number" style="width: 47%;" @blur="changeMax" v-model.number="config.props.max" placeholder="最大值"/>
  </el-form-item>
  <el-form-item label="默认值">
    <default-value v-model="config.props.defaultValue" :config="config" placeholder="设置默认值"/>
  </el-form-item>
  <el-form-item label="小数位数">
    <el-input-number controls-position="right" :min="0" :precision="0" v-model="config.props.precision" placeholder="保留几位小数">
      <template #suffix>位</template>
      <template #prefix>最多</template>
    </el-input-number>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <el-form-item label="禁止编辑">
    <el-switch v-model="config.props.disable"/>
  </el-form-item>
</template>

<style lang="less" scoped>

</style>
