<script setup>
import {
  copyModel,
  createProcGroup, deleteModel,
  delProcGroup, enableModel, getProcActiveModel,
  getProcGroupItems, saveModel, updateGroupModelSort,
  updateGroupName,
  updateGroupSort
} from "@/api/model.js";
import {VueDraggable} from "vue-draggable-plus";
import {ElMessage, ElMessageBox} from "element-plus";
import {$debounce, getResPrefix, isEmpty} from "@/utils/GlobalFunc.js";
import {exportText} from "@/utils/ProcessUtil.js";

const search = ref()
const fileInput = ref()
const inputGroup = ref()
const loading = ref(false)
const modelGroupList = ref([])
const startSort = ref(false)
const dataGroups = ref([])

//const doSearch = $debounce(getModelGroupList, 1000)
const dragDisable = computed(() => !isEmpty(search.value))

onMounted(() => getModelGroupList())
const _loadDataGroups = $debounce(loadDataGroups, 800)

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

function getModelGroupList() {
  loading.value = true
  getProcGroupItems().then(res => {
    loading.value = false
    modelGroupList.value = res.data.map(group => {
      group.items.forEach(v => {
        v.logo = JSON.parse(v.logo)
        v.startupPerm = JSON.parse(v.startupPerm)
        v.startupPerm = resolveStartupPerm(v)
        v.adminPerm = resolveAdminPerm(v)
      })
      return group
    })
    dataGroups.value = modelGroupList.value
    _loadDataGroups()
  }).catch(err => loading.value = false)
}

function importProcJson(group) {
  inputGroup.value = group.id
  fileInput.value.click()
}

function addOrEditGroup(group) {
  ElMessageBox.prompt('请输入分组名称并提交', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPattern: /^[\s\S]{2,30}$/,
    inputValue: group.name,
    inputPlaceholder: "请输入分组名称",
    inputErrorMessage: '字符长度为2~30',
  }).then(({value}) => {
    (group.id ? updateGroupName(group.id, value) : createProcGroup(value)).then(res => {
      ElMessage.success(res.data)
      getModelGroupList()
    }).catch(err => ElMessage.error(err.msg))
  })
}

function doGroupSort(){
  loading.value = true
  updateGroupSort(dataGroups.value.map(v => v.id)).then(res => {
    getModelGroupList()
    ElMessage.success(res.data)
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function groupSort(){
  startSort.value = !startSort.value
  if (!startSort.value){
    doGroupSort()
  }
}

function delGroup(group) {
  ElMessageBox.confirm('您确认要删除该分组吗', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消'
  }).then(() => {
    loading.value = true
    delProcGroup(group.id).then(res => {
      getModelGroupList()
      ElMessage.success(res.data)
    }).catch(err => {
      loading.value = false
      ElMessage.error(err.msg)
    })
  })
}

function designModel(code, groupId) {
  sessionStorage.removeItem('designCode')
  const prefix = getResPrefix()
  if (code){
    //编辑已有流程
    window.open(`${prefix}/designer?code=${code}`, '_blank')
  } else {
    //新增指定分组
    window.open(`${prefix}/designer?${groupId ? 'groupId=' + groupId : ''}`, '_blank')
  }
}

function activeModel(model) {
  const action = model.status === 1 ? '停用':'启用'
  ElMessageBox.confirm(`您确认要${action} [${model.procName}] 吗？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    enableModel(model.status !== 1, model.code).then(res => {
      ElMessage.success(res.data)
      getModelGroupList()
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  })
}

function delProcModel(model) {
  ElMessageBox.prompt(`删除该流程将会连带删除系统内所有相关数据，如果您已知晓该风险需要继续操作
  ，请输入验证语 [删除${model.procName}]`, '风险操作二次确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '我再想想',
    type: "warning",
    inputValidator: v => {
      if(v !== `删除${model.procName}`) return '请正确输入提示语'
      return true
    },
    inputPlaceholder: `输入： 删除${model.procName}`
  }).then(({value}) => {
    deleteModel(model.code).then(res => {
      ElMessage.success(res.data)
      getModelGroupList()
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  })
}

//解析发起权限描述
function resolveStartupPerm(model) {
  const desc = '全员'
  switch (model.startupRange) {
    case "RANGE":
      return model.startupPerm.map(v => v.name).join('、') || desc
    case "NONE":
      return '全员禁止'
    default:
      return desc
  }
}

function resolveAdminPerm(model) {
  const rules = JSON.parse(model.adminPerm || '[]')
  return rules.map(v => v.name).join('、')
}

function copy(model) {
  ElMessageBox.prompt('请输入新的模型名称', '复制模型', {
    type: 'info',
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPattern: /^[\s\S]{2,30}$/,
    inputPlaceholder: "请输入模型名称",
    inputErrorMessage: '字符长度为2~30',
  }).then(({value}) => {
    copyModel(model.code, value).then(res => {
      ElMessage.success(res.data)
      getModelGroupList()
    }).catch(err => {
      ElMessage.error(err.msg || err)
    })
  })
}

function sortEnd(group) {
  updateGroupModelSort(group.id, group.items.map(v => v.code)).then(res => {
    ElMessage.success("排序成功")
  }).catch(err => {
    ElMessage.error(err.msg || err)
  })
}

function exportProcModel(app) {
  getProcActiveModel(app.code).then(res => {
    res.data.defineId = null
    res.data.deployId = null
    res.data.version = 1
    exportText(JSON.stringify(res.data), `${res.data.procName}-v${app.version}.json`)
  })
}

function configOnload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      //清除code，新增数据
      jsonData.code = null
      jsonData.id = null
      jsonData.groupId = inputGroup.value
      saveModel(jsonData).then(() => {
        fileInput.value.value = null
        ElMessage.success("导入流程成功")
        getModelGroupList()
      }).catch(err => {
        ElMessage.error(err.msg)
      })
    } catch (error) {
      ElMessage.warning("解析流程json文件失败")
    }
  };
  reader.readAsText(file);
}

watch(search, _loadDataGroups)
</script>

<template>
  <div v-loading="loading">
    <input style="display: none" @change="configOnload" type="file" ref="fileInput" accept=".json">
    <div class="w-pm-header">
      <el-input style="width: 250px;" clearable v-model.trim="search" prefix-icon="search"
                :placeholder="$t('design.modelMg.search')"/>
      <div>
        <el-button :icon="startSort ? 'Finished' : 'Sort'" :type="startSort ? 'warning' : 'default'"
                   @click="groupSort" :disabled="dragDisable">
          {{ startSort ? $t('design.modelMg.endSort') : $t('design.modelMg.sort') }}
        </el-button>
        <el-button icon="plus" type="primary" @click="designModel()">{{ $t('design.modelMg.newModel') }}</el-button>
        <el-button icon="plus" @click="addOrEditGroup">{{ $t('design.modelMg.newGroup') }}</el-button>
      </div>
    </div>
    <el-empty v-if="dataGroups.length === 0"></el-empty>
    <vue-draggable class="w-pm-groups" v-model="dataGroups" :animation="150" :disabled="!startSort || dragDisable"
                   handle=".w-pm-drag" v-else>
      <div class="w-card" :style="{padding: startSort ? '0 20px':'0 20px 20px 20px'}" :key="group.id"
           v-for="group in dataGroups">
        <div class="w-pm-group-header">
          <iconify v-if="startSort" style="margin-right: 10px; cursor: grab" class="w-pm-drag" icon="ci:drag-vertical"/>
          <el-text style="flex: 1" size="large">{{ group.name }}</el-text>
          <div>
            <el-button link icon="BottomRight" @click="importProcJson(group)">导入</el-button>
            <el-button link icon="edit" @click="addOrEditGroup(group)">编辑</el-button>
            <el-button link icon="delete" @click="delGroup(group)">删除</el-button>
          </div>
        </div>
        <div v-show="!startSort">
          <div class="w-pm-group-empty" v-if="group.items.length === 0">
            <el-button type="primary" icon="plus" text @click="designModel(null, group.id)">{{ $t('design.modelMg.newModel') }}</el-button>
          </div>
          <vue-draggable v-else class="w-pm-group-content" :disabled="dragDisable" handle=".w-pm-drag" v-model="group.items" :animation="150" @end="sortEnd(group)">
            <el-row :class="{'w-pm-group-app': true, 'w-pm-disable': app.status !== 1}" v-for="app in group.items">
              <el-col :span="6" class="w-flex-col-ct">
                <div class="w-pm-drag">
                  <iconify icon="ci:drag-vertical"/>
                </div>
                <div>
                  <iconify class="w-process-icon" color="#ffffff" :style="{background: app.logo.bgc}" :icon="app.logo.name"/>
                </div>
                <div style="width: calc(100% - 80px);">
                  <el-text class="w-app-name" truncated>{{ app.procName }}</el-text>
                  <el-text style="display: block; color: var(--el-text-color-secondary)" size="small" truncated>
                    {{ app.remark }}
                  </el-text>
                </div>

              </el-col>
              <el-col :span="2">
                <el-badge is-dot :hidden="!app.hasNewVersion">
                  <el-tag :type="!app.defineId || app.status !== 1 ? 'info' : 'primary'" size="small">v{{app.version}}</el-tag>
                </el-badge>

              </el-col>
              <el-col :span="9">
                <el-text style="display: block" truncated size="small">{{ $t('design.modelMg.update') }}: {{ app.updateTime }}</el-text>
                <el-text truncated size="small">{{ $t('design.modelMg.range') }}: {{app.startupPerm}}</el-text>
              </el-col>
              <el-col :span="6" class="w-flex-col-ct">
                <template v-if="app.hasManagePerm">
                  <el-button link icon="edit" type="primary" @click="designModel(app.code)">{{ $t('design.modelMg.edit') }}
                  </el-button>
                  <el-button link :icon="app.status === 1 ? 'Remove' : 'CircleCheck'" :type="app.status === 1 ? 'warning' : 'primary'" @click="activeModel(app)">
                    {{ $t(`design.modelMg.${app.status === 1 ? 'disable' : 'enable'}`) }}
                  </el-button>
                  <el-dropdown>
                    <el-button style="margin-left: 5px" link icon="more">更多</el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="copy(app)">
                          <el-icon><CopyDocument/></el-icon>
                          {{ $t('design.modelMg.copy') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="exportProcModel(app)">
                          <el-icon><TopLeft/></el-icon>
                          {{ $t('design.modelMg.export') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="delProcModel(app)">
                          <el-icon><Delete/></el-icon>
                          {{ $t('design.modelMg.del') }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
               <div class="w-flex-col-ct" style="width: 100%;" v-else>
                 <el-button link icon="TopLeft" @click="exportProcModel(app)">
                   {{ $t('design.modelMg.export') }}
                 </el-button>
                 <el-divider direction="vertical"/>
                 <el-text truncated line-clamp="2">仅[{{ app.adminPerm }}]可编辑</el-text>
               </div>
              </el-col>
            </el-row>
          </vue-draggable>
        </div>
      </div>
    </vue-draggable>
  </div>

</template>

<style scoped lang="less">
.w-pm-header {
  display: flex;
  justify-content: space-between;
}

.w-pm-disable {
  background-color: var(--el-fill-color-light) !important;
}

.w-pm-groups {

  & > div {
    padding-top: 0;
    margin: 10px 0;
  }

  .w-pm-group-empty {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .w-pm-group-header {
    padding: 10px 0;
    display: flex;
    align-items: center;
  }

  .w-pm-group-content {
    padding: 2px;
    border-radius: 5px;
    background-color: var(--el-bg-color-page);

    .w-pm-group-app {
      margin-top: 2px;
      padding: 8px;
      display: flex;
      justify-content: space-between;
      border-radius: 5px;
      align-items: center;
      background-color: var(--el-bg-color);

      .w-app-name {

      }

      .w-pm-drag {
        cursor: grab;
      }
      .w-process-icon {
        margin: 0 10px;
      }
    }

    .w-pm-group-app:first-child {
      margin-top: 0;
    }
  }
}
</style>
