<script setup>
import {claimTheTask, getTodoTasks} from "@/api/task.js";
import WAvatar from "../../common/WAvatar.vue";
import ProcessInstPreview from "./subs/ProcessInstPreview.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import SearchTools from "./subs/SearchTools.vue";

const tbCellStyle = {
  background: 'var(--el-fill-color-lighter)',
  padding: '10px 0',
}
defineEmits(['confirm'])
const props = defineProps({
  code: { //默认筛选的流程编码
    type: String,
    default: null
  },
  pickerMode: Boolean
})

const datas = ref({
  pages: 0,
  records: [],
  total: 0
})
const params = reactive({
  pageNo: 1,
  pageSize: 10,
  code: props.code,
  title: null,
  startRange: [],
  endRange: []
})
const loading = ref(false)
const instPreview = ref()

const getTodoList = () => {
  loading.value = true
  const _params = Object.assign({}, params)
  _params.startRange = String(_params.startRange || [])
  getTodoTasks(_params).then(res => {
    loading.value = false
    datas.value = res.data
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function claimTask(row) {
  ElMessageBox.confirm(`确定要签收该任务吗，签收后您需要处理该任务，是否确认？`, '提示', {
    confirmButtonText: '签收',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    claimTheTask(row.taskId).then(res => {
      getTodoList()
      ElMessage.success(res.data)
    }).catch(err => {
      ElMessage.error(err.msg || err)
    })
  })
}

function openInst(inst) {
  instPreview.value.open(inst.instId, inst.taskId, inst.currentNodeId)
}

onMounted(() => {
  getTodoList()
})
</script>

<template>
<div>
  <search-tools :show-type="!pickerMode" exclude-user start-desc="任务到达" @search="getTodoList" v-model="params"/>
  <div style="margin-top: 10px" v-loading="loading">
    <el-table :data="datas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
      <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
      <el-table-column prop="defineName" label="流程类型"></el-table-column>
      <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
      <el-table-column prop="initiator" label="发起人">
        <template #default="scope">
          <w-avatar :id="scope.row.initiator.id" :name="scope.row.initiator.name"
                    :src="scope.row.initiator.avatar" status="agent" :show-status="scope.row.isAgent"/>
        </template>
      </el-table-column>
      <el-table-column prop="deptName" label="发起部门"></el-table-column>
      <el-table-column prop="currentNodeName" label="当前节点"></el-table-column>
      <el-table-column label="状态" width="100">
        <el-tag type="warning">待处理</el-tag>
      </el-table-column>
      <el-table-column show-overflow-tooltip prop="createTime" label="任务到达时间"></el-table-column>
      <el-table-column fixed="right" width="150" label="操作">
        <template #default="scope">
          <template v-if="scope.row.candidate">
            <el-button type="primary" link icon="View" @click="openInst(scope.row)">查看</el-button>
            <el-button type="warning" link icon="Finished" @click="claimTask(scope.row)">签收</el-button>
          </template>
          <el-button type="primary" v-else link icon="Stamp" @click="openInst(scope.row)">处理</el-button>
          <el-button link v-if="props.pickerMode" type="primary" icon="Pointer" @click="$emit('confirm', scope.row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>
    <process-inst-preview ref="instPreview" @change="getTodoList"/>
    <div style="margin-top: 20px; display: flex; justify-content: right">
      <el-pagination v-model:current-page="params.pageNo"
                     v-model:page-size="params.pageSize"
                     :page-sizes="[10, 20, 50, 100]"
                     :disabled="datas.pages === 0"
                     layout="total, sizes, prev, pager, next"
                     :total="datas.total" background
                     @size-change="getTodoList"
                     @current-change="getTodoList"/>
    </div>

  </div>
</div>
</template>

<style scoped lang="less">

</style>
