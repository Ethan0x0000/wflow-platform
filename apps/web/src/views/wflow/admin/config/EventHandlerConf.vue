<template>
  <div v-if="event">
    <el-row>
      <el-col :span="12">
        <el-text>
          执行规则
          <w-tip content="异步执行：执行失败不影响流程</br>同步执行：执行失败流程事务回滚"/>：
        </el-text>
        <el-checkbox label="异步执行" v-model="event.async"/>
      </el-col>
      <el-col :span="12" class="w-flex-col-ct">
        <el-text>
          异常重试
          <w-tip content="执行失败时进行重试的次数"/>：
        </el-text>
        <el-input-number :min="0" :max="5" :step="1" controls-position="right"
                         :precision="0" size="small" v-model="event.retry">
          <template #suffix>
            <el-text>次</el-text>
          </template>
        </el-input-number>
      </el-col>
    </el-row>
    <event-listener-config v-model="event.enter" label="⤵️当进入本节点时"/>
    <event-listener-config v-model="event.leave" label="⤴️当离开本节点时"/>
    <event-listener-config v-if="type !== 'Start'" v-model="event.calcComplete" label="🔍当算出节点人员时"/>
    <event-listener-config v-model="event.created" label="➕当有任务分配时"/>
    <event-listener-config v-model="event.complete" label="✔️当有任务完成时"/>
  </div>
</template>

<script setup>
import EventListenerConfig from "../../design/process/config/common/EventListenerConfig.vue";
import WTip from "../../common/WTip.vue";

const props = defineProps({
  type: String,
})
const event = defineModel()

onBeforeMount(() => {
  //兼容之前的节点配置
  if (!event.value) {
    event.value = {
      async: true, //是否异步执行
      retry: 0, //异常重试次数
      enter: [], //进入节点
      leave: [], //离开节点
      created: [], //创建任务
      complete: [], //完成任务
      calcComplete: []
    }
  } else if (!event.value.calcComplete){
    event.value.calcComplete = []
  }
})
</script>

<style scoped lang="less">

</style>
