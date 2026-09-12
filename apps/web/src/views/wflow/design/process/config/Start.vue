<script setup>
import nodeMixin from "../NodeMixin.js";
import FormPermConf from "../../../admin/config/FormPermConf.vue";
import OperationPermConf from "../../../admin/config/OperationPermConf.vue";
import WBrightBlock from "../../../common/WBrightBlock.vue";
import EventHandlerConf from "@/views/wflow/admin/config/EventHandlerConf.vue";

const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const noMainForm = inject('noMainForm', ref(false))

</script>

<template>
  <el-tabs>
    <el-tab-pane lazy label="主表单权限" v-if="!noMainForm">
      <form-perm-conf default-perm="E" :formItems="formItems" v-model="_value.props.formPerms"/>
    </el-tab-pane>
    <el-tab-pane lazy label="操作权限">
      <w-bright-block style="margin-bottom: 10px" type="warning" content="提示：📢本设置项在发起流程时无效，仅针对流程审批过程中退回到了发起人时有效"/>
      <operation-perm-conf v-model="_value.props.operationPerms"/>
    </el-tab-pane>
    <el-tab-pane lazy label="事件监听">
      <event-handler-conf type="Start" v-model="_value.props.events"/>
    </el-tab-pane>
  </el-tabs>

</template>

<style scoped>

</style>
