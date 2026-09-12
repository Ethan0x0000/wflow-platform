<script setup>
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";
import WConditionConfig from "../../../../common/WConditionConfig.vue";

const {formFields} = storeToRefs(useWflowStore())
//注入数据源选项
const dsOptions = inject('dsOptions', [])

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
          .filter(v => v.valueType !== 'none' && !v.parent)
          .map(v => {
            return {
              label: v.name,
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
        fields: [],
        isShow: true
      }
    ]
  })
}

</script>

<template>
  <div>
    <w-bright-block v-if="_value.length > 0" style="margin-bottom: 10px" type="primary"
                    content="在下方条件组内，当满足对应条件时，将会执行对应动作"/>
    <div class="w-rules" v-for="(rule, ri) in _value">
      <w-condition-config show-change :options="options" v-model="_value[ri]"/>
      <div v-for="action in rule.actions" style="display: flex; align-items: center; margin-top: 10px">
        <el-select v-model="action.type">
          <el-option label="设置字段值" value="SET_VAL"/>
          <el-option label="刷新选项" value="RF_OPTIONS"/>
          <el-option label="设置选项" value="SET_OPTIONS"/>
          <el-option label="设为必填" value="REQUIRED"/>
          <el-option label="取消必填" value="IGNORE"/>
          <el-option label="禁用组件" value="IGNORE"/>
          <el-option label="取消禁用" value="IGNORE"/>
        </el-select>
        <el-select style="flex: 1" placeholder="选择要控制的字段" multiple v-model="rule.fields">
          <template #prefix>
            <el-icon>
              <View v-if="rule.isShow"/>
              <Hide v-else/>
            </el-icon>
          </template>
          <el-option v-for="field in formFields" :key="field.id" :label="field.name" :value="field.key"/>
        </el-select>
      </div>
      <el-icon class="w-rule-del" @click="_value.splice(i, 1)">
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
