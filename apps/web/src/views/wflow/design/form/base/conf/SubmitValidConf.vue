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
    errMsg: null,
    conditions: []
  })
}

</script>

<template>
  <div>
    <w-bright-block v-if="_value.length > 0" style="margin-bottom: 10px" show-icon
                    content="若满足下方任意一条规则，则表单将不能提交，并弹出对应错误提示"/>
    <div class="w-valid-rules" v-for="(rule, ri) in _value">
      <w-condition-config :options="options" v-model="_value[ri]"/>
      <el-input style="margin-top: 10px" prefix-icon="Warning" clearable placeholder="错误提示" v-model="rule.errMsg"/>
      <el-icon class="w-rule-del" @click="_value.splice(ri, 1)">
        <Delete/>
      </el-icon>
    </div>
    <el-button text type="primary" icon="Plus" @click="addRuleGroup">新增校验规则</el-button>
  </div>
</template>

<style scoped lang="less">
.w-valid-rules {
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
