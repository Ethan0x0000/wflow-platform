<script setup>
import nodeMixin from "../NodeMixin.js";

const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()

function toFix() {
  if (_value.value.props.timeout) {
    _value.value.props.timeout = parseInt(_value.value.props.timeout)
  }
}
</script>

<template>
  <el-form label-position="top">
    <el-form-item label="满足以下条件后继续流转">
      <el-radio-group v-model="_value.props.type">
        <el-radio label="一段时间后" value="FIXED"/>
        <el-radio label="当天时间点" value="TODAY"/>
        <el-radio label="固定时间点" value="DATETIME"/>
        <el-radio label="收到信号" value="SIGNAL"/>
      </el-radio-group>
    </el-form-item>
    <template v-if="_value.props.type === 'FIXED'">
      <el-text>等待 </el-text>
      <el-input type="number" @blur="toFix" clearable placeholder="请输入等待时长" style="width: 200px;" v-model="_value.props.timeout">
        <template #append>
          <el-select style="width: 80px;" v-model="_value.props.timeUnit">
            <el-option label="天" value="D"/>
            <el-option label="小时" value="H"/>
            <el-option label="分钟" value="M"/>
            <el-option label="秒" value="S"/>
          </el-select>
        </template>
      </el-input>
      <el-text> 后流程继续</el-text>
    </template>
    <template v-else-if="_value.props.type === 'TODAY'">
      <el-text>直到当天的 </el-text>
      <el-time-picker placeholder="设置放行时间点" clearable value-format="HH:mm:ss" v-model="_value.props.time" />
      <el-text> 指流程到达本节点的那天</el-text>
    </template>
    <template v-else-if="_value.props.type === 'DATETIME'">
      <el-date-picker placeholder="设置放行时间点" clearable type="datetime" value-format="YYYY-MM-DD HH:mm:ss" v-model="_value.props.dateTime"/>
      <el-text> 后流程继续</el-text>
    </template>
    <template v-else-if="_value.props.type === 'SIGNAL'">
      <el-text>收到名称为 </el-text>
      <el-input clearable style="width: 250px;" placeholder="请输入信号名称" v-model="_value.props.signal">
        <template #append>
          <el-select disabled style="width: 80px;" v-model="_value.props.signalScope">
            <el-option label="全局" value="global"/>
            <el-option label="局部" value="processInstance"/>
          </el-select>
        </template>

      </el-input>
      <el-text> 的信号后，流程继续</el-text>
    </template>
  </el-form>
</template>

<style lang="less" scoped>

</style>
