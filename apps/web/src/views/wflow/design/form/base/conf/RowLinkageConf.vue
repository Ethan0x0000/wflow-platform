<script setup>
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";
import WConditionConfig from "../../../../common/WConditionConfig.vue";
import DefaultValue from "../config/common/DefaultValue.vue";
import OptionsConf from "@/views/wflow/design/form/base/config/common/OptionsConf.vue";

const props = defineProps({
  columns: {type: Array, default: () => []},
  parentKey: {type: String, default: ''},
  parentName: {type: String, default: ''}
})

const {formFields} = storeToRefs(useWflowStore())
const dsOptions = inject('dsOptions', [])

const _value = defineModel({
  type: Array,
  default: () => []
})

// 条件字段选项：行内列字段（带父级名称前缀）+ 外部表单字段（排除父级组件本身）
const condOptions = computed(() => {
  const colKeys = new Set(props.columns.map(c => c.key))
  // 行内列字段，标签加"父组件名."前缀
  const colOpts = props.columns
      .filter(c => c.valueType !== 'none')
      .map(c => ({
        label: props.parentName ? `${props.parentName}.${c.name}` : c.name,
        value: c.key,
        valueType: c.valueType,
        fieldType: c.type,
        type: 'FORM'
      }))
  // 外部表单字段：与 DataLinkageConf 保持一致，包含所有字段（含其他容器内字段）
  // 排除：父组件本身（本身是数组不能作为条件）、已在行内列中的字段
  const extOpts = formFields.value
      .filter(v => v.valueType !== 'none')
      .filter(v => v.key !== props.parentKey)
      .filter(v => !colKeys.has(v.key))
      .map(v => ({
        label: v.parent ? `${v.parent.name}.${v.name}` : v.name,
        value: v.key,
        valueType: v.valueType,
        fieldType: v.type,
        type: 'FORM'
      }))
  return [
    {
      value: 'form',
      label: '表单字段',
      disabled: colOpts.length === 0 && extOpts.length === 0,
      children: [...colOpts, ...extOpts]
    },
    {
      value: 'datasource',
      label: '数据源',
      disabled: dsOptions.value.length === 0,
      children: dsOptions.value
    }
  ]
})

// 动作字段选项：仅行内列字段
const actionFields = computed(() => {
  return props.columns
      .filter(c => c.valueType !== 'none')
      .map(c => ({label: c.name, value: c.key, valueType: c.valueType, type: 'FORM'}))
})

// 选项类字段（用于 RF_OPTIONS / SET_OPTIONS）
const optionFields = computed(() => {
  return props.columns
      .filter(c => c.valueType === 'option' || c.valueType === 'options')
      .map(c => ({label: c.name, value: c.key, valueType: c.valueType, type: 'FORM'}))
})

// fields 映射（用于 DefaultValue 组件）
const fields = computed(() => {
  const obj = {}
  props.columns.forEach(c => {obj[c.key] = c})
  return obj
})

function addRuleGroup() {
  _value.value.push({
    logic: false,
    conditions: [],
    actions: [
      {
        type: null,
        field: null,
        isDynamic: false,
        value: null,
        option: {optionType: 'static', static: [], http: {}}
      }
    ]
  })
}

function addAction(rule) {
  rule.actions.push({
    type: null,
    field: null,
    isDynamic: false,
    value: null,
    option: {optionType: 'static', static: [], http: {}}
  })
}
</script>

<template>
  <div>
    <w-bright-block v-if="_value.length > 0" style="margin-bottom: 10px" show-icon
                    content="在下方条件组内，当满足对应条件时，将会对当前行/项执行对应动作（各行/项相互隔离）"/>
    <div class="w-rules" v-for="(rule, ri) in _value">
      <w-condition-config show-change :options="condOptions" v-model="_value[ri]"/>
      <el-button style="margin-top: 10px" icon="Plus" type="primary" link @click="addAction(rule)">添加动作</el-button>
      <div v-for="(action, ai) in rule.actions" style="display: flex; align-items: center; margin-top: 5px">
        <el-select v-model="action.type" style="width: 150px;" placeholder="请选择动作类型">
          <el-option label="设置字段值"   value="SET_VAL"/>
          <el-option label="刷新字段选项" value="RF_OPTIONS"/>
          <el-option label="设置字段选项" value="SET_OPTIONS"/>
          <el-option label="显示字段"     value="SHOW"/>
          <el-option label="隐藏字段"     value="HIDE"/>
          <el-option label="设为可编辑"   value="SET_EDIT"/>
          <el-option label="设为只读"     value="SET_READ"/>
        </el-select>
        <el-divider direction="vertical"/>
        <el-select style="width: 160px;" placeholder="选择要控制的字段" v-model="action.field"
                   @change="action.value = null">
          <el-option v-for="field in (action.type?.endsWith('_OPTIONS') ? optionFields : actionFields)"
                     :key="field.value" :label="field.label" :value="field.value"/>
        </el-select>
        <el-text style="margin: 0 10px" v-if="action.type === 'RF_OPTIONS'">的可选项</el-text>
        <template v-else-if="action.type === 'REQUIRED'">
          <el-text style="margin-left: 10px">为必填</el-text>
          <el-text type="danger">*</el-text>
        </template>
        <template v-else-if="action.type === 'UN_REQUIRED'">
          <el-text style="margin-left: 10px">为选填</el-text>
        </template>
        <template v-else-if="action.type === 'SHOW'">
          <el-text style="margin-left: 10px">（显示该字段）</el-text>
        </template>
        <template v-else-if="action.type === 'HIDE'">
          <el-text style="margin-left: 10px">（隐藏该字段）</el-text>
        </template>
        <template v-else-if="action.type === 'SET_EDIT'">
          <el-text style="margin-left: 10px">为可编辑</el-text>
        </template>
        <template v-else-if="action.type === 'SET_READ'">
          <el-text style="margin-left: 10px">为只读</el-text>
        </template>
        <template v-else-if="action.type === 'SET_OPTIONS'">
          <el-divider direction="vertical"/>
          <el-popover append-to-body width="350px" title="设置选项规则" trigger="click" placement="right">
            <options-conf v-model="action.option"/>
            <template #reference>
              <el-button icon="Operation">设置选项</el-button>
            </template>
          </el-popover>
        </template>
        <template v-else-if="action.type && action.field">
          <el-text style="margin: 0 10px">的值为：</el-text>
          <default-value style="width: auto; flex: 1" :config="fields[action.field]" v-model="action.value"
                         placeholder="要设置的值"/>
        </template>
        <el-button size="small" text icon="Delete" circle @click="rule.actions.splice(ai, 1)"></el-button>
      </div>
      <el-icon class="w-rule-del" @click="_value.splice(ri, 1)">
        <Delete/>
      </el-icon>
    </div>
    <el-button text type="primary" icon="Plus" @click="addRuleGroup">新增行内联动规则</el-button>
  </div>
</template>

<style scoped lang="less">
.w-rules {
  position: relative;
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 5px;
  background: var(--el-fill-color-light);

  .w-rule-del {
    position: absolute;
    right: -2px;
    top: -8px;
    padding: 3px;
    border-radius: 50%;
    cursor: pointer;
    color: var(--el-color-danger);
    background: var(--el-fill-color-light);
  }
}
</style>
