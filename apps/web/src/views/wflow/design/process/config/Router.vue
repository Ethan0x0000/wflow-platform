<script setup>
import nodeMixin from "../NodeMixin.js";
import ConditionGroupConfig from "@/views/wflow/design/process/config/common/ConditionGroupConfig.vue";
import {ElMessage} from "element-plus";

const nodeList = inject('nodeList')
const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()

function delGroup(i) {
  _value.value.props.groups.splice(i, 1)
}

function addGroup() {
  if (_value.value.props.groups.length >= 4){
    ElMessage.warning('不要搞这么多撒🤨')
    return
  }
  _value.value.props.groups.push({
    logic: true, //组内条件关系
    conditions: []
  })
}
</script>

<template>
  <el-form style="margin-top: 20px">
    <el-form-item label="设置目标节点">
      <el-select placeholder="请选择要路由的目标节点" v-model="_value.props.target" value-key="id">
        <el-option v-for="node in nodeList" :key="node.id" :label="node.name" :value="node"/>
      </el-select>
    </el-form-item>
    <el-form-item label="选择路由方式">
      <el-radio-group style="" v-model="_value.props.hasCondition">
        <el-radio :value="false">直接路由（直接走路由规则，不走路由下方节点）</el-radio>
        <el-radio :value="true">按条件路由（如果条件满足，才会走路由）</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label-position="top" v-if="_value.props.hasCondition">
      <template #label>
        <div class="w-flex-col-ct">
          <el-text style="margin-right: 10px">设置路由条件</el-text>
          <el-button link type="primary" icon="Plus" @click="addGroup">添加条件组</el-button>
        </div>
       </template>
      <el-form-item class="w-router-group" label="条件组关系：" v-if="_value.props.groups.length > 1">
        <el-radio-group v-model="_value.props.logic">
          <el-radio label="全部满足" :value="true"></el-radio>
          <el-radio label="满足任意一个" :value="false"></el-radio>
        </el-radio-group>
      </el-form-item>
      <condition-group-config style="width: 100%;" v-model="_value.props.groups[i]" :name="`条件组 ${i + 1}`" :key="i"
                              v-for="(group, i) in _value.props.groups" @delete="delGroup(i)"/>
    </el-form-item>
  </el-form>
</template>

<style lang="less" scoped>
.w-router-group {
  :deep(label) {
    margin-bottom: 0;
    align-items: center;
    height: 40px;
    line-height: 40px;
  }
}
</style>
