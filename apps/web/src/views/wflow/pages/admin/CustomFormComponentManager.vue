<script setup>
import {disableFromCp, getFormByType, getFormCps, publishFromCp, saveFromCp} from "@/api/form.js";
import {ElMessage} from "element-plus";
import WDialog from "../../common/WDialog.vue";
import ComponentDev from "../../common/dynamic/ComponentDev.vue";
import valueType from "../../design/form/ValueType.js";
import WIconSelect from "../../common/WIconSelect.vue";
const ComponentRender = defineAsyncComponent(() => import("../../common/dynamic/ComponentRender.vue"));

const params = reactive({
  pageSize: 10,
  pageNo: 1,
  name: null,
  active: null
})

const tbCellStyle = {
  background: 'var(--el-fill-color-darker)',
  padding: '10px 0',
}

const components = ref({
  total: 0,
  pages: 0,
  records: []
})
//组件表单信息
const component = ref({
  name: null,
  valueType: null,
  icon: '',
  sfc: '',
  configSfc: ''
})

const rules = {
  name: [
    {required: true, message: '请输入组件名称', trigger: 'blur'},
    {min: 3, max: 255, message: '长度必须大于3', trigger: 'blur'},
  ],
  valueType: {required: true, message: '请选择组件值类型', trigger: 'blur'},
  icon: {required: true, message: '请选择组件图标', trigger: 'change'},
  sfc: {required: true, message: '请设置组件代码', trigger: 'blur'}
}

const loading = ref(false)
const submitLoading = ref(false)
const createCpVisible = ref(false)
const sfcVisible = ref(false)
const pcMode = ref(true)
const showMb = ref(true)
const createForm = ref()
const codeTemp = ref({pc: null, mb: null})
const configTemp = ref()
const codeType = ref('sfc')

//组件渲染预览
const cpView = reactive({
  cpSfc: '',
  configSfc: '',
  viewVisible: false,
  tempVal: null,
  key: null,
  name: null,
  type: 'CustomComponent',
  valueType: null,
  props: {}
})

const codeVal = computed({
  get() {
    return codeType.value === 'sfc' ?
        codeTemp.value?.[pcMode.value ? 'pc' : 'mb']
        : configTemp.value
  },
  set(val) {
    if (codeType.value === 'sfc')
      codeTemp.value[pcMode.value ? 'pc' : 'mb'] = val
    else configTemp.value = val
  }
})

function getDataList() {
  loading.value = true
  getFormCps(params).then(res => {
    loading.value = false
    components.value = res.data
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function createCp() {
  createCpVisible.value = true
  nextTick(() => {
    createForm.value.resetFields()
  })
}

function openEditor(key) {
  pcMode.value = true
  codeType.value = key
  if (key === 'sfc') {
    //兼容之前的方式
    try {
      component.value.sfc = JSON.parse(component.value.sfc)
    } catch (e) {}
    if (typeof(component.value.sfc) === 'string') {
      codeTemp.value.pc = component.value.sfc
      codeTemp.value.mb = null
    } else {
      codeTemp.value.pc = component.value.sfc?.pc
      codeTemp.value.mb = component.value.sfc?.mb
    }
  } else {
    showMb.value = false
    configTemp.value = component.value.configSfc
  }
  sfcVisible.value = true
}

function submit() {
  submitLoading.value = true
  createForm.value.validate().then(() => {
    const data = Object.assign({}, component.value)
    data.sfc = data.sfc?.pc ? JSON.stringify(data.sfc) : data.sfc
    saveFromCp(data).then(res => {
      submitLoading.value = false
      createCpVisible.value = false
      ElMessage.success('保存成功')
      getDataList()
    }).catch(err => {
      submitLoading.value = false
      ElMessage.error(err.msg)
    })
  }).catch(() => {
    ElMessage.warning('请完成数据填写')
    submitLoading.value = false
  })
}

function getCpDetail(row, call) {
  getFormByType(row.type).then(res => {
    call(res.data)
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function edit(row) {
  getCpDetail(row, data => {
    createCpVisible.value = true
    nextTick(() => {
      component.value = data
    })
  })
}

function disable(row) {
  getCpDetail(row, data => {
    if (data.status === 1) {
      disableFromCp(data.id).then(() => {
        ElMessage.success('停用成功')
        getDataList()
      })
    } else {
      ElMessage.warning('数据不一致，请刷新页面')
    }
  })
}

function publish(row) {
  getCpDetail(row, data => {
    if (data.status === 0) {
      publishFromCp(data.id).then(() => {
        ElMessage.success('发布成功')
        getDataList()
      })
    } else {
      ElMessage.warning('数据不一致，请刷新页面')
    }
  })
}

function preview (row){
  cpView.viewVisible = true
  getCpDetail(row, data => {
    try {
      data.sfc = JSON.parse(data.sfc)
      cpView.cpSfc = data.sfc.pc
    } catch (e) {
      cpView.cpSfc = data.sfc
    }
    cpView.valueType = data.valueType
    cpView.key = data.key
    cpView.name = data.name
    cpView.props = {}
    cpView.configSfc = data.configSfc
  })
}

function confirmCode() {
  component.value[codeType.value] = codeType.value === 'sfc' ? codeTemp.value : codeVal.value
  sfcVisible.value = false
}

onMounted(getDataList)
</script>

<template>
  <div>
    <el-space class="w-card" style="width: 100%;">
      <el-button type="primary" icon="Plus" @click="createCp" plain>创建组件</el-button>
      <el-input prefix-icon="Search" clearable style="width: 250px;" v-model="params.name" placeholder="搜索组件名称"></el-input>
      <el-select style="width: 150px;" clearable default-first-option v-model="params.active" placeholder="选择组件状态">
        <el-option label="已发布的" :value="true"/>
        <el-option label="已停用的" :value="false"/>
      </el-select>
      <el-button type="primary" icon="Search" @click="getDataList">查询</el-button>
    </el-space>
    <div style="margin-top: 10px" v-loading="loading">
      <el-table :data="components.records" :cell-style="{padding: '10px 0'}" :header-cell-style="tbCellStyle">
        <el-table-column prop="name" label="组件名称"></el-table-column>
        <el-table-column show-overflow-tooltip prop="type" label="类型标识"></el-table-column>
        <el-table-column prop="valueType" width="100" label="值类型"></el-table-column>
        <el-table-column prop="icon" width="80" label="图标">
          <template #default="scope">
            <iconify :icon="scope.row.icon"/>
          </template>
        </el-table-column>
        <el-table-column prop="version" width="100" label="当前版本">
          <template #default="scope">
            <el-tag type="primary">V{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="状态">
          <template #default="scope">
            <el-tag type="primary" v-if="scope.row.status === 1">已发布</el-tag>
            <el-tag type="info" v-else-if="scope.row.status === 0">已停用</el-tag>
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip prop="createTime" label="创建时间"></el-table-column>
        <el-table-column fixed="right" width="220" label="操作">
          <template #default="scope">
            <el-button type="primary" link icon="View" @click="preview(scope.row)">预览</el-button>
            <el-button type="primary" link icon="Edit" @click="edit(scope.row)">编辑</el-button>
            <el-button type="primary" link icon="Promotion" v-if="scope.row.status === 0" @click="publish(scope.row)">
              发布
            </el-button>
            <el-button type="info" link icon="Remove" v-else-if="scope.row.status === 1" @click="disable(scope.row)">
              停用
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; display: flex; justify-content: right">
        <el-pagination v-model:current-page="params.pageNo"
                       v-model:page-size="params.pageSize"
                       :page-sizes="[10, 20, 50, 100]"
                       :disabled="components.pages === 0"
                       layout="total, sizes, prev, pager, next"
                       :total="components.total" background
                       @size-change="getDataList"
                       @current-change="getDataList"/>
      </div>

      <w-dialog width="500" title="创建自定义表单组件" v-model="createCpVisible" :ok-loading="submitLoading"
                @ok="submit">
        <el-form :rules="rules" ref="createForm" :model="component" label-width="80">
          <el-form-item prop="name" label="组件名称" required>
            <el-input clearable v-model="component.name" placeholder="输入组件名称"/>
          </el-form-item>
          <el-form-item prop="valueType" label="值类型" required>
            <el-select v-model="component.valueType" placeholder="请选择组件值类型">
              <el-option v-for="type in valueType" :label="type" :value="type"/>
            </el-select>
          </el-form-item>
          <el-form-item prop="icon" label="图标" required>
            <el-input clearable v-model="component.icon" placeholder="点击右侧按钮，选择组件图标">
              <template #append>
                <el-popover placement="bottom" title="选择图标" :width="400" trigger="click">
                  <template #reference>
                    <el-button icon="Pointer"/>
                  </template>
                  <w-icon-select v-model="component.icon"/>
                </el-popover>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="sfc" label="设计组件" required>
            <el-button icon="Edit" @click="openEditor('sfc')">编写组件</el-button>
            <el-text truncated size="small">{{ component.sfc }}</el-text>
          </el-form-item>
          <el-form-item prop="configSfc" label="组件配置">
            <el-button icon="Edit" @click="openEditor('configSfc')">编写组件配置面板</el-button>
            <el-text truncated size="small">{{ component.configSfc }}</el-text>
          </el-form-item>
        </el-form>
      </w-dialog>

      <w-dialog close-free title="编写Vue-SFC代码" v-model="sfcVisible" fullscreen @ok="confirmCode">
        <component-dev :show-mobile="showMb" v-model:mode="pcMode" ref="codeDev" v-model="codeVal"/>
      </w-dialog>
    </div>

    <w-dialog close-free title="预览组件" :show-ok="false" cancel-text="关闭" v-model="cpView.viewVisible">
      <el-divider>组件预览效果</el-divider>
      <component-render :props="cpView" style="padding: 10px" v-model="cpView.tempVal" :sfc="cpView.cpSfc"/>
      <template v-if="(cpView.configSfc || '').length > 0">
        <el-divider>组件配置面板预览效果</el-divider>
        <component-render :props="cpView" style="padding: 10px" v-model="cpView.props" :sfc="cpView.configSfc"/>
      </template>
    </w-dialog>
  </div>
</template>

<style scoped lang="less">

</style>
