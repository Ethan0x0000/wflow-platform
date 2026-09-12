<script setup>
import {delInst, getInstList} from "@/api/instance.js";
import {getManagerTasks, suspendInst, resumeInst} from "@/api/manager.js";
import {ElMessage, ElMessageBox} from "element-plus";
import ProcessInstPreview from "../workspace/subs/ProcessInstPreview.vue";
import WAvatar from "../../common/WAvatar.vue";
import SearchTools from "../workspace/subs/SearchTools.vue";

const tbCellStyle = {
  background: 'var(--el-fill-color-lighter)',
  padding: '10px 0',
}

const activeTab = ref('instance')
const instPreview = ref()

// ========== Tab1: 实例管理 ==========
const datas = ref([])
const loading = ref(false)
const params = reactive({
  pageSize: 10,
  pageNo: 1,
  status: null,
  code: null,
  title: null,
  startRange: [],
  endRange: [],
})

onMounted(getSysInstList)

function getSysInstList() {
  loading.value = true
  const _params = Object.assign({}, params)
  _params.startRange = String(_params.startRange || [])
  getInstList(_params).then(res => {
    loading.value = false
    datas.value = res.data
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function deleteInst(row) {
  ElMessageBox.confirm('此操作将永久删除该实例数据, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    delInst(row.instId).then(res => {
      ElMessage.success('删除成功')
      getSysInstList()
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  })
}

function doSuspend(row) {
  ElMessageBox.confirm('确定要挂起该流程实例吗？挂起后流程将暂停流转。', '挂起确认', {
    confirmButtonText: '确定挂起',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    suspendInst(row.instId).then(res => {
      ElMessage.success(res.data)
      getSysInstList()
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  })
}

function doResume(row) {
  ElMessageBox.confirm('确定要恢复该流程实例吗？恢复后流程将继续流转。', '恢复确认', {
    confirmButtonText: '确定恢复',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    resumeInst(row.instId).then(res => {
      ElMessage.success(res.data)
      getSysInstList()
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  })
}

function viewInst(row) {
  instPreview.value.open(row.instId)
}

// ========== Tab2: 任务管理 ==========
const taskDatas = ref({pages: 0, records: [], total: 0})
const taskLoading = ref(false)
const taskLoaded = ref(false)
const taskParams = reactive({
  pageSize: 10,
  pageNo: 1,
  status: null,
  action: null,
  code: null,
  title: null,
  startRange: [],
  endRange: [],
})

function getTaskList() {
  taskLoading.value = true
  const _params = Object.assign({}, taskParams)
  _params.startRange = String(_params.startRange || [])
  getManagerTasks(_params).then(res => {
    taskLoading.value = false
    taskDatas.value = res.data
  }).catch(err => {
    taskLoading.value = false
    ElMessage.error(err.msg)
  })
}

function viewTask(row) {
  instPreview.value.open(row.instId)
}

function handleTask(row) {
  instPreview.value.open(row.instId, row.taskId, row.currentNodeId, {adminMode: true})
}

function handlePreviewChange() {
  getSysInstList()
  if (taskLoaded.value || activeTab.value === 'task') {
    getTaskList()
  }
}

function onTabChange(tab) {
  if (tab === 'task' && !taskLoaded.value) {
    taskLoaded.value = true
    getTaskList()
  }
}

</script>

<template>
  <div>
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <!-- Tab1: 实例管理 -->
      <el-tab-pane label="实例管理" name="instance">
        <search-tools start-desc="流程发起" show-status @search="getSysInstList" v-model="params"/>
        <div class="w-card-sm" style="margin-top: 10px" v-loading="loading">
          <el-table :data="datas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
            <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
            <el-table-column prop="defineName" label="流程类型"></el-table-column>
            <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
            <el-table-column prop="initiator" label="发起人">
              <template #default="scope">
                <w-avatar :id="scope.row.initiator.id" :name="scope.row.initiator.name" :src="scope.row.initiator.avatar" status="agent" :show-status="scope.row.isAgent"/>
              </template>
            </el-table-column>
            <el-table-column prop="currentNodeName" label="当前节点"></el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.status === 'RUNNING'" type="primary">进行中</el-tag>
                <el-tag v-else-if="scope.row.status === 'SUSPEND'" type="warning">暂停中</el-tag>
                <el-tag v-else-if="scope.row.status === 'REFUSE'" type="danger">被驳回</el-tag>
                <el-tag v-else-if="scope.row.status === 'REVOKED'" type="info">已撤销</el-tag>
                <el-tag v-else-if="scope.row.status === 'PASS'" type="success">审批通过</el-tag>
                <el-tag v-else-if="scope.row.status === 'EXCEPTION'" type="danger">流程异常</el-tag>
              </template>
            </el-table-column>
            <el-table-column show-overflow-tooltip prop="createTime" label="提交时间"></el-table-column>
            <el-table-column show-overflow-tooltip prop="endTime" label="完成时间"></el-table-column>
            <el-table-column width="220" label="操作" fixed="right">
              <template #default="scope">
                <el-button link type="primary" icon="View" @click="viewInst(scope.row)">详情</el-button>
                <el-button v-if="scope.row.status === 'RUNNING'" link type="warning" icon="VideoPause" @click="doSuspend(scope.row)">挂起</el-button>
                <el-button v-if="scope.row.status === 'SUSPEND'" link type="success" icon="VideoPlay" @click="doResume(scope.row)">恢复</el-button>
                <el-button link type="danger" icon="Delete" @click="deleteInst(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 20px; display: flex; justify-content: right">
            <el-pagination v-model:current-page="params.pageNo"
                           v-model:page-size="params.pageSize"
                           :page-sizes="[10, 20, 50, 100]"
                           :disabled="datas.pages === 0"
                           layout="total, sizes, prev, pager, next"
                           :total="datas.total" background
                           @size-change="getSysInstList"
                           @current-change="getSysInstList"/>
          </div>
        </div>
      </el-tab-pane>

      <!-- Tab2: 任务管理 -->
      <el-tab-pane label="任务管理" name="task">
        <search-tools start-desc="任务到达" @search="getTaskList" v-model="taskParams"/>
        <div class="w-card-sm" style="margin-top: 10px" v-loading="taskLoading">
          <el-table :data="taskDatas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
            <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
            <el-table-column prop="defineName" label="流程类型"></el-table-column>
            <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
            <el-table-column prop="currentNodeName" label="任务节点"></el-table-column>
            <el-table-column prop="initiator" label="发起人">
              <template #default="scope">
                <w-avatar v-if="scope.row.initiator" :id="scope.row.initiator.id" :name="scope.row.initiator.name" :src="scope.row.initiator.avatar"/>
              </template>
            </el-table-column>
            <el-table-column prop="deptName" label="发起部门"></el-table-column>
            <el-table-column show-overflow-tooltip prop="createTime" label="任务到达时间"></el-table-column>
            <el-table-column width="160" label="操作" fixed="right">
              <template #default="scope">
                <el-button link type="primary" icon="View" @click="viewTask(scope.row)">详情</el-button>
                <el-button link type="warning" icon="Stamp" @click="handleTask(scope.row)">介入</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 20px; display: flex; justify-content: right">
            <el-pagination v-model:current-page="taskParams.pageNo"
                           v-model:page-size="taskParams.pageSize"
                           :page-sizes="[10, 20, 50, 100]"
                           :disabled="taskDatas.pages === 0"
                           layout="total, sizes, prev, pager, next"
                           :total="taskDatas.total" background
                           @size-change="getTaskList"
                           @current-change="getTaskList"/>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <process-inst-preview ref="instPreview" @change="handlePreviewChange"/>
  </div>
</template>

<style scoped lang="less">

</style>
