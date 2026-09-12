<script setup>
import {getIdoTasks} from "@/api/task.js";
import WAvatar from "../../common/WAvatar.vue";
import ProcessInstPreview from "./subs/ProcessInstPreview.vue";
import {ElMessage} from "element-plus";
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
  action: null,
  startRange: [],
  endRange: []
})
const loading = ref(false)
const instPreview = ref()

const getIdoList = () => {
  loading.value = true
  const _params = Object.assign({}, params)
  _params.startRange = String(_params.startRange || [])
  _params.endRange = String(_params.endRange || [])
  getIdoTasks(_params).then(res => {
    loading.value = false
    datas.value = res.data
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

onMounted(() => {
  getIdoList()
})
</script>

<template>
  <div>
    <search-tools :show-type="!pickerMode" start-desc="任务到达" show-action @search="getIdoList" v-model="params"/>
    <div style="margin-top: 10px" v-loading="loading">
      <el-table :data="datas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
        <el-table-column prop="defineName" label="流程类型"></el-table-column>
        <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
        <el-table-column prop="initiator" label="发起人">
          <template #default="scope">
            <w-avatar :id="scope.row.userId" :name="scope.row.username" :src="scope.row.avatar"
                       status="agent" :show-status="scope.row.userId !== scope.row.submitter"/>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="deptName" label="发起部门"></el-table-column>
        <el-table-column prop="nodeName" label="操作节点"></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag type="success" v-if="scope.row.action === 'agree'">已同意</el-tag>
            <el-tag type="danger" v-else-if="scope.row.action === 'reject'">已拒绝</el-tag>
            <el-tag type="primary" v-else-if="scope.row.action === 'complete'">已办理</el-tag>
            <el-tag type="info" v-else-if="scope.row.action === 'forward'">已转交</el-tag>
            <el-tag type="warning" v-else-if="scope.row.action === 'revoke'">撤销流程</el-tag>
            <el-tag type="warning" v-else-if="scope.row.action === 'revise'">修改数据</el-tag>
            <el-tag type="warning" v-else-if="scope.row.action === 'withdraw'">已撤回</el-tag>
            <el-tag type="warning" v-else-if="scope.row.action === 'fallback'">已退回</el-tag>
            <el-tag type="info" v-else-if="scope.row.action === 'cancel'">已取消</el-tag>
            <el-tag type="primary" v-else-if="scope.row.action === 'beforeAdd'">前加签</el-tag>
            <el-tag type="primary" v-else-if="scope.row.action === 'afterAdd'">后加签</el-tag>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="createTime" label="到达时间"></el-table-column>
        <el-table-column show-overflow-tooltip prop="endTime" label="处理时间"></el-table-column>
        <el-table-column fixed="right" width="150" label="操作">
          <template #default="scope">
            <el-button type="primary" link icon="View" @click="instPreview.open(scope.row.instId)">查看</el-button>
            <el-button link v-if="props.pickerMode" type="primary" icon="Pointer" @click="$emit('confirm', scope.row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
      <process-inst-preview ref="instPreview" @change="getIdoList"/>
      <div style="margin-top: 20px; display: flex; justify-content: right">
        <el-pagination v-model:current-page="params.pageNo"
                       v-model:page-size="params.pageSize"
                       :page-sizes="[10, 20, 50, 100]"
                       :disabled="datas.pages === 0"
                       layout="total, sizes, prev, pager, next"
                       :total="datas.total" background
                       @size-change="getIdoList"
                       @current-change="getIdoList"/>
      </div>

    </div>
  </div>
</template>

<style scoped lang="less">

</style>
