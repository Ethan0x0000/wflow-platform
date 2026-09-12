<script setup>
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";
import WConditionConfig from "../../../../common/WConditionConfig.vue";
import DefaultValue from "../config/common/DefaultValue.vue";
import WDialog from "@/views/wflow/common/WDialog.vue";
import OptionsConf from "@/views/wflow/design/form/base/config/common/OptionsConf.vue";

const {formFields} = storeToRefs(useWflowStore())
//注入数据源选项
const dsOptions = inject('dsOptions', [])
const optionDialog = ref(false)

const fields = computed(() => {
  const obj = {}
  formFields.value.forEach(v => {obj[v.key] = v})
  return obj
})

const options = computed(() => {
  return [
    {
      value: 'form',
      label: '表单字段',
      disabled: formFields.value.length === 0,
      children: formFields.value
          .filter(v => v.valueType !== 'none')
          .map(v => {
            return {
              label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
              value: v.key,
              valueType: v.valueType,
              fieldType: v.type,
              type: 'FORM'
            }
          })
    },
    {
      value: 'datasource',
      label: '数据源',
      disabled: dsOptions.value.length === 0,
      children: dsOptions.value
    }
  ]
})
const optionFields = computed(() => {
  return formFields.value
      .filter(v => v.valueType === 'option' || v.valueType === 'options')
      .map(v => {
        return {
          label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
          value: v.key,
          valueType: v.valueType,
          type: 'FORM'
        }
      })
})
const _value = defineModel({
  type: Array,
  default: () => {
    return []
  }
})

function addRuleGroup() {
  _value.value.push({
    logic: false,
    conditions: [],
    actions: [
      {
        type: null, //动作类型
        field: null, //字段
        isDynamic: false,
        value: null, //要设置的值
        option: {
          optionType: 'static',
          static: [],
          http: {}
        }
      }
    ]
  })
}

function addAction(rule) {
  rule.actions.push({
    type: null, //动作类型
    field: null, //字段
    isDynamic: false,
    value: null, //要设置的值
    option: {
      optionType: 'static',
      static: [],
      http: {}
    }
  })
}

function setOptionRule(action) {

}

</script>

<template>
  <div>
    <w-bright-block v-if="_value.length > 0" style="margin-bottom: 10px" show-icon
                    content="在下方条件组内，当满足对应条件时，将会执行对应动作"/>
    <div class="w-rules" v-for="(rule, ri) in _value">
      <w-condition-config show-change :options="options" v-model="_value[ri]"/>
      <el-button style="margin-top: 10px" icon="Plus" type="primary" link @click="addAction(rule)">添加动作</el-button>
      <div v-for="(action, ai) in rule.actions" style="display: flex; align-items: center; margin-top: 5px">
        <el-select v-model="action.type" style="width: 150px;" placeholder="请选择动作类型">
          <el-option label="设置字段值" value="SET_VAL"/>
          <el-option label="刷新字段选项" value="RF_OPTIONS"/>
          <el-option label="设置字段选项" value="SET_OPTIONS"/>
          <el-option label="设为必填" value="REQUIRED"/>
          <el-option label="取消必填" value="UN_REQUIRED"/>
        </el-select>
        <el-divider direction="vertical"/>
        <el-select style="width: 160px;" placeholder="选择要控制的字段" v-model="action.field" @change="action.value = null">
          <el-option v-for="field in (action.type?.endsWith('_OPTIONS') ? optionFields : options[0].children)"
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
          <default-value style="width: auto; flex: 1" :config="fields[action.field]" v-model="action.value" placeholder="要设置的值"/>
        </template>
        <el-button size="small" text icon="Delete" circle @click="rule.actions.splice(ai, 1)"></el-button>
      </div>
      <el-icon class="w-rule-del" @click="_value.splice(ri, 1)">
        <Delete/>
      </el-icon>
    </div>
    <el-button text type="primary" icon="Plus" @click="addRuleGroup">新增联动规则</el-button>
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
