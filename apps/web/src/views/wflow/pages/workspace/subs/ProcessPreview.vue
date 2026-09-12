<script setup>
import {getInstProcess} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import ProcessRender from "../../../design/process/ProcessRender.vue";

const props = defineProps({
  instId: String //流程定义ID
})

const loading = ref(false)
const _process = ref({})
const process = ref()
const scale = ref(100)

onMounted(() => {
  loading.value = true
  getInstProcess(props.instId).then(res => {
    loading.value = false
    _process.value = reactive(res.data)
    _process.value.process = JSON.parse(_process.value.process)
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
})
</script>

<template>
  <el-scrollbar class="w-inst-process" v-loading="loading">
    <div class="w-inst-process-status">
      <div>
        <el-text>状态</el-text>
        +
        <el-text> &nbsp; 经过次数</el-text>
      </div>
      <div>
        <el-icon class="is-loading" style="color: var(--el-color-primary)">
          <Loading/>
        </el-icon>
        <el-text>执行中</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-success)">
          <Bottom/>
        </el-icon>
        <el-text>已执行</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-success)">
          <SuccessFilled/>
        </el-icon>
        <el-text>已通过</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-danger)">
          <CircleCloseFilled/>
        </el-icon>
        <el-text>已拒绝</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-info)">
          <CircleCloseFilled/>
        </el-icon>
        <el-text>已取消</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-warning)">
          <Back/>
        </el-icon>
        <el-text>已退回</el-text>
      </div>
      <div>
        <el-icon style="color: var(--el-color-info)">
          <RefreshLeft/>
        </el-icon>
        <el-text>已撤销</el-text>
      </div>
    </div>
    <el-space class="w-inst-process-zoom">
      <el-button icon="Minus" @click="scale -= 5" circle/>
      <span>{{ scale }}%</span>
      <el-button icon="Plus" @click="scale += 5" circle/>
    </el-space>
    <div :style="`transform: scale(${scale / 100})`">
      <process-render :records="_process" :model-value="_process.process" ref="process" readonly/>
    </div>
  </el-scrollbar>
</template>

<style scoped lang="less">
.w-inst-process {
  position: relative;
  background-color: var(--el-bg-color-page);
  padding: 10px;
  height: calc(100vh - 200px);

  .w-inst-process-zoom {
    position: absolute;
    z-index: 99;
    top: 10px;
    right: 10px;
  }

  .w-inst-process-status {
    position: absolute;
    z-index: 99;
    border-radius: 5px;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    background-color: rgba(var(--el-bg-color-page), 0.1);

    & > div {
      display: flex;
      align-items: center;
      & > * {
        margin-right: 5px;
      }
    }
  }
}
</style>
