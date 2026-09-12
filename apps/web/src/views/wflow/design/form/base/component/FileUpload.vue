<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {$debounce, download, getAuthHeader, getSize} from "@/utils/GlobalFunc.js";
import {ElMessage, useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const {formItem} = useFormItem()
const loading = ref(false)
const BASE_URL = import.meta.env.VITE_APP_BASE_API
const uploadUrl = `${BASE_URL}/res`
const uploadParams = {isImg: false}
const fileList = ref([])
const cpLoading = inject('cpLoadings', {})

const sizeTip = computed(() => {
  if (props.config.props.fileTypes.length > 0) {
    return ` | 只允许上传[${String(props.config.props.fileTypes).replaceAll(
        ',',
        '、'
    )}]格式的文件，且单个附件不超过${props.config.props.maxSize}MB`
  }
  return props.config.props.maxSize > 0 ? ` | 单个附件不超过${props.config.props.maxSize}MB` : ''
})
const reloadFileList = $debounce(loadFileList, 300)

const _value = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})

function beforeUpload(file) {
  if (Array.isArray(file)) {
    for (let i = 0; i < file.length; i++) {
      if (!validFile(file[i])) {
        return false
      }
    }
    cpLoading[props.config.key] = true
    return true
  } else {
    return validFile(file)
  }
}

function validFile(file) {
  const _props = props.config.props
  const fileType = '.' + file.name.split('.').pop()
  if (_props.maxSize > 0 && file.size / 1024 / 1024 > _props.maxSize) {
    ElMessage.warning(`单个文件最大不超过 ${_props.maxSize}MB`)
  } else if (_props?.fileTypes.length > 0 && !_props?.fileTypes?.some(v => v === fileType)) {
    ElMessage.warning(`${fileType} 文件类型不支持上传`)
  } else {
    cpLoading[props.config.key] = true
    loading.value = true
    return true
  }
  return false
}

function uploadSuccess(response, file, list) {
  loading.value = false
  if (response?.code === 200){
    toValue(list)
    ElMessage.success(response.data.name + '上传成功')
  } else {
    list.splice(list.length - 1, 1)
    ElMessage.error('上传失败：' + response?.msg)
  }
}


function toValue(list) {
  if (list.every(f => f.status !== 'uploading' && f.status !== 'ready')) {
    cpLoading[props.config.key] = false
    const val = _value.value || []
    //过滤出成功的
    const appends = list.slice(val.length)
        .filter(f => f.status === 'success')
        .map(f => f.response.data)
    _value.value = [...val, ...appends]
  }
}

function loadFileList() {
  fileList.value = (_value.value || []).map(f => {
    return {
      name: f.name,
      url: f.url,
      status: 'success',
      uid: new Date().getTime() + Math.floor(1000 + Math.random() * 9000),
      file: {}
    }
  })
}

function uploadFail(err) {
  loading.value = false
  if (err.name === "UploadAjaxError")
    ElMessage.error('文件上传失败，超出服务器设置限制')
  else
    ElMessage.error('文件上传失败 ' + err)
}

function overLimit() {
  ElMessage.warning('最多只能上传' + props.config.props.maxNumber + '个附件')
  loading.value = false
}

function handleRemove(file, fileList) {
  let i = _value.value?.findIndex((v) => v.name === file.name)
  if (i > -1) {
    //this.removeFile(this._value[i].id)
    _value.value.splice(i, 1)
  }
  if (fileList.every(f => f.status !== 'uploading' && f.status !== 'ready')) {
    cpLoading[props.config.key] = false
  }
}

watch(() => props.modelValue, reloadFileList, {deep: true, immediate: true})
</script>

<template>
    <el-upload v-if="mode === 'E' || mode === 'D'" :file-list="fileList" :action="uploadUrl"
               :limit="config.props.maxNumber" with-credentials :multiple="config.props.maxNumber > 1"
               :data="uploadParams" :on-success="uploadSuccess" auto-upload :before-upload="beforeUpload"
               :on-remove="handleRemove" :on-preview="download" :on-error="uploadFail" style="width: 100%;"
               :accept="String(config.props.fileTypes)" :on-exceed="overLimit" :headers="getAuthHeader()">
      <el-button icon="paperclip" round :disabled="mode === 'R'">选择文件</el-button>
      <template #tip>
        <el-text truncated :row="1" class="w-placeholder">{{(config.props.placeholder || '请上传文件') + sizeTip}}</el-text>
      </template>
    </el-upload>
    <div v-else class="w-file-preview">
      <div v-for="file in _value" :key="file.id">
        <el-text style="cursor: pointer" truncated type="primary" @click="download(file)">
          <el-icon><document/></el-icon>
          {{file.name}}
          <el-tag size="small">{{ getSize(file.size) }}</el-tag>
        </el-text>
      </div>
    </div>
</template>

<style lang="less" scoped>

</style>
