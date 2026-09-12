<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {$debounce, getAuthHeader, getRes} from "@/utils/GlobalFunc.js";
import {ElMessage, useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const {formItem} = useFormItem()
const sizeTip = computed(() => {
  return props.config.props.maxSize > 0 ? `| 每张图不超过${props.config.props.maxSize}MB` : ''
})

const pcImgList = computed(() => {
  return _value.value.map((v) => {
    return getRes(v.url)
  })
})

const fileList = ref([])
const loading = ref(false)
const BASE_URL = import.meta.env.VITE_APP_BASE_API
const uploadUrl = `${BASE_URL}/res`
const uploadParams = {isImg: true}
const cpLoading = inject('cpLoadings', {})

const reloadFileList = $debounce(loadFileList, 300)

const _value = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})

function overLimit() {
  ElMessage.warning('超过最大上传数量')
}

function beforeUpload(file) {
  if (Array.isArray(file)) {
    for (let i = 0; i < file.length; i++) {
      if (!validImage(file[i])) {
        return false
      }
    }
    cpLoading[props.config.key] = true
    return true
  } else {
    return validImage(file)
  }
}

function validImage(img) {
  if (!img?.type.startsWith('image/')) {
    ElMessage.warning('存在不支持的图片格式')
  } else if (props.config.props.maxSize > 0 && img.size / 1024 / 1024 > props.config.props.maxSize) {
    ElMessage.warning(`单张图片最大不超过 ${props.config.props.maxSize}MB`)
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
      url: getRes(f.url) + '?zip=true',
      status: 'success',
      uid: new Date().getTime() + Math.floor(1000 + Math.random() * 9000),
      file: {}
    }
  })
}

function uploadFail(err) {
  loading.value = false
  if (err.name === "UploadAjaxError")
    ElMessage.error('图片上传失败，超出服务器设置限制')
  else
    ElMessage.error('图片上传失败 ' + err)
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
  <el-upload v-if="mode !== 'R' && mode !== 'V'" :file-list="fileList" :action="uploadUrl" :limit="config.props.maxNumber"
             with-credentials :multiple="config.props.maxNumber > 1" :disabled="mode === 'R'"
             :data="uploadParams" :on-success="uploadSuccess" :on-remove="handleRemove" accept="image/*"
             :on-exceed="overLimit" :on-error="uploadFail" list-type="picture-card" auto-upload
             :before-upload="beforeUpload" :headers="getAuthHeader()">
    <template #default>
      <el-icon>
        <Plus/>
      </el-icon>
    </template>
    <template #tip>
      <el-text truncated :rows="1" class="w-placeholder">{{ config.props.placeholder || '请上传图片' }} {{ sizeTip }}</el-text>
    </template>
  </el-upload>
  <div class="w-img-preview-pc" v-else>
    <el-image :alt="img.name" :src="getRes(img.url) + '?zip=true'" v-for="img in modelValue" :preview-src-list="pcImgList"/>
  </div>
</template>

<style lang="less" scoped>
:deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
  line-height: 87px;
}

:deep(.el-upload-list__item) {
  width: 80px;
  height: 80px;
  transition: none;

  .el-upload-list__item-actions {
    & > span + span {
      margin: 1px;
    }
  }
}

:deep(.el-upload-list__item-preview) {
  display: none !important;
}

.w-img-preview-pc {
  .el-image {
    width: 80px;
    height: 80px;
    margin: 5px;
  }
}
</style>
