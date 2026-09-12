<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import DefaultValue from "./common/DefaultValue.vue";

const props = defineProps({
  ...FormComponentMixin.props
})

const emit = defineEmits([...FormComponentMixin.emits])

const regOptions = [
  { label: '手机号', value: '^1[3-9]\\d{9}$' },
  { label: '身份证号', value: '^(\\d{17}(\\d|x|X)|\\d{15})$' },
  { label: 'URL地址', value: "^https?:\\/\\/(([a-zA-Z0-9_-])+(\\.)?)*(:\\d+)?(\\/((\\.)?(\\?)?=?&?[a-zA-Z0-9_-](\\?)?)*)*$" },
  { label: '邮箱', value: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
  { label: '邮编', value: '^[1-9]\\d{5}(?!\\d)$' },
  { label: 'IP地址', value: '^(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}$' },
  { label: '全为数字', value: '^\\d+$' },
  { label: '全为字母', value: '^[a-zA-Z]+$' },
  { label: '英文和数字', value: '^[a-zA-Z0-9]+$' },
  { label: '全为中文', value: '^[\\u4e00-\\u9fa5]+$' }
];
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
  <el-form-item label="默认值">
    <default-value v-model.number="config.props.defaultValue" :config="config" placeholder="设置默认值"/>
  </el-form-item>
  <el-form-item label="长度范围">
    <el-input type="number" :min="0" style="width: 47%;" :precision="0" v-model.number="config.props.length[0]" placeholder="最短"/>
    ~
    <el-input type="number" style="width: 47%;" :precision="0" v-model="config.props.length[1]" placeholder="最长"/>
  </el-form-item>
  <el-form-item label="正则校验">
    <el-select v-model="config.props.regex.exp" clearable filterable allow-create placeholder="请选择/输入正则表达式">
      <el-option v-for="reg in regOptions" :label="reg.label" :value="reg.value"
                 @click="config.props.regex.error = '输入内容必须是' + reg.label"/>
    </el-select>
    <el-input style="margin-top: 5px" prefix-icon="WarnTriangleFilled" v-model="config.props.regex.error" placeholder="错误提示"/>
  </el-form-item>
  <el-form-item label="允许清空">
    <el-switch v-model="config.props.enableClear"/>
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
<!--  <el-divider direction="horizontal">数据校验</el-divider>-->
</template>

<style lang="less" scoped>

</style>
