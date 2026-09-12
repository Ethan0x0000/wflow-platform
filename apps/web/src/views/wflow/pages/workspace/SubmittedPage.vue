<script setup>
import {getMySubmitInst} from "@/api/instance.js";
import {ElMessage, ElMessageBox} from "element-plus";
import ProcessInstPreview from "./subs/ProcessInstPreview.vue";
import WAvatar from "../../common/WAvatar.vue";
import router from "@/router/index.js";
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

const instPreview = ref()
const datas = ref([])
const loading = ref(false)
const params = reactive({
  pageSize: 10,
  pageNo: 1,
  status: null,
  code: props.code,
  title: null,
  startRange: [],
  endRange: [],
})

onMounted(getInstList)

function getInstList() {
  loading.value = true
  const _params = Object.assign({}, params)
  _params.startRange = String(_params.startRange || [])
  _params.endRange = String(_params.endRange || [])
  getMySubmitInst(_params).then(res => {
    loading.value = false
    datas.value = res.data
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function viewInst(row) {
  instPreview.value.open(row.instId)
}

function retrySubmit(row) {
  router.push(`/workspace/startProc?code=${row.code}&instId=${row.instId}`)
}

</script>

<template>
  <div>
    <search-tools :show-type="!pickerMode" start-desc="流程发起" show-status @search="getInstList" v-model="params"/>
    <div class="w-card-sm" style="margin-top: 10px" v-loading="loading">
      <el-table :data="datas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
        <el-table-column prop="defineName" label="流程类型"></el-table-column>
        <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
        <el-table-column min-width="110" prop="initiator" label="发起人">
          <template #default="scope">
            <w-avatar :id="scope.row.initiator.id" :name="scope.row.initiator.name" :src="scope.row.initiator.avatar" status="agent" :show-status="scope.row.isAgent"/>
          </template>
        </el-table-column>
        <el-table-column prop="currentNodeName" label="当前节点"></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 'RUNNING'" type="primary">进行中</el-tag>
            <el-tag v-else-if="scope.row.status === 'REFUSE'" type="danger">被驳回</el-tag>
            <el-tag v-else-if="scope.row.status === 'REVOKED'" type="info">已撤销</el-tag>
            <el-tag v-else-if="scope.row.status === 'PASS'" type="success">审批通过</el-tag>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="createTime" label="提交时间"></el-table-column>
        <el-table-column show-overflow-tooltip prop="endTime" label="完成时间"></el-table-column>
        <el-table-column fixed="right" width="150" label="操作">
          <template #default="scope">
            <el-button link type="primary" icon="View" @click="viewInst(scope.row)">详情</el-button>
            <el-button link v-if="props.pickerMode" type="primary" icon="Pointer" @click="$emit('confirm', scope.row)">选择</el-button>
            <el-button link v-else type="warning" icon="Promotion" @click="retrySubmit(scope.row)">重提</el-button>
          </template>
        </el-table-column>
      </el-table>
      <process-inst-preview ref="instPreview" @change="getInstList"/>
      <div style="margin-top: 20px; display: flex; justify-content: right">
        <el-pagination v-model:current-page="params.pageNo"
                       v-model:page-size="params.pageSize"
                       :page-sizes="[10, 20, 50, 100]"
                       :disabled="datas.pages === 0"
                       layout="total, sizes, prev, pager, next"
                       :total="datas.total" background
                       @size-change="getInstList"
                       @current-change="getInstList"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">

</style>
