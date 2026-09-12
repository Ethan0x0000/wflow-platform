<script setup>
import WDialog from "./WDialog.vue";
import orgApi from '@/api/org.js'
import {deepCopy, getResPrefix} from "@/utils/GlobalFunc.js";

const props = defineProps({
  title: {
    type: String,
    default: '请选择'
  },
  size: {
    default: 20
  },
  parentId: { //父级部门ID
    type: Number,
    default: 0
  },
  type: {
    type: [String, Array],
    default: 'org'
  },
  //选中的
  selected: {
    type: Array,
    default: () => {
      return []
    }
  },
  excludes:{ //需要排除禁用的选项，对象数组，根据id + type
    type: Array,
    default: () => {
      return []
    }
  },
  multiple: Boolean //是否多选
})

const _value = defineModel({
  type: Array,
  default: () => {
    return []
  }
})
defineExpose({open, close})
const emit = defineEmits(['ok'])

const loading = ref(false)
const showDialog = ref(false)
const currentType = ref(props.type || 'org')
//选中的对象
const _selected = ref([])
const orgData = ref([])
const search = ref(null)
const searchData = ref([])
//滚动保持
const orgListScrollRef = ref()
//上级的滚动距离及实时滚动距离
let beforeScrollVal, nowScroll = 0

//组织架构路径
const orgPath = ref([{id: props.parentId, name: ''}])
const isOrg = computed(() => currentType.value === 'org'
    || currentType.value === 'dept' || currentType.value === 'user')

const showSearch = computed(() => (search.value || '').trim() !== '')

//数据列表
const dataList = computed(() => showSearch.value ? searchData.value : orgData.value)

const indeterminate = computed(() => {
  return !selectAll.value && _selected.value.some(b => dataList.value.some(a => isSame(a, b)))
})

//全选处理
const selectAll = computed({
  get() {
    return dataList.value.every(b => _selected.value.some(a => isSame(a, b)))
  },
  set(val) {
    //找出合适的类型的没有的元素
    const arr = dataList.value.filter(d => {
      const has = !_selected.value.some(s => isSame(s, d))
      switch (currentType.value){
        case 'user': return has && d.type === 'user';
        case 'dept':
        case 'group':
        case 'role': return has && currentType.value === d.type;
      }
      return true
    })
    if (val){
      _selected.value.push(...arr)
    }else {
      //找出没有的元素
      _selected.value = arr
    }
  }
})

function hasType(type){
  if (Array.isArray(props.type)){
    return props.type.includes(type)
  }else {
    return type === props.type
  }
}

function isSame(a, b){
  return a && b && a.id == b.id && a.type === b.type
}

function open() {
  setTimeout(() => {
    if (Array.isArray(props.type)){
      currentType.value = props.type[0]
    } else {
      currentType.value = props.type
    }
    orgPath.value.length = 1
    search.value = null
    getOrgList(props.parentId)
    _selected.value = deepCopy(props.selected || [])
    showDialog.value = true
  }, 100)
}

function close() {
  showDialog.value = false
  //selected.value.length = 0
  orgPath.value.length = 1
}

function jumpDept(dept, i) {
  orgPath.value.length = i + 1
  return getOrgList(dept.id)
}

function toSubDept(dept) {
  getOrgList(dept.id, () => {
    orgPath.value.push(dept)
    nextTick(() => {
      //等dom渲染完成后进行滚动
      orgListScrollRef.value?.setScrollTop(0)
    })
  })
  //保存之前的滚动距离
  beforeScrollVal = nowScroll
}

function toParentDept() {
  jumpDept(orgPath.value[orgPath.value.length - 2], orgPath.value.length - 2).finally(() => {
    nextTick(() => {
      //等dom渲染完成后进行滚动
      orgListScrollRef.value?.setScrollTop(beforeScrollVal ? beforeScrollVal : 0)
    })
  })
}

function doSearch() {
  if (showSearch.value) {
    loading.value = true
    orgApi.searchOrgs(search.value).then(rsp => {
      loading.value = false
      searchData.value = rsp.data
      reloadStatus(searchData.value)
    }).catch(err => {
      loading.value = false
    })
  }
}

/**
 * 获取组织架构列表数据
 * @param deptId 父级部门ID
 * @param call 回调函数
 */
function getOrgList(deptId, call) {
  loading.value = true
  let apiFunc
  if (currentType.value === 'role'){
    apiFunc = orgApi.getRole()
  } else if(currentType.value === 'group'){
    apiFunc = orgApi.getSysUserGroups()
  } else {
    let currentDeptId = deptId || orgPath.value[orgPath.value.length - 1].id
    apiFunc = orgApi.getOrgTree(currentDeptId, currentType.value)
  }
  return apiFunc.then(rsp => {
    loading.value = false
    orgData.value = rsp.data
    //加载选中对象，解决UI框架回显对象问题
    reloadStatus(orgData.value)
    if (call) {
      call(rsp.data)
    }
  }).catch(err => {
    loading.value = false
  })
}

async function reloadStatus(orgs){
  if (_selected.value.length > 0){
    for (let i in orgs) {
      let index = _selected.value.findIndex(a => isSame(a, orgs[i]))
      if (index > -1){
        const isLeader = orgs[i].isLeader
        orgs[i] = _selected.value[index]
        orgs[i].isLeader = isLeader
      }
    }
  }
}

/**
 * 获取简短名称，只取末尾俩字符
 * @param name
 * @returns {*|string}
 */
function getShortName(name) {
  if ((name || '').length > 2) {
    return name.substring(name.length - 2, name.length)
  }
  return name
}

/**
 * 处理单选，强制单选
 * @param val 选中项集合
 */
function change(val) {
  if (!props.multiple) {
    _selected.value = [val[val.length - 1]]
  }
}

function getValues(){
  return _selected.value.map(v => {
    return {
      id: v.id,
      name: v.name,
      type: v.type,
      avatar: v.avatar
    }
  })
}

function getDisabled(org){
  return (currentType.value === 'user' && org?.type === 'dept')
        || props.excludes.findIndex(v => org.id == v.id && org.type === v.type) > -1
}

</script>

<template>
  <w-dialog :border="false" width="550" :title="title" v-model="showDialog"
            @ok="$emit('ok', getValues())">
    <template #title>
      <span style="margin-right: 20px">{{title}} </span>
      <el-radio-group @change="getOrgList()" v-model="currentType" v-if="Array.isArray(type) && type.length > 0">
        <el-radio label="部门/人员" value="org" v-show="hasType('org')"/>
        <el-radio label="部门" value="dept" v-show="hasType('dept')"/>
        <el-radio label="人员" value="user" v-show="hasType('user')"/>
        <el-radio label="角色" value="role" v-show="hasType('role')"/>
        <el-radio label="用户组" value="group" v-show="hasType('group')"/>
      </el-radio-group>
    </template>

    <el-row>
      <el-col :span="12" class="w-org-picker-span" v-loading="loading">
        <el-input v-model="search" v-if="currentType === 'user' || currentType === 'org'"
                  @input="doSearch" class="w-org-picker-s-input" clearable
                  placeholder="搜索人员" prefix-icon="search"/>
        <div v-else style="padding: 10px 5px">
          <el-text>从下方列表选择</el-text>
        </div>
        <div class="w-org-picker-nav" v-if="isOrg">
          <el-icon>
            <OfficeBuilding/>
          </el-icon>
          <el-scrollbar>
            <div class="w-org-list-path">
              <template v-for="(org, i) in orgPath">
                <span v-if="i > 1"> > </span>
                <el-text size="small" style="cursor: pointer" @click="jumpDept(org, i)"
                         :type="i === orgPath.length - 1 ? 'primary' : 'info'">
                  {{ org.name }}
                </el-text>
              </template>
            </div>
          </el-scrollbar>
        </div>
        <div class="w-org-list">
          <div>
            <el-checkbox v-model="selectAll" :indeterminate="indeterminate" style="padding: 0 5px"
                         :disabled="!multiple">全选</el-checkbox>
            <el-button link type="primary" @click="toParentDept" :disabled="orgPath.length <= 1 || showSearch">
              <el-icon><TopLeft/></el-icon>上级
            </el-button>
          </div>

          <el-scrollbar ref="orgListScrollRef" @scroll="arg => nowScroll = arg.scrollTop"  v-if="dataList.length > 0">
            <el-checkbox-group v-model="_selected" class="w-org-list-org" @change="change">
              <el-checkbox v-for="org in dataList" :disabled="getDisabled(org)"
                           :key="org.type + org.id" :label="org.name" :value="org">
                <el-avatar :size="35" :class="{'w-avatar-has': org.avatar}" :src="org.avatar" v-if="org?.type === 'user'">
                  {{ getShortName(org.name) }}
                </el-avatar>
                <el-image class="w-org-dept-img" fit="fill" :src="`${getResPrefix()}/image/${org.type}.png`"
                          v-else-if="org.type !== 'user'"></el-image>
                <el-text tag="div" truncated style="max-width: 160px; margin-left: 5px; flex: 1">{{ org.name }}</el-text>
                <el-tag size="small" type="warning" v-if="org.isLeader">部门主管</el-tag>
                <el-button type="primary" link class="w-org-child" v-if="org.type === 'dept'"
                           @click="toSubDept(org)">下级
                  <el-icon>
                    <BottomRight/>
                  </el-icon>
                </el-button>
              </el-checkbox>
            </el-checkbox-group>
          </el-scrollbar>
          <el-empty v-else :image-size="100" description="未找到对应组织数据"/>
        </div>
      </el-col>
      <el-col :span="12" class="w-org-picker-span">
        <div>
          <span>已选 {{ _selected.length }} 项</span>
          <el-button link type="danger" :disabled="_selected.length === 0" @click="_selected.length = 0">清空</el-button>
        </div>
        <el-scrollbar v-if="_selected.length > 0">
          <div v-for="(org, i) in _selected" class="w-org-picker-select">
            <el-avatar :size="35" :class="{'w-avatar-has': org.avatar}" :src="org.avatar" v-if="org.type === 'user'">{{ getShortName(org.name) }}</el-avatar>
            <el-image class="w-org-dept-img" fit="fill" :src="`${getResPrefix()}/image/${org.type}.png`" v-else-if="org.type !== 'user'"/>
            <el-text tag="div" truncated style="max-width: 200px; margin-left: 5px; flex: 1">{{ org.name }}</el-text>
            <el-icon @click="_selected.splice(i, 1)">
              <Close/>
            </el-icon>
          </div>
        </el-scrollbar>
        <el-empty v-else :image-size="100" description="未选中任何数据"/>
      </el-col>
    </el-row>
  </w-dialog>
</template>

<style scoped lang="less">
.w-org-picker-span {
  display: flex;
  flex-direction: column;
  height: 400px;
  border: 1px solid var(--el-border-color);

  &:first-child {
    border-right: none;

    .w-org-picker-s-input {
      padding: 5px;
    }
  }

  &:last-child {
    & > :first-child {
      display: flex;
      align-items: center;
      height: 40px;
      padding: 0 10px;
      justify-content: space-between;
      border-bottom: 1px solid var(--el-border-color);
    }
  }

}

.w-avatar-has {
  background: none !important;
}

.w-org-picker-nav {
  padding: 0 5px;
  display: flex;
  align-items: center;

  i {
    margin-right: 5px;
  }

  .w-org-list-path {
    white-space: nowrap;
  }
}

.w-org-dept-img {
  width: 20px;
  height: 20px;
  padding: 8px 0;
}

.w-org-picker-select {
  display: flex;
  align-items: center;
  padding: 3px 5px;

  .el-avatar {
    background-color: var(--el-color-primary);
  }

  i {
    cursor: pointer;
    padding: 5px;
  }

  &:hover {
    background-color: var(--el-bg-color-page);
  }
}

:deep(.w-org-list-org) {
  display: flex;
  flex-direction: column;
  height: 275px;

  & > .el-checkbox {
    height: auto;
    padding: 3px 5px;
    margin-right: 0;

    &:hover {
      background-color: var(--el-bg-color-page);
    }
  }

  .w-org-child {
    color: var(--el-color-primary);
  }

  .el-checkbox__label {
    display: flex;
    position: relative;
    align-items: center;
    flex: 1;
  }

  .el-avatar {
    background-color: var(--el-color-primary);
  }
}

.w-org-list {

  & > div:first-child {
    display: flex;
    align-items: center;
    position: relative;

    & > :first-child {
      flex: 1;
    }

    & > :last-child {
      margin-right: 5px;
    }
  }
}
</style>
