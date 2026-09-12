<script setup>
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";
import WConditionConfig from "../../../../common/WConditionConfig.vue";

const {formFields} = storeToRefs(useWflowStore())
//注入数据源选项
const dsOptions = inject('dsOptions', [])
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => {
      return []
    }
  }
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
const _value = defineModel()

function addRuleGroup() {
  _value.value.push({
    logic: false,
    action: '',
    fields: [],
    conditions: []
  })
}

</script>

<template>
  <div>
    <w-bright-block v-if="_value.length > 0" style="margin-bottom: 10px" type="primary"
                    content="在下方条件组内，当满足对应条件时，才会显示/隐藏对应表单字段，若有多个条件满足，则从上到下依次执行"/>
    <div class="w-rules" v-for="(rule, ri) in _value">
      <w-condition-config :options="options" v-model="_value[ri]"/>
      <div style="display: flex; align-items: center; margin-top: 10px">
        <el-radio-group v-model="rule.isShow">
          <el-radio-button label="显示" :value="true"/>
          <el-radio-button label="隐藏" :value="false"/>
        </el-radio-group>
        <el-select style="flex: 1" placeholder="选择要控制的字段" multiple v-model="rule.fields">
          <template #prefix>
            <el-icon>
              <View v-if="_value.isShow"/>
              <Hide v-else/>
            </el-icon>
          </template>
          <el-option v-for="field in formFields" :key="field.id" :label="field.name" :value="field.key"/>
        </el-select>
      </div>
      <el-icon class="w-rule-del" @click="_value.splice(ri, 1)">
        <Delete/>
      </el-icon>
    </div>
    <el-button text type="primary" icon="Plus" @click="addRuleGroup">新增显隐规则</el-button>
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
