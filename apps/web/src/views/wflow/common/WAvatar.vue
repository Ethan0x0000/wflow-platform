<script setup>
import {getUserDetail} from "@/api/org";
import {ElMessage} from "element-plus";

const props = defineProps({
  size: {
    type: Number,
    default: 38
  },
  id: [String, Number],
  src: String,
  name: String,
  showY: Boolean,
  closeable: Boolean,
  status: String,
  showStatus: Boolean,
  showName: {
    type: Boolean,
    default: true
  }
})

const userDetail = ref({});
const loading = ref(false);

const _name = computed(() => {
  if ((props.name || '').length > 2) {
    return props.name.substring(props.name.length - 2, props.name.length)
  }
  return props.name
})

const _status = computed(() => {
  if (!props.showStatus) return null
  switch (props.status) {
    case 'agree':
    case 'pass':
      return {icon: 'CircleCheckFilled', color: 'success'}
    case 'reject':
    case 'refuse':
      return {icon: 'CircleCloseFilled', color: 'danger'}
    case 'complete':
    case 'startup':
      return {icon: 'Checked', color: 'success'}
    case 'fallback':
      return {icon: 'Back', color: 'danger'}
    case 'comment':
      return {icon: 'Comment', color: 'primary'}
    case 'cc':
      return {icon: 'Promotion', color: 'primary'}
    case 'cancel':
      return {icon: 'CircleClose', color: 'info'}
    case 'candidate':
      return {icon: 'QuestionFilled', color: 'warning'}
    case 'revoke':
      return {icon: 'RefreshLeft', color: 'info'}
    case 'agent':
      return {icon: 'Avatar', color: 'warning'}
    case 'revise':
      return {icon: 'WarnTriangleFilled', color: 'danger'}
  }
  return {icon: 'Clock', color: 'warning'}
})

const nameSize = computed(() => {
  if (props.size > 40) {
    return 'large'
  } else if (props.size > 30) {
    return 'default'
  } else {
    return 'small'
  }
})

const loadUserDetail = () => {
  if (props.id) {
    loading.value = true
    getUserDetail(props.id).then(res => {
      loading.value = false
      userDetail.value = res.data
    }).catch(err => {
      loading.value = false
      ElMessage.error(err.msg)
    })
  } else {
    ElMessage.warning("组件未提供用户ID")
  }
}

</script>

<template>
  <el-popover :disabled="!id" placement="left-end" @show="loadUserDetail" :width="250" trigger="click">
    <template #reference>
      <div :class="{'w-avatar': true, 'w-avatar-y': showY}" :style="{flexDirection: showY ? 'column' : 'row', '--size': size + 'px'}">
        <div :style="{position: 'relative', height: size + 'px'}">
          <el-avatar :class="{'w-avatar-has': src}" :size="size" :src="src">{{ _name }}</el-avatar>
          <el-icon v-if="_status" class="w-avatar-status" :style="{color: `var(--el-color-${_status?.color})`}">
            <component :is="_status.icon"/>
          </el-icon>
          <el-icon v-if="closeable" class="w-avatar-close" @click.stop="$emit('close')">
            <CircleCloseFilled/>
          </el-icon>
        </div>
        <el-text v-if="showName" :size="nameSize" truncated style="margin-left: 5px">{{ name }}</el-text>
      </div>
    </template>
    <div class="w-user-detail" v-loading="loading">
      <div class="w-avatar" style="margin-bottom: 10px">
        <el-avatar :class="{'w-avatar-has': src}" :size="38" :src="src">{{ _name }}</el-avatar>
        <el-text truncated style="margin-left: 5px">{{ name }}</el-text>
        <el-divider direction="vertical"/>
        <el-text size="small" type="success">{{ userDetail.status }}</el-text>
      </div>
      <el-form label-width="45px">
        <el-form-item label="部门">
          <el-button link type="info" style="margin: 0 5px" v-for="dept in (userDetail.depts || [])">
            {{ dept.name }}
          </el-button>
        </el-form-item>
        <el-form-item label="角色" v-if="(userDetail.roles || []).length > 0">
          <el-tag size="small" style="margin: 0 5px" v-for="dept in (userDetail.roles || [])">{{ dept.name }}</el-tag>
        </el-form-item>
        <el-form-item label="手机">
          <el-button type="primary" link>{{ userDetail.mobile }}</el-button>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-button type="primary" link>{{ userDetail.email }}</el-button>
        </el-form-item>
        <el-form-item label="格言">
          <el-text>{{ userDetail.motto }}</el-text>
        </el-form-item>
      </el-form>
    </div>
  </el-popover>
</template>

<style scoped lang="less">
.w-avatar {
  display: flex;
  cursor: pointer;
  align-items: center;

  .w-avatar-close {
    position: absolute;
    right: -5px;
    top: -2px;
    color: var(--el-color-info);
    border-radius: 50%;
    background: var(--el-bg-color);
  }

  .w-avatar-status {
    font-size: 14px;
    position: absolute;
    left: calc(var(--size) - 12px);
    top: calc(var(--size) - 12px);
    background: var(--el-bg-color);
    border-radius: 50%;
    padding: 1px;
  }

  .w-avatar-has {
    background: none !important;
  }

  .el-avatar {
    background: var(--el-color-primary)
  }
}

.w-user-detail {
  :deep(.el-form-item) {
    margin-bottom: 0 !important;
  }
}

.w-avatar-y {
  width: 80px;
  margin-top: 5px;
  overflow: hidden;
}
</style>
