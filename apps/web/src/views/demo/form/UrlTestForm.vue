<template>
  <el-form ref="formRef" :model="formData" :rules="rules" label-width="auto">
    <el-form-item prop="name" label="活动名">
      <el-input v-model="formData.name" :disabled="(permConf.name || mode) !== 'E'"/>
    </el-form-item>
    <el-form-item prop="region" label="活动区域" required>
      <el-select v-model="formData.region" placeholder="please select your zone"
                 :disabled="(permConf.region || mode) !== 'E'">
        <el-option label="Zone one" value="shanghai"/>
        <el-option label="Zone two" value="beijing"/>
      </el-select>
    </el-form-item>
    <el-form-item label="Activity time">
      <el-col :span="11">
        <el-date-picker :disabled="(permConf.date1 || mode) !== 'E'"
                        v-model="formData.date1"
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
                        v-model="formData.date2"
                        placeholder="Pick a time"
                        style="width: 100%"
        />
      </el-col>
    </el-form-item>
    <el-form-item label="Instant delivery">
      <el-switch v-model="formData.delivery" :disabled="(permConf.delivery || mode) !== 'E'"/>
    </el-form-item>
    <el-form-item label="Activity type">
      <el-checkbox-group v-model="formData.type" :disabled="(permConf.type || mode) !== 'E'">
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
      <el-radio-group v-model="formData.resource" :disabled="(permConf.resource || mode) !== 'E'">
        <el-radio value="Sponsor">Sponsor</el-radio>
        <el-radio value="Venue">Venue</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="Activity form">
      <el-input v-model="formData.desc" type="textarea" :disabled="(permConf.desc || mode) !== 'E'"/>
    </el-form-item>
  </el-form>
</template>

<script setup>
import {ref} from 'vue'
import {createWflowFormTrans} from "@/utils/IframeFormTrans.js"

onMounted(() => window?.removeLoading())

const rules = {
  name: {required: true, message: '请输入信息', trigger: 'blur'},
  region: {required: true, message: '请选择一个', trigger: 'blur'},
}

const mode = ref('R')
const formData = ref({
  name: '',
  region: '',
  date1: '',
  date2: '',
  delivery: false,
  type: [],
  resource: '',
  desc: '',
})
const permConf = ref({})
const formRef = ref()
let communicator, reportFormData

onMounted(() => {
  // 创建通信实例
  const trans = createWflowFormTrans({
    isParent: false,
    targetOrigin: '*',
    allowedOrigins: ['*'],
    validate: async () => {
      try {
        await validate();
        return {result: true}
      } catch (e) {
        return {
          result: false,
          message: '请检查表单数据'
        }
      }
    },
    getFields: async () => {
      return getFields()
    },
    onChangeFormData: (fd) => {
      formData.value = fd
    },
    onChangeFormPerm: (perms) => {
      if (typeof perms === "string") mode.value = perms
      // 在这里处理表单权限配置
      else permConf.value = perms
    },
  });
  communicator = trans.iframeTrans
  reportFormData = trans.reportFormData
})

const validate = () => {
  return formRef.value.validate()
}
const getFields = () => {
  return [
    {id: 'name', name: '活动名-新', key: 'name', valueType: 'string'},
    {id: 'region', name: '活动区域', key: 'region', valueType: 'string'},
    {id: 'date1', name: 'Activity time', key: 'date1', valueType: 'date'},
    {id: 'date2', name: 'Instant delivery', key: 'date2', valueType: 'date'},
    {id: 'delivery', name: 'Activity type', key: 'delivery', valueType: 'boolean'},
    {id: 'type', name: 'Resources', key: 'type', valueType: 'string'},
    {id: 'resource', name: 'Activity form', key: 'resource', valueType: 'string'},
    {id: 'desc', name: 'Activity form', key: 'desc', valueType: 'string'},
  ]
}

onBeforeUnmount(() => communicator.stop())

watch(() => formData.value, () => {
  reportFormData(toRaw(formData.value))
}, {deep: true})
</script>
