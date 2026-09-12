<template>
  <el-form ref="formRef" :model="user" label-width="auto" style="max-width: 600px">
    <el-form-item label="姓名">
      <el-input v-model="user.name" :disabled="(permConf.name || mode) !== 'E'"/>
    </el-form-item>
    <el-form-item label="年龄">
      <el-input-number v-model="user.age" :disabled="(permConf.age || mode) !== 'E'" controls-position="right"/>
    </el-form-item>
    <el-form-item label="生日">
      <el-date-picker v-model="user.birthday" :disabled="(permConf.birthday || mode) !== 'E'" type="date" placeholder="出生日期" style="width: 100%"/>
    </el-form-item>
    <el-form-item label="爱好">
      <el-checkbox-group v-model="user.love" :disabled="(permConf.love || mode) !== 'E'">
        <el-checkbox value="打手冲" label="打手冲"/>
        <el-checkbox value="打篮球" label="打篮球"/>
        <el-checkbox value="唱" label="唱"/>
        <el-checkbox value="跳" label="跳"/>
        <el-checkbox value="Rap" label="Rap"/>
      </el-checkbox-group>
    </el-form-item>
  </el-form>
</template>

<script setup>
import {ref} from 'vue'

const props = defineProps({
  permConf: { //字段权限配置
    type: Object,
    default: () => {
      return {}
    }
  },
  mode: { //表单模式
    type: String,
    default: 'E'
  }
})

//定义双向绑定表单值
const user = defineModel({
  default: () => {
    return {
      name: '',
      age: '',
      sex: '',
      birthday: '',
      love: []
    }
  }
})

const formRef = ref()

const validate = () => {
  return formRef.value.validate()
}
const getFields = () => {
  return [
    {id: 'name', name: '姓名', key: 'name', valueType: 'string'},
    {id: 'age', name: '年龄', key: 'age', valueType: 'number'},
    {id: 'sex', name: '性别', key: 'sex', valueType: 'boolean'},
    {id: 'birthday', name: '生日', key: 'birthday', valueType: 'date'},
    {id: 'love', name: '爱好', key: 'love', valueType: 'array'}
  ]
}

defineExpose({validate, getFields})
</script>
