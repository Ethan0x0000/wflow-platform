<script setup>
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";
import ValueType from "../../ValueType.js";
import DefaultValue from "../config/common/DefaultValue.vue";

const {formFields} = storeToRefs(useWflowStore())
//注入数据源选项
const dsOptions = inject('dsOptions', [])

const fields = computed(() => {
  const obj = {}
  formFields.value.forEach(v => {obj[v.key] = v})
  return obj
})
const fieldOptions = computed(() => {
  //提取表单字段，过滤不支持的选项
  return formFields.value.filter(v => v.valueType !== ValueType.none)
})
const options = computed(() => {
  return dsOptions.value
})
const _value = defineModel({
  type: Array,
  default: () => {
    return []
  }
})

function addAction() {
  _value.value.push({
    type: 'SET_VALUE',
    symbol: null,
    isDynamic: false,
    value: null,
    cdType: 'NONE'
  })
}

</script>

<template>
  <div>
    <w-bright-block style="margin-bottom: 15px" v-if="_value.length > 0" show-icon
                    content="当表单加载完毕时，会执行设置的以下动作，动态值请务必保证数据源字段与组件值类型一致"/>
    <div class="w-rules" v-for="(rule, ri) in _value" :key="ri">
      <div>
        <el-select style="width: 100px;" placeholder="执行条件" v-model="rule.cdType">
          <el-option label="仅填写时" value="FILL"/>
          <el-option label="仅查看时" value="VIEWER"/>
          <el-option label="不限制" value="NONE"/>
        </el-select>
        <el-select style="width: 120px;" placeholder="选择动作类型" v-model="rule.type" default-first-option>
          <el-option label="设置组件值" value="SET_VALUE"/>
        </el-select>
        <el-divider direction="vertical"/>
        <el-select style="width: 200px;" placeholder="选择字段" v-model="rule.symbol" @change="rule.value = null">
          <el-option v-for="item in fieldOptions" :label="item.name" :value="item.key" :key="item.key"/>
        </el-select>
        <el-divider direction="vertical"/>
        <el-text>值为：</el-text>
        <el-checkbox v-model="rule.isDynamic">动态值</el-checkbox>
        <el-divider direction="vertical"/>
        <el-cascader style="flex: 1" v-if="rule.isDynamic" clearable v-model="rule.value" placeholder="请选择数据源数据集"
                     :show-all-levels="false" :props="{emitPath: false}" :options="options"/>
        <default-value style="flex: 1" v-else-if="!rule.isDynamic" placeholder="设置值" :config="fields[rule.symbol]" v-model="rule.value"/>
      </div>
      <el-icon class="w-rule-del" @click="_value.splice(ri, 1)">
        <Delete/>
      </el-icon>
    </div>
    <el-button type="primary" icon="Plus" @click="addAction" text>添加动作</el-button>
  </div>
</template>

<style scoped lang="less">
.w-rules {
  position: relative;
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 5px;
  background: var(--el-fill-color-light);

  &>div:first-child {
    display: flex;
    align-items: center;
  }

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
