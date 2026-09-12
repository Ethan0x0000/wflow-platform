<script setup>
import WCodeEditor from "../../../common/editor/WCodeEditor.vue";
import WBrightBlock from "../../../common/WBrightBlock.vue";
import WTip from "../../../common/WTip.vue";
import WHttpConfig from "../../../common/WHttpConfig.vue";
import {SYS_SYMBOLS} from "../../../common/config/CommonData.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {storeToRefs} from "pinia";

const {formFields} = storeToRefs(useWflowStore())
const _value = defineModel()
const fieldOptions = computed(() => {
  return [
    {
      label: '系统字段',
      value: 'sys',
      children: SYS_SYMBOLS
    },
    {
      label: '表单字段',
      value: 'form',
      children: formFields.value.map(v => {
        return {
          label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
          value: v.key
        }
      })
    }
  ]
})
</script>

<template>
  <el-form label-position="top" style="margin-top: 20px">
    <el-form-item label="选择触发动作">
      <el-radio-group v-model="_value.props.type">
        <el-radio value="EL">执行EL表达式</el-radio>
        <el-radio value="JS">执行JS脚本</el-radio>
        <el-radio value="SIGNAL">抛出信号</el-radio>
        <el-radio value="HTTP">HTTP请求</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="_value.props.type === 'EL'">
      <template #label>执行SpringEL表达式
        <w-tip content="表达式语法提示🎈</br>@bean名称：调用spring容器内的Bean实例</br>#变量名：取上下文变量"/>
      </template>
      <el-input v-model="_value.props.el" placeholder="输入springEl表达式">
        <template #append>
          <el-button>校验</el-button>
        </template>
      </el-input>
    </el-form-item>
    <el-form-item label="编写JS脚本" v-else-if="_value.props.type === 'JS'">
      <w-bright-block showIcon type="primary" content="本JS在后端运行，不支持浏览器相关API及ES6语法"/>
      <w-code-editor style="height: 300px;" lang="javascript" auto-theme prefix="默认注入ctx上下文变量，可取值 ctx.变量名" v-model="_value.props.jsCode"/>
    </el-form-item>
    <template v-else-if="_value.props.type === 'SIGNAL'">
      <el-form-item label="信号名称">
        <el-input clearable v-model="_value.props.signal.name" placeholder="输入信号名称，支持变量表达式${xxx}"/>
      </el-form-item>
      <el-form-item label="信号影响范围">
        <el-radio-group v-model="_value.props.signal.scope">
          <el-radio label="所有流程" value="GLOBAL"/>
          <el-radio label="指定流程" value="PROCESS"/>
          <el-radio label="当前实例" value="LOCAL"/>
          <el-radio label="指定实例" value="INSTANCE"/>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="_value.props.signal.scope === 'PROCESS'" label-position="left" label="指定流程类型:">
        <el-select style="width: 100%;" v-model="_value.props.code" placeholder="选择指定的流程">
        </el-select>
      </el-form-item>
      <el-form-item v-else-if="_value.props.signal.scope === 'INSTANCE'" label-position="left" label="指定流程实例:">
        <el-input clearable v-model="_value.props.signal.instId" placeholder="输入目标实例ID，支持变量表达式${xxx}"/>
      </el-form-item>
    </template>
    <w-http-config server-mode v-else-if="_value.props.type === 'HTTP'"
                   :var-options="fieldOptions" v-model="_value.props.http"/>
  </el-form>
</template>

<style scoped>

</style>
