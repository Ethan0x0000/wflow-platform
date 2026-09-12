<script setup>
import {getProcGroupItemsList} from "@/api/model.js";
import {ElMessage} from "element-plus";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => {
      return {}
    }
  },
  showStatus: Boolean,
  showAction: Boolean,
  showType: {
    type: Boolean,
    default: true
  },
  excludeUser: {
    type: Boolean,
    default: false
  },
  startDesc: {
    type: String,
    default: ''
  },
  endDesc: {
    type: String,
    default: ''
  }
})

const _value = defineModel()

const groupItems = ref([])
const pickerOptions = [
  {
    text: '近一小时',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000);
      return [start, end]
    }
  },
  {
    text: '近一天',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24);
      return [start, end]
    }
  }, {
    text: '最近一周',
    value: () =>{
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      return [start, end]
    }
  }, {
    text: '最近一个月',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
      return [start, end]
    }
  }, {
    text: '最近三个月',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
      return [start, end]
    }
  }
]

onMounted(() => {
  getProcGroupItemsList().then(res => {
    groupItems.value = res.data.filter(g => g.items.length > 0).map(group => {
      return {
        value: group.id,
        label: group.name,
        children: group.items.map(it => {
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
})
</script>

<template>
  <el-space class="w-card" style="width: calc(100% - 40px);">
    <el-cascader v-if="showType" clearable :show-all-levels="false" :options="groupItems" :props="{emitPath: false}" placeholder="流程类型" v-model="_value.code"/>
    <el-select v-if="showStatus" clearable prefix-icon="Search" v-model="_value.status" style="width: 120px;" placeholder="流程状态">
      <el-option label="进行中" value="RUNNING"/>
      <el-option label="暂停中" value="SUSPEND"/>
      <el-option label="被驳回" value="REFUSE"/>
      <el-option label="已撤销" value="REVOKED"/>
      <el-option label="审批通过" value="PASS"/>
      <el-option label="流程异常" value="EXCEPTION"/>
    </el-select>
    <el-select v-if="showAction" clearable prefix-icon="Search" v-model="_value.action" style="width: 120px;" placeholder="处理类型">
      <el-option label="办理" value="complete"/>
      <el-option label="同意" value="agree"/>
      <el-option label="拒绝" value="reject"/>
      <el-option label="转交" value="forward"/>
      <el-option label="回退" value="fallback"/>
      <el-option label="前加签" value="beforeAdd"/>
      <el-option label="后加签" value="afterAdd"/>
      <el-option label="撤销" value="revoke"/>
      <el-option label="修改" value="revise"/>
      <el-option label="撤回" value="withdraw"/>
    </el-select>
    <el-input v-model="_value.title" clearable prefix-icon="Search" style="width: 250px;" :placeholder="`搜索 ${excludeUser ? '' : '发起人、'}流程类型`"></el-input>
    <el-date-picker v-model="_value.startRange" :shortcuts="pickerOptions" style="width: 350px;"
                    type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" clearable
                    :start-placeholder="`${startDesc}开始时间`" :end-placeholder="`${startDesc}结束时间`"/>
    <el-button type="primary" icon="Search" @click="$emit('search')">查询</el-button>
  </el-space>
</template>

<style scoped lang="less">

</style>
