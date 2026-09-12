<script setup>
import nodeMixin from "../NodeMixin.js";
import FormPermConf from "../../../admin/config/FormPermConf.vue";
import TaskConfig from "./common/TaskConfig.vue";
import OperationPermConf from "../../../admin/config/OperationPermConf.vue";
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
    <el-tab-pane label="审批规则">
      <task-config is-approval v-model="_value" v-bind="props"/>
    </el-tab-pane>
    <el-tab-pane lazy label="主表单权限" v-if="!noMainForm">
      <form-perm-conf default-perm="R" :formItems="formItems" v-model="_value.props.formPerms"/>
    </el-tab-pane>
    <el-tab-pane lazy label="操作权限">
      <operation-perm-conf v-model="_value.props.operationPerms"/>
    </el-tab-pane>
    <el-tab-pane lazy label="事件监听">
      <event-handler-conf v-model="_value.props.events"/>
    </el-tab-pane>
  </el-tabs>
</template>

<style lang="less" scoped>

</style>
