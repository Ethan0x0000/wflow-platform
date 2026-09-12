<template>
  <div>
    <el-space class="w-card-sm" style="width: calc(100% - 20px);">
      <w-bright-block show-icon type="primary" content="创建工作交接记录，将指定用户的所有待办任务和流程权限永久转移给接替人"/>
      <el-button icon="Plus" type="primary" @click="addHandover()">创建交接记录</el-button>
      <el-button icon="Search" type="primary" @click="getHandoverList()">查询</el-button>
    </el-space>
    <div class="w-card-sm" style="margin-top: 10px" v-loading="loading">
      <el-table :data="handoverDataList.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column prop="source" label="交接人">
          <template #default="scope">
            <w-avatar :id="scope.row.source.id" :name="scope.row.source.name" :src="scope.row.source.avatar"/>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="接替人">
          <template #default="scope">
            <w-avatar :id="scope.row.target.id" :name="scope.row.target.name" :src="scope.row.target.avatar"/>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="scope" label="交接范围">
          <template #default="scope">
            {{ getHandoverRange(scope.row.scope) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 0" type="info">待执行</el-tag>
            <el-tag v-else-if="scope.row.status === 1" type="warning">
              <el-icon class="is-loading" style="margin-right:3px"><Loading /></el-icon>交接中
            </el-tag>
            <el-tag v-else-if="scope.row.status === 2" type="success">交接完成</el-tag>
            <el-tooltip v-else-if="scope.row.status === 3" placement="top">
              <template #content>
                <div style="max-width:320px">
                  <div style="font-weight:bold;margin-bottom:6px">失败的流程模型：</div>
                  <div v-for="m in scope.row.failedModels" :key="m.id" style="margin-bottom:3px;font-size:12px">
                    · {{ m.name }}（v{{ m.version }}）
                  </div>
                </div>
              </template>
              <el-tag type="danger" style="cursor:pointer">部分失败</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="reason" label="交接原因"/>
        <el-table-column show-overflow-tooltip prop="createTime" label="创建时间" width="150">
          <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="activatedTime" label="生效时间" width="150">
          <template #default="scope">{{ scope.row.activatedTime ? formatTime(scope.row.activatedTime) : '-' }}</template>
        </el-table-column>
        <el-table-column width="180" label="操作">
          <template #default="scope">
            <el-button v-if="scope.row.status === 0" type="primary" icon="Check" link @click="activateHandover(scope.row)">生效</el-button>
            <el-button v-if="scope.row.status === 3" type="warning" icon="RefreshRight" link @click="retryHandover(scope.row)">重试</el-button>
            <el-button v-if="scope.row.status !== 1" type="danger" icon="Delete" link @click="deleteHandover(scope.row.id)">删除</el-button>
            <span v-if="scope.row.status === 1" style="color:#E6A23C;font-size:13px">执行中...</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:20px;display:flex;justify-content:right">
        <el-pagination v-model:current-page="dataParams.pageNo"
                       v-model:page-size="dataParams.pageSize"
                       :page-sizes="[10, 20, 50, 100]"
                       :disabled="handoverDataList.pages === 0"
                       layout="total, sizes, prev, pager, next"
                       :total="handoverDataList.total" background
                       @size-change="getHandoverList"
                       @current-change="getHandoverList"/>
      </div>
    </div>

    <w-dialog v-model="handoverDialog" width="650" title="创建工作交接" @ok="confirmHandover()">
      <el-form ref="formRef" label-width="80px" :model="handoverData">
        <el-form-item :rules="{type:'array',required:true,message:'请选择交接人',trigger:'change'}" prop="source" label="交接人">
          <w-org-plus-picker v-model="handoverData.source" type="user" placeholder="选择交接人"
                             @change="formRef.validateField('source')"/>
        </el-form-item>
        <el-form-item :rules="{type:'array',required:true,message:'请选择接替人',trigger:'change'}" prop="target" label="接替人">
          <w-org-plus-picker v-model="handoverData.target" type="user" :excludes="handoverData.source"
                             placeholder="选择接替人" @change="formRef.validateField('target')"/>
        </el-form-item>
        <el-form-item :rules="{type:'array',required:!handoverData.isAll,message:'请选择交接范围'}" prop="scope" label="交接范围">
          <div class="w-flex-col-ct" style="width:100%">
            <el-checkbox label="所有流程" v-model="handoverData.isAll"
                         @change="v => handoverData.scope = handoverData.isAll ? null : v"/>
            <el-divider direction="vertical"/>
            <el-cascader v-if="!handoverData.isAll" clearable :show-all-levels="false" :options="groupItems"
                         :props="{emitPath:false,multiple:true}" placeholder="需要交接的流程"
                         style="width:calc(100% - 100px)" v-model="handoverData.scope"/>
            <w-bright-block v-else show-icon type="warning" content="将会转移所有流程的待办任务和权限"/>
          </div>
        </el-form-item>
        <el-form-item :rules="{required:true,message:'请输入交接原因'}" prop="reason" label="交接原因">
          <el-input v-model="handoverData.reason" show-word-limit maxlength="100" type="textarea" placeholder="请输入交接原因"/>
        </el-form-item>
      </el-form>
    </w-dialog>
  </div>
</template>

<script setup>
import WOrgPlusPicker from "../../common/WOrgPlusPicker.vue";
import WBrightBlock from "../../common/WBrightBlock.vue";
import WDialog from "../../common/WDialog.vue";
import WAvatar from "@/views/wflow/common/WAvatar.vue";
import {Loading} from "@element-plus/icons-vue";
import {getProcGroupItemsList} from "@/api/model.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {
  getWorkHandoverList, createWorkHandover,
  activateWorkHandover, deleteWorkHandover, retryWorkHandover
} from "@/api/workHandover.js";
import {ref, reactive, onMounted, onUnmounted} from "vue";

const tbCellStyle = {
  background: 'var(--el-fill-color-lighter)',
  padding: '10px 0',
  color: 'var(--el-text-color-regular)'
}

const loading = ref(false)
const handoverDialog = ref(false)
const formRef = ref(null)
const procModels = {}
let pollingTimer = null

const dataParams = reactive({pageNo: 1, pageSize: 10, all: true})
const handoverDataList = ref({records: [], total: 0, pages: 0})
const handoverData = reactive({source: [], target: [], scope: [], isAll: false, reason: ''})
const groupItems = ref([])

onMounted(() => {
  getHandoverList()
  loadGroupItems()
})
onUnmounted(() => stopPolling())

const startPolling = () => {
  if (pollingTimer) return
  pollingTimer = setInterval(() => {
    const hasRunning = handoverDataList.value.records.some(r => r.status === 1)
    if (hasRunning) {
      getHandoverList(true)
    } else {
      stopPolling()
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

const loadGroupItems = () => {
  getProcGroupItemsList().then(res => {
    groupItems.value = res.data.filter(g => g.items.length > 0).map(group => ({
      value: group.id,
      label: group.name,
      children: group.items.map(it => {
        procModels[it.code] = it.procName
        return {value: it.code, label: it.procName}
      })
    }))
  }).catch(err => ElMessage.error(err.msg))
}

const getHandoverRange = (scope) => {
  if (!scope) return '全部流程'
  return scope.map(s => procModels[s] || s).join('、')
}

const getHandoverList = (silent = false) => {
  if (!silent) loading.value = true
  getWorkHandoverList(dataParams).then(res => {
    handoverDataList.value = res.data
    if (res.data.records.some(r => r.status === 1)) startPolling()
  }).finally(() => {
    if (!silent) loading.value = false
  })
}

const addHandover = () => {
  Object.assign(handoverData, {source: [], target: [], scope: [], isAll: false, reason: ''})
  handoverDialog.value = true
}

const confirmHandover = () => {
  formRef.value.validate(valid => {
    if (!valid) return
    createWorkHandover({
      source: handoverData.source[0],
      target: handoverData.target[0],
      scope: handoverData.isAll ? null : handoverData.scope,
      reason: handoverData.reason
    }).then(() => {
      ElMessage.success('创建工作交接记录成功')
      handoverDialog.value = false
      getHandoverList()
    })
  })
}

const activateHandover = (row) => {
  ElMessageBox.prompt('此操作将永久转移所有待办任务和流程权限，请输入"确认交接"以继续', '风险操作确认', {
    confirmButtonText: '确认生效',
    cancelButtonText: '取消',
    inputPattern: /^确认交接$/,
    inputErrorMessage: '请输入"确认交接"',
    type: 'warning',
    beforeClose: (action, instance, done) => {
      if (action !== 'confirm') return done()
      instance.confirmButtonLoading = true
      activateWorkHandover(row.id).then(() => {
        ElMessage.success('已开始执行工作交接')
        getHandoverList()
        startPolling()
        done()
      }).catch(err => {
        instance.confirmButtonLoading = false
        ElMessage.error(err.msg || err)
      })
    }
  }).catch(() => {})
}

const retryHandover = (row) => {
  ElMessageBox.confirm(
      `确认重新执行交接任务？将重试 ${row.failedModels?.length || 0} 个失败的流程模型`,
      '确认重试', {type: 'warning'}
  ).then(() => {
    retryWorkHandover(row.id).then(() => {
      ElMessage.success('已开始重新执行交接任务')
      getHandoverList()
      startPolling()
    }).catch(err => {
      ElMessage.error(err.msg || err)
    })
  }).catch(() => {})
}

const deleteHandover = (id) => {
  ElMessageBox.confirm('确认删除该工作交接记录？', '提示', {type: 'warning'}).then(() => {
    deleteWorkHandover(id).then(() => {
      ElMessage.success('删除成功')
      getHandoverList()
    }).catch(err => {
      ElMessage.error(err.msg || err)
    })
  }).catch(() => {})
}

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped lang="less">
.w-flex-col-ct {
  display: flex;
  align-items: center;
}
</style>
