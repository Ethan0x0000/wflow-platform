<script setup>

import {CompareOptions} from "@/utils/ConditionCompare.js";
import {storeToRefs} from "pinia";
const {formFields} = storeToRefs(useWflowStore())
import WConditionCompareValue from "./WConditionCompareValue.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";

const props = defineProps({
  options: { //级联变量选项
    type: Array,
    default: () => {
      return []
    }
  },
  showChange: Boolean //是否显示值变化条件
})

const _value = defineModel({ //规则设置
  type: Object,
  default: () => {
    return {}
  }
})

const fields = computed(() => {
  const obj = {}
  formFields.value.forEach(v => {obj[v.key] = v})
  return obj
})

onMounted(() => {
  if (!_value.value.conditions || _value.value.conditions.length === 0){
    _value.value.conditions = [{
      type: null, //大类
      valueType: null, //值类型
      fieldType: null, //字段类型
      isDynamic: false, //是否动态值
      symbol: null, //变量
      compare: null, //比较关系
      compareVal: [], //比较值
    }]
  }
})

function addRule() {
  _value.value.conditions.push({
    type: null, //大类
    fieldType: null, //字段类型
    valueType: null, //值类型
    isDynamic: false, //是否动态值
    symbol: null, //变量
    compare: null, //比较关系
    compareVal: [], //比较值
  })
}

function choose(data, rule) {
  if (!data.children){
    //这里不加延时有问题，一脸懵逼
    setTimeout(() => {
      rule.compare = null
      rule.type = data.type
      rule.fieldType = data.fieldType
      rule.valueType = data.valueType
    }, 50)
  }
}

</script>

<template>
  <div class="w-condition-group">
    <div>
      <el-select v-if="_value.conditions.length > 1" size="small" style="width: 45px;" v-model="_value.logic">
        <el-option :value="false" label="或"/>
        <el-option :value="true" label="且"/>
      </el-select>
      <el-tooltip effect="dark" content="添加子条件" placement="top">
        <el-button icon="Plus" size="small" circle @click="addRule"/>
      </el-tooltip>
      <el-text type="warning" style="margin-left: 10px" v-if="_value.conditions.length === 0">不设置条件，则默认满足</el-text>
    </div>
    <div>
      <div class="w-condition" v-for="(cd, ci) in _value.conditions" :key="ci">
        <el-cascader clearable v-model="cd.symbol" @change="cd.compareVal.length = 0" style="width: 150px;" placeholder="请选择数据"
                     :show-all-levels="false" :props="{emitPath: false}" :options="options">
          <template #default="{ node, data }">
            <div @click="choose(data, cd)">{{ data.label }}</div>
          </template>
        </el-cascader>
        <el-divider direction="vertical"/>
        <el-select style="width: 150px;" v-model="cd.compare" placeholder="比较关系" @change="cd.compareVal.length = 0">
          <el-option v-if="showChange" label="值变化时" value="CHANGE"/>
          <el-option :label="op.name" :value="op.symbol" :key="op.symbol" v-for="op in CompareOptions[cd.valueType]"/>
        </el-select>
        <template v-if="cd.compare !== 'EM' && cd.compare !== 'NEM' && cd.compare !== 'CHANGE'">
          <el-divider direction="vertical"/>
          <el-checkbox v-model="cd.isDynamic">动态值</el-checkbox>
          <el-divider direction="vertical"/>
          <el-cascader v-if="cd.isDynamic" clearable style="width: 40%;" placeholder="选择比较值"
                       v-model="cd.compareVal[0]" :show-all-levels="false" :props="{emitPath: false}" :options="options"/>
          <div style="width: 40%;" v-else-if="cd.compare !== 'EM' && cd.compare !== 'NEM'">
            <w-condition-compare-value v-model="_value.conditions[ci]" :field="fields[cd.symbol]" :value-type="cd.valueType"/>
          </div>
        </template>
        <el-button text type="danger" icon="Minus" size="small" circle
                   v-if="_value.conditions.length > 0" @click="_value.conditions.splice(ci, 1)"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.w-condition-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  &>div:first-child {
    &::before{
      content: '';
      height: 100%;
    }
  }

  &>div:last-child {
    position: relative;
    flex: 1;
    &::before{
      position: absolute;
      left: 0;
      content: '';
      top: 18px;
      height: calc(100% - 40px);
      border: 1px dashed var(--el-border-color-dark);
    }
  }

  .w-condition {
    margin: 2px 0;
    display:flex;
    flex: 1;
    align-items: center;

    &::before {
      content: '';
      width: 20px;
      border: 1px dashed var(--el-border-color-dark);
    }
  }
}
</style>
