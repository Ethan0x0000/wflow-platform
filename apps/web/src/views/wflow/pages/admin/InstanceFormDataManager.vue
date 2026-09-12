<script setup>
import {getModelFormFields, getProcGroupItemsList} from "@/api/model.js";
import {exportInstWithFormByCode, getInstWithFormByCode} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import WAvatar from "../../common/WAvatar.vue";
import {$debounce, ajaxDownload, getRes, isEmpty} from "@/utils/GlobalFunc.js";
import ValueType from "../../design/form/ValueType.js";
import WDialog from "../../common/WDialog.vue";
import {sanitizeHtml} from "@/utils/html.ts";

const datas = ref({
  records: [],
  pages: 0,
  total: 0
})
const actives = ref([])
const modelGroupList = ref([])
const activeModel = ref()
const tbCellStyle = {
  background: 'var(--el-fill-color-lighter)',
  padding: '10px 0',
}
const fieldMap = new Map()
const modelFields = ref([])
const dataGroups = ref([])
const search = ref(null)
const loading = ref(false)
const params = reactive({
  pageSize: 10,
  pageNo: 1,
  status: null,
  code: null,
  title: null,
  fieldKey: null,
  fieldValue: null,
  compare: null,
  startRange: [],
  endRange: [],
})

const compares = [
  {label: '模糊匹配', value: 'LIKE'},
  {label: '等于', value: 'EQ'},
  {label: '不等于', value: 'NEQ'},
  {label: '大于', value: 'GT'},
  {label: '大于等于', value: 'GE'},
  {label: '小于', value: 'LT'},
  {label: '小于等于', value: 'LE'}
]

const fieldDetail = reactive({
  dialog: false,
  field: {},
  value: null
})

onMounted(() => getModelGroupList())
const _loadDataGroups = $debounce(loadDataGroups, 800)

function getModelGroupList() {
  getProcGroupItemsList().then(res => {
    modelGroupList.value = res.data.filter(v => v.items.length > 0).map(group => {
      group.items.forEach(v => v.logo = JSON.parse(v.logo))
      return group
    })
    dataGroups.value = modelGroupList.value
    _loadDataGroups()
  })
}

function loadDataGroups() {
  if (isEmpty(search.value)){
    dataGroups.value = modelGroupList.value
  } else {
    dataGroups.value = modelGroupList.value.map(obj => {
      const filteredItems = obj.items.filter(item =>
          item.procName.includes(search.value)
      );
      return { ...obj, items: filteredItems };
    }).filter(obj => obj.items.length > 0);
  }
}

function getInstFormList() {
  if (!activeModel.value) {
    ElMessage.warning('请先在左侧指定流程类型')
    return
  }
  loading.value = true
  params.code = activeModel.value
  const _params = Object.assign({}, params)
  _params.startRange = _params.startRange ? String(_params.startRange) : []
  _params.endRange = _params.endRange ? String(_params.endRange) : []
  getInstWithFormByCode(_params).then(res => {
    loading.value = false
    datas.value = res.data
    //把字段转对象
    datas.value.records.forEach(v => {
      if (Array.isArray(v.fieldData)) {
        const obj = {};
        (v.fieldData || []).forEach(field => {
          obj[field.key] = field
        })
        v.fieldData = obj
      } else {
        Object.keys(v.fieldData).forEach(key => {
          v.fieldData[key] = {
            key,
            value: v.fieldData[key]
          }
        })
      }
    })
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function getFormFields(call) {
  getModelFormFields(activeModel.value).then(rsp => {
    modelFields.value.length = 0
    const subFields = []
    fieldMap.clear()
    rsp.data.forEach(v => {
      if (v.valueType === ValueType.none) return;
      if (v.parent) subFields.push(v)
      else {
        modelFields.value.push(v)
        fieldMap.set(v.key, v)
      }
    })
    subFields.forEach(v => {
      const parent = fieldMap.get(v.parent.key)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(v)
      }
    })
    if(call) call()
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function getFieldValue(field, val) {
  switch (field.valueType) {
    case ValueType.option:
      return val?.label
    case ValueType.options:
      return (val || []).map(v => v.label).join('、')
    case ValueType.timeRange:
    case ValueType.dateTimeRange:
      return Array.isArray(val) ? `${val[0]} ~ ${val[1]}` : ''
    case ValueType.orgArray:
      return (val || []).map(v => v.name).join('、')
    case ValueType.org:
      return val?.name
    case ValueType.array:
      return Array.isArray(val) ? val.join('、') : (val || '')
    case ValueType.user:
      return val?.name
    case ValueType.image:
      return isEmpty(val) ? '' : `<img src="${val}" style="width: 50px; height: 50px; margin: 2px"/>`
    case ValueType.imageArray:
      return (val || []).map(v => `<img src="${getRes(v.url)}?zip=true" style="width: 50px; height: 50px; margin: 2px"/>`).join('')
    case ValueType.fileArray:
      return (val || []).map(v => `<a href="${getRes(v.url)}?download=true" style="margin: 2px">${v.name}</a>`).join('')
    case ValueType.object:
      switch (field.type) {
        case 'PhoneNumber':
          return `+${val?.prefix} ${val?.number}`
      }
      return JSON.stringify(val)
    case ValueType.all:
      return parserAllTypeVal(field, val)
    default:
      return val
  }
}

function parserAllTypeVal(field, val) {
  return JSON.stringify(val)
}

function exportData(){
  if ((params.code || '') === ''){
    ElMessage.warning('请先在左侧选择流程')
    return
  }
  const _params = Object.assign({}, params)
  _params.startRange = _params.startRange ? String(_params.startRange) : []
  _params.endRange = _params.endRange ? String(_params.endRange) : []
  exportInstWithFormByCode(_params).then(rsp => {
    ajaxDownload(rsp)
    ElMessage.success('导出成功')
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function showDetail(field, value) {
  fieldDetail.field = field
  fieldDetail.value = value
  fieldDetail.dialog = true
}

watch(activeModel, () => {
  params.fieldKey = null
  params.fieldValue = null
  params.compare = null
  params.pageNo = 1
  getFormFields(() => {
    getInstFormList()
  })
})

watch(search, _loadDataGroups)
</script>

<template>
  <el-row class="w-card" :gutter="20">
    <el-col :span="4" style="border-right: 1px solid var(--el-border-color)">
      <el-input v-model="search" clearable prefix-icon="search" placeholder="搜索流程" style="padding-bottom: 10px"/>
      <el-scrollbar>
        <el-collapse v-model="actives">
          <el-collapse-item :key="group.id" v-for="group in dataGroups" :name="group.id">
            <template #title>
              <el-text truncated>{{ group.name }}</el-text>
            </template>
            <div class="w-group-apps">
              <el-text @click="activeModel = app.code" truncated :key="app.code"
                       v-for="app in group.items" :type="activeModel === app.code ? 'primary':''" tag="div">
                {{ app.procName }}
              </el-text>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-scrollbar>
    </el-col>
    <el-col :span="20" v-loading="loading">
      <el-space wrap class="w-form-data-operation">
        <el-button icon="Share" @click="exportData">导出数据</el-button>
        <el-select prefix-icon="Search" clearable v-model="params.status" style="width: 120px;" placeholder="流程状态">
          <el-option label="进行中" value="RUNNING"/>
          <el-option label="被驳回" value="REFUSE"/>
          <el-option label="已撤销" value="REVOKED"/>
          <el-option label="审批通过" value="PASS"/>
        </el-select>
        <el-input prefix-icon="Search" v-model="params.title" style="width: 250px;"
                  placeholder="搜索 发起人、流程类型"></el-input>
        <el-date-picker v-model="params.startRange" style="width: 300px;" type="daterange" start-placeholder="提交开始时间"
                        value-format="YYYY-MM-DD HH:mm" end-placeholder="提交结束时间"/>
        <el-date-picker v-model="params.endRange" style="width: 300px;" type="daterange" start-placeholder="完成开始时间"
                        value-format="YYYY-MM-DD HH:mm" end-placeholder="完成结束时间"/>
        <el-input clearable placeholder="输入搜索/比较值" v-model="params.fieldValue">
          <template #prepend>
            <el-select placeholder="选择字段" style="width: 120px;" v-model="params.fieldKey">
              <el-option :label="field.name" :value="field.key" v-for="field in modelFields" :key="field.key"/>
            </el-select>
          </template>
          <template #append>
            <el-select placeholder="判断关系" style="width: 100px;" v-model="params.compare">
              <el-option :label="cp.label" :value="cp.value" v-for="cp in compares" :key="cp.value"/>
            </el-select>
          </template>
        </el-input>
        <el-button type="primary" icon="Search" @click="getInstFormList">查询</el-button>
      </el-space>
      <el-scrollbar>
        <el-table border :data="datas.records" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
          <el-table-column min-width="100" prop="defineName" label="流程类型" ></el-table-column>
          <el-table-column show-overflow-tooltip prop="title" label="标题"></el-table-column>
          <el-table-column show-overflow-tooltip prop="instId" label="流水号"></el-table-column>
          <el-table-column :show-overflow-tooltip="field.valueType !== ValueType.imageArray" min-width="100" prop="fieldData"
                           :label="field.name" v-for="field in modelFields" :key="field.key">
            <template #default="scope">
              <el-button link icon="View" type="primary" v-if="field.children && (scope.row.fieldData[field.key] || {})?.value?.length > 0"
                         @click="showDetail(field, (scope.row.fieldData[field.key] || {}).value)">
                查看
              </el-button>
              <div style="display:flex;" v-else v-html="sanitizeHtml(getFieldValue(field, (scope.row.fieldData[field.key] || {}).value))"></div>
            </template>
          </el-table-column>
          <el-table-column width="120" prop="initiator" label="发起人">
            <template #default="scope">
              <w-avatar :id="scope.row.initiator.id" :name="scope.row.initiator.name" :src="scope.row.initiator.avatar" status="agent" :show-status="scope.row.isAgent"/>
            </template>
          </el-table-column>
          <el-table-column min-width="120" show-overflow-tooltip prop="startDept" label="发起部门"></el-table-column>
          <el-table-column prop="currentNodeName" min-width="100" label="当前节点"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag v-if="scope.row.status === 'RUNNING'" type="primary">进行中</el-tag>
              <el-tag v-else-if="scope.row.status === 'REFUSE'" type="danger">被驳回</el-tag>
              <el-tag v-else-if="scope.row.status === 'REVOKED'" type="info">已撤销</el-tag>
              <el-tag v-else-if="scope.row.status === 'PASS'" type="success">审批通过</el-tag>
            </template>
          </el-table-column>
          <el-table-column min-width="150" show-overflow-tooltip prop="createTime" label="提交时间"></el-table-column>
          <el-table-column min-width="150" show-overflow-tooltip prop="endTime" label="结束时间"></el-table-column>
        </el-table>
        <div style="margin-top: 20px; display: flex; justify-content: right">
          <el-pagination v-model:current-page="params.pageNo"
                         v-model:page-size="params.pageSize"
                         :page-sizes="[10, 20, 50, 100]"
                         :disabled="datas.pages === 0"
                         layout="total, sizes, prev, pager, next"
                         :total="datas.total" background
                         @size-change="getInstFormList"
                         @current-change="getInstFormList"/>
        </div>
      </el-scrollbar>
    </el-col>
    <w-dialog close-free :show-ok="false" :title="`${fieldDetail.field.name}：详情`" v-model="fieldDetail.dialog">
      <el-table border  :data="fieldDetail.value" :cell-style="{padding: '5px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column :label="field.name" :prop="field.key" v-for="field in fieldDetail.field.children" :key="field.key">
          <template #default="scope">
            <div v-html="sanitizeHtml(getFieldValue(field, scope.row[field.key]))"></div>
          </template>
        </el-table-column>
      </el-table>
    </w-dialog>
  </el-row>
</template>

<style scoped lang="less">
.w-form-data-operation {
  margin-bottom: 10px;
}

.w-group-apps {
  & > * {
    display: block;
    width: 100%;
    cursor: pointer;
    padding: 0 10px;
    border-radius: 5px;

    &:hover {
      background-color: var(--el-color-primary-light-9);
    }
  }
}
</style>
