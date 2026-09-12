<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="auto">
    <el-form-item prop="name" label="Activity name">
      <el-input v-model="form.name" :disabled="(permConf.name || mode) !== 'E'"/>
    </el-form-item>
    <el-form-item prop="region" label="Activity zone" required>
      <el-select v-model="form.region" placeholder="please select your zone" :disabled="(permConf.region || mode) !== 'E'">
        <el-option label="Zone one" value="shanghai" />
        <el-option label="Zone two" value="beijing" />
      </el-select>
    </el-form-item>
    <el-form-item label="Activity time">
      <el-col :span="11">
        <el-date-picker :disabled="(permConf.date1 || mode) !== 'E'"
            v-model="form.date1"
            type="date"
            placeholder="Pick a date"
            style="width: 100%"
        />
      </el-col>
      <el-col :span="2" class="text-center">
        <span class="text-gray-500">-</span>
      </el-col>
      <el-col :span="11">
        <el-time-picker :disabled="(permConf.date2 || mode) !== 'E'"
            v-model="form.date2"
            placeholder="Pick a time"
            style="width: 100%"
        />
      </el-col>
    </el-form-item>
    <el-form-item label="Instant delivery">
      <el-switch v-model="form.delivery" :disabled="(permConf.delivery || mode) !== 'E'"/>
    </el-form-item>
    <el-form-item label="Activity type">
      <el-checkbox-group v-model="form.type" :disabled="(permConf.type || mode) !== 'E'">
        <el-checkbox value="Online activities" name="type">
          Online activities
        </el-checkbox>
        <el-checkbox value="Promotion activities" name="type">
          Promotion activities
        </el-checkbox>
        <el-checkbox value="Offline activities" name="type">
          Offline activities
        </el-checkbox>
        <el-checkbox value="Simple brand exposure" name="type">
          Simple brand exposure
        </el-checkbox>
      </el-checkbox-group>
    </el-form-item>
    <el-form-item label="Resources">
      <el-radio-group v-model="form.resource" :disabled="(permConf.resource || mode) !== 'E'">
        <el-radio value="Sponsor">Sponsor</el-radio>
        <el-radio value="Venue">Venue</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="Activity form">
      <el-input v-model="form.desc" type="textarea" :disabled="(permConf.desc || mode) !== 'E'"/>
    </el-form-item>
  </el-form>
</template>

<script lang="ts" setup>
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

const rules = {
  name: {required: true, message: '请输入信息', trigger: 'blur'},
  region: {required: true, message: '请选择一个', trigger: 'blur'},
}

const form = defineModel({
  default: () => {
    return {
      name: '',
      region: '',
      date1: '',
      date2: '',
      delivery: false,
      type: [],
      resource: '',
      desc: '',
    }
  }
})

const formRef = ref()

const validate = () => {
  return formRef.value.validate()
}
const getFields = () => {
  return [
    {id: 'name', name: 'Activity name', key: 'name', valueType: 'string'},
    {id: 'region', name: 'Activity zone', key: 'region', valueType: 'string'},
    {id: 'date1', name: 'Activity time', key: 'date1', valueType: 'date'},
    {id: 'date2', name: 'Instant delivery', key: 'date2', valueType: 'date'},
    {id: 'delivery', name: 'Activity type', key: 'delivery', valueType: 'boolean'},
    {id: 'type', name: 'Resources', key: 'type', valueType: 'string'},
    {id: 'resource', name: 'Activity form', key: 'resource', valueType: 'string'},
    {id: 'desc', name: 'Activity form', key: 'desc', valueType: 'string'},
  ]
}

defineExpose({validate, getFields})
</script>
