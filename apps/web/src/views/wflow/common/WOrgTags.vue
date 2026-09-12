<script setup>
import {getResPrefix} from "@/utils/GlobalFunc.js";

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  showAdd: {
    type: Boolean,
    default: false
  },
  addText: {
    type: String,
    default: '添加'
  },
  size: {
    default: 20
  },
  inline: Boolean
})

const _value = defineModel({
  type: Array,
  default: () => {
    return []
  }
})
const emit = defineEmits(['add', 'change'])
//用户、部门、角色信息缓存，减少访问提升性能
const orgCatch = reactive({
  user: {},
  dept: {},
  role: {},
  group: {}
})
const orgInfos = computed(() => {
  let infos = {...orgCatch}
  //拿到所有id,type关系，去接口取name和头像值
  const orgs = _value.value.filter(v => (orgCatch[v.type] || {})[v.id] === undefined)
  if (orgs.length > 0){
    getUserAvatarByIds(orgs).then(res => {
      res.forEach(v => {
        if (v.type === 'role'){
          v.avatar = getResPrefix() + '/image/role.png'
        } else if (v.type === 'dept'){
          v.avatar = getResPrefix() + '/image/dept.png'
        } else if (v.type === 'group'){
          v.avatar = getResPrefix() + '/image/group.png'
        }
        infos[v.type][v.id] = v
        orgCatch[v.type][v.id] = v
      })
    })
  }
  return infos
})

//请求后端接口去拿用户信息
function getUserAvatarByIds(orgs){
  return new Promise((resolve, reject) => {
    resolve(orgs)
  })
}

function getShortName(name){
  if ((name || '').length > 2){
    return name.substring(name.length - 2, name.length)
  }
  return name
}

function getAvatar(org){
  if (orgInfos.value[org.type] && orgInfos.value[org.type][org.id]){
    return orgInfos.value[org.type][org.id].avatar
  }
  return null
}

function remove(i){
  _value.value.splice(i, 1)
  emit('change', _value.value)
}

</script>

<template>
  <div :style="{display: inline ? 'inline-block' : 'block'}">
    <div class="w-org-items">
      <el-button @click="$emit('add')" size="small" icon="Plus" round
                 class="w-org-add" v-if="showAdd && !disabled">{{ addText }}</el-button>
      <div v-for="(org, i) in _value" :key="i">
        <el-avatar :size="size" :class="`w-avatar-${org.type} ${getAvatar(org) ? 'w-avatar-has':''}`" :src="getAvatar(org)">
          <span>{{getShortName(org.name)}}</span>
        </el-avatar>
        <el-text size="small" style="height: 20px; line-height: 20px">{{ org.name }}</el-text>
        <el-icon v-if="!disabled" size="10" @click="remove(i)"><Close/></el-icon>
      </div>
  </div>
</div>
</template>

<style scoped lang="less">
.w-org-items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;

  .w-org-add {
    padding: 0 8px;
    height: calc(var(--el-button-size) + 1px);
  }

  &>div {
    display: flex;
    align-items: center;
    margin: 5px;
    padding:3px 5px;
    border-radius: 15px;
    background-color: var(--el-bg-color-page);

    .w-avatar-user {
      background-color: var(--el-color-primary);
    }

    .w-avatar-dept, .w-avatar-role {
      background: none;
    }

    .el-avatar {
      margin-right: 3px;
      span {
        transform: scale(0.5);
        position: absolute;
        display: flex;
        align-items: center;
      }
    }

    i {
      cursor: pointer;
      padding: 2px;
      margin-left: 2px;

      &:hover {
        background-color: var(--el-fill-color-darker);
        border-radius: 50%;
      }
    }
  }
}

.w-avatar-has {
  background: none !important;
}
</style>
