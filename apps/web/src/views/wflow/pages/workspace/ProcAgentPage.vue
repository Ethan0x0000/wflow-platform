<template>
  <div>
    <el-space class="w-card-sm" style="width: calc(100% - 20px);">
      <w-bright-block show-icon type="primary" content="设置审批代理人，让其他人临时代替我们来处理流程"/>
      <el-button icon="Plus" type="primary" @click="addAgent()">新增代理规则</el-button>
      <el-button icon="Search" type="primary" @click="getAgentList()">查询</el-button>
    </el-space>
    <div class="w-card-sm" style="margin-top: 10px" v-loading="loading">
      <el-table :data="agentDataList.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column prop="target" label="代理人">
          <template #default="scope">
            <w-avatar :id="scope.row.target.id" :name="scope.row.target.name" :src="scope.row.target.avatar"/>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="scope" label="代理的流程范围">
          <template #default="scope">
            {{getAgentRange(scope.row.scope)}}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.statusType">{{scope.row.statusText}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="reason" label="代理原因"/>
        <el-table-column show-overflow-tooltip prop="timeRange" label="代理时间范围">
          <template #default="scope">
            {{scope.row.timeRange.join(' ~ ')}}
          </template>
        </el-table-column>
        <el-table-column width="200" label="操作">
          <template #default="scope">
            <el-button type="primary" icon="Edit" link @click="updateAgent(scope.row)">编辑</el-button>
            <el-button type="danger" icon="Delete" link @click="deleteAgent(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 20px; display: flex; justify-content: right">
        <el-pagination v-model:current-page="dataParams.pageNo"
                       v-model:page-size="dataParams.pageSize"
                       :page-sizes="[10, 20, 50, 100]"
                       :disabled="agentDataList.pages === 0"
                       layout="total, sizes, prev, pager, next"
                       :total="agentDataList.total" background
                       @size-change="getAgentList"
                       @current-change="getAgentList"/>
      </div>
    </div>
    <w-dialog v-model="agentDialog" width="650" title="代理规则设置" @ok="confirmAgent()">
      <el-form ref="formRef" label-width="80px" :model="agentData">
        <el-form-item :rules="{type: 'array', required: true, message: '请选择谁来代理我', trigger: 'change'}"
                      error="选择谁来代理我" prop="target" label="代理对象">
          <w-org-plus-picker v-model="agentData.target" type="user" :excludes="[loginUser]"
                             placeholder="谁来代理我" @change="formRef.validateField('target')"/>
        </el-form-item>
        <el-form-item :rules="{type: 'array', required: !agentData.isAll, message: '请选择代理范围'}"
                      prop="scope" label="代理范围">
          <div class="w-flex-col-ct" style="width: 100%;">
            <el-checkbox label="所有流程" v-model="agentData.isAll"
                         @change="v => agentData.scope = agentData.isAll ? null : v"/>
            <el-divider direction="vertical"/>
            <el-cascader clearable :show-all-levels="false" :options="groupItems"
                         :props="{emitPath: false, multiple: true}" placeholder="需要代理的流程"
                         v-if="!agentData.isAll" style="width: calc(100% - 100px)" v-model="agentData.scope"/>
            <w-bright-block v-else show-icon type="warning" content="将会覆盖有效范围内的其他流程设置"/>
          </div>
        </el-form-item>
        <el-form-item :rules="{type: 'array', required: true, message: '请设置代理时间段'}"
                      prop="timeRange" label="代理时间">
          <el-date-picker v-model="agentData.timeRange" type="datetimerange"
                          range-separator="至" value-format="YYYY-MM-DD HH:mm:ss"
                          start-placeholder="代理开始时间" :disabled-date="disableDate"
                          end-placeholder="代理结束时间"
          />
        </el-form-item>
        <el-form-item prop="reason" label="代理原因">
          <el-input v-model="agentData.reason" show-word-limit
                    maxlength="50" type="textarea" placeholder="请输入代理原因"/>
        </el-form-item>
      </el-form>
    </w-dialog>
  </div>
</template>

<script setup>
import WOrgPlusPicker from "../../common/WOrgPlusPicker.vue";
import WBrightBlock from "../../common/WBrightBlock.vue";
import WDialog from "../../common/WDialog.vue";
import {getProcGroupItemsList} from "@/api/model.js";
import {dayjs, ElMessage, ElMessageBox} from "element-plus";
import {addAgentRule, deleteAgentRule, getAgentRulePage, updateAgentRule} from "@/api/handover.js";
import WAvatar from "@/views/wflow/common/WAvatar.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {deepCopy} from "@/utils/GlobalFunc.js";

const {loginUser} = useWflowStore()

const tbCellStyle = {
  background: 'var(--el-fill-color-lighter)',
  padding: '10px 0',
}
let isAdd = true
const formRef = ref();
const loading = ref(false);
const agentDialog = ref(false);
const agentData = ref({
  target: [],
  reason: '',
  scope: [],
  isAll: true,
  timeRange: []
})
const now = new Date()
now.setHours(0, 0, 0, 0)
const groupItems = ref([])
const procModels = {}

const dataParams = ref({
  pageNo: 1,
  pageSize: 10
})
const agentDataList = ref({
  pages: 0,
  total: 0,
  records: []
})

function disableDate(time) {
  return time.getTime() < now - 86400000
}

onMounted(() => {
  loading.value = true
  loadModels().finally(() => getAgentList())
})

function loadModels() {
  return getProcGroupItemsList().then(res => {
    groupItems.value = res.data.filter(g => g.items.length > 0).map(group => {
      return {
        value: group.id,
        label: group.name,
        children: group.items.map(it => {
          procModels[it.code] = it.procName
          return {
            value: it.code,
            label: it.procName,
          }
        })
      }
    })
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function getAgentRange(scope) {
  if (!scope) return '全部流程'
  return scope?.map(s => procModels[s]).join('、')
}

function getAgentList() {
  loading.value = true
  getAgentRulePage(dataParams.value).then(res => {
    agentDataList.value = res.data
    loading.value = false
    //赋予状态
    const current = dayjs();
    agentDataList.value.records.forEach(agent => {
      const startTime = dayjs(agent.timeRange[0])
      const endTime = dayjs(agent.timeRange[1])
      if (current.isBefore(startTime)) {
        agent.statusType = 'warning'
        agent.statusText = '待生效'
      } else if (current.isAfter(endTime)) {
        agent.statusType = 'info'
        agent.statusText = '已失效'
      } else {
        agent.statusType = 'primary'
        agent.statusText = '生效中'
      }
    })
  }).catch(err => {
    loading.value = false
  })
}

function addAgent() {
  agentDialog.value = true
  isAdd = true
  agentData.value = {
    target: [],
    reason: '',
    scope: [],
    isAll: true,
    timeRange: []
  }
}

function updateAgent(agent) {
  isAdd = false
  agentData.value = deepCopy(agent)
  agentData.value.target = [agentData.value.target]
  agentData.value.isAll = !Array.isArray(agent.scope)
  agentDialog.value = true
  nextTick(() => formRef.value.validate())
}

function deleteAgent(id) {
  ElMessageBox.confirm('确定要删除该代理规则吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteAgentRule(id).then(res => {
      ElMessage.success(res.data)
      getAgentList()
    }).catch(err => ElMessage.error(err.msg))
  })
}

function confirmAgent() {
  formRef.value.validate().then(() => {
    const params = Object.assign({}, agentData.value)
    params.target = params.target[0]
    const request = isAdd ? addAgentRule(params) : updateAgentRule(params)
    request.then(res => {
      agentDialog.value = false
      ElMessage.success(res.data)
      getAgentList()
    }).catch(err => ElMessage.error(err.msg))
  })
}

</script>

<style scoped lang="less">
.w-agent-item {
  padding: 5px;
  margin: 5px 0;
  border-radius: 5px;
  background-color: var(--el-bg-color-page);
}
</style>
