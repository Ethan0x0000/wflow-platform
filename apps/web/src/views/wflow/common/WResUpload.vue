<script setup>
import {ElMessage} from "element-plus";
import {getAuthHeader, getRes} from "@/utils/GlobalFunc.js";

const props = defineProps({
  size: {
    type: String,
    default: 'default'
  },
  block: {
    type: Boolean,
    default: false
  }
})

const loading = ref(false)
const fileList = defineModel('files', {default: () => []})
const imageList = defineModel('images', {default: () => []})

let isImg = false

const BASE_URL = import.meta.env.VITE_APP_BASE_API
const uploadUrl = `${BASE_URL}/res`

function overLimit() {
  ElMessage.warning('超过最大允许上传数量')
}

function remove(list, i) {
  list.splice(i, 1)
}

function beforeUpload(file) {
  if (Array.isArray(file)) {
    for (let i = 0; i < file.length; i++) {
      if (!validFile(file[i])) {
        return false
      }
    }
    return true
  } else {
    return validFile(file)
  }
}

function validFile(img) {
  const limit = isImg ? 5 : 100
  if (img.size / 1024 / 1024 > limit) {
    ElMessage.warning(`${isImg ? '单张图片' : '单个附件'}最大不超过${limit}MB`)
  } else {
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
    const val = (isImg ? imageList : fileList).value || []
    //过滤出成功的
    const appends = list.slice(val.length)
        .filter(f => f.status === 'success')
        .map(f => f.response.data);
    (isImg ? imageList : fileList).value = [...val, ...appends]
  }
}

function uploadFail(err) {
  ElMessage.error('上传失败 ' + err)
}

function handleRemove(file, list) {
  let i = (isImg ? imageList : fileList).value.findIndex((v) => v.name === file.name)
  if (i > -1) {
    (isImg ? imageList : fileList).value.splice(i, 1)
  }
}

</script>

<template>
  <div :class="{'w-res-upload': true, 'w-res-block': block}" v-loading="loading">
    <div class="w-res-list">
      <div v-for="(img, i) in imageList" :key="img.id">
        <img :src="getRes(img.url) + '?zip=true'"/>
        <el-icon @click="remove(imageList, i)">
          <CircleCloseFilled/>
        </el-icon>
      </div>
      <div v-for="(file, i) in fileList" :key="file.id">
        <el-icon size="15">
          <Document/>
        </el-icon>
        <el-text truncated size="small">{{ file.name }}</el-text>
        <el-icon @click="remove(fileList, i)">
          <CircleCloseFilled/>
        </el-icon>
      </div>
    </div>
    <div class="w-res-upload-trigger">
      <el-upload :file-list="imageList" :action="uploadUrl" :limit="5" with-credentials multiple
                 :data="{isImg: true}" :on-success="uploadSuccess" :on-remove="handleRemove" :headers="getAuthHeader()"
                 :on-exceed="overLimit" :on-error="uploadFail" auto-upload :before-upload="beforeUpload">
        <template #default>
          <el-button :size="size" text icon="Picture" round @click="isImg = true"></el-button>
        </template>
        <template v-slot:file="scope">
          <span></span>
        </template>
      </el-upload>
      <el-upload :file-list="fileList" :action="uploadUrl" :limit="5" with-credentials multiple
                 :data="{isImg: false}" :on-success="uploadSuccess" :on-remove="handleRemove"
                 :on-exceed="overLimit" :on-error="uploadFail" auto-upload :before-upload="beforeUpload">
        <template #default>
          <el-button :size="size" text icon="Paperclip" round @click="isImg = false"></el-button>
        </template>
        <template v-slot:file="scope">
          <span></span>
        </template>
      </el-upload>
      <span style="margin-left: 10px">
        <slot></slot>
      </span>
    </div>
  </div>
</template>

<style scoped lang="less">
.w-res-upload {
  width: 100%;
  display: flex;
}

.w-res-block {
  display: flex;
  flex-direction: column-reverse;
}

.w-res-upload-trigger {
  & > div {
    display: inline-block;
  }
}

.w-res-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;

  & > div {
    position: relative;
    display: inline-block;
    text-align: center;
    margin: 2px;
    width: 50px;
    height: 40px;
    line-height: 20px;
    border-radius: 5px;
    background: var(--el-fill-color-dark);

    img {
      width: 100%;
      height: 100%;
      border-radius: 5px;
    }

    .el-text {
      font-size: 12px;
    }

    & > .el-icon:last-child {
      cursor: pointer;
      position: absolute;
      top: -5px;
      right: -5px;
      border-radius: 50%;
      background: var(--el-bg-color);
    }
  }

}
</style>
