<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import FormComponent from "./FormComponent.vue";
import {VueDraggable} from "vue-draggable-plus";
import {getFieldValidRules, isRequired} from "@/utils/GlobalFunc.js";
import {isFormItem, resolveFormJson} from "@/utils/ProcessUtil.js";
import {useFormItem} from "element-plus";
import {compareRuleGroup} from "@/utils/ConditionCompare.js";

const permConf = inject('permConf', {})
const validates = inject('validates', {})
const formData = inject('formData', ref({}))

const props = defineProps({
  ...FormComponentMixin.props
})
const {formItem} = useFormItem()
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel({
  get() {
    return props.mode === 'D' ? [{}] : (props.modelValue || [])
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
const freeMode = computed(() => props.mode === 'D')
const _active = computed(FormComponentMixin.computed._active(props, emit))
const subValidates = ref({})
const itemForm = ref()
//注入自定义校验器
provide('validates', subValidates)

//按照行来构建校验
const rules = computed(() => {
  const fields = (props.config.props.columns || []).length > 0 ?
      resolveFormJson(props.config.props.columns) : []
  return getFieldValidRules(fields, subValidates, permConf, props.mode)
})

// 行级联动状态：rowPermConf[rowIndex][colKey] = 'E'|'R'|'H'
const rowPermConf = reactive({})
// 行级 watch 清理函数
const rowWatchers = {}
// 行级选项加载函数：rowOptionLoads[`${rowIndex}_${colKey}`] = loadFn（由 SinglePicker/MultiplePicker 注册）
// 仅作函数注册表，不需要响应式
const rowOptionLoads = {}
// 行级选项配置覆盖：rowOptionConf[rowIndex][colKey] = { optionType, static, http }（SET_OPTIONS 写入）
const rowOptionConf = reactive({})
provide('rowOptionLoads', rowOptionLoads)
provide('rowOptionConf', rowOptionConf)

// 组件卸载时清理所有行级 watcher，防止内存泄漏
// （通过事件处理器 addRow 创建的 watcher 不在 Vue effect scope 内，不会自动销毁）
onBeforeUnmount(() => {
  Object.values(rowWatchers).forEach(list => list.forEach(stop => stop()))
})

function setupRowLinkage(rowIndex) {
  const rules = props.config.props.rowLinkageRules
  if (!rules || rules.length === 0) return
  if (!rowPermConf[rowIndex]) rowPermConf[rowIndex] = {}
  // 去重：同一字段在多条规则中重复出现时，只建立一个 watcher，避免一次变化触发多次 reevaluateRow
  const colFieldKeys = new Set()
  const extFieldKeys = new Set()
  rules.forEach(rule => {
    rule.conditions.forEach(cd => {
      if (!cd.symbol) return
      const isColField = props.config.props.columns.some(c => c.key === cd.symbol)
      if (isColField) colFieldKeys.add(cd.symbol)
      else extFieldKeys.add(cd.symbol)
    })
  })
  const watchList = []
  colFieldKeys.forEach(symbol => {
    watchList.push(watch(() => _value.value?.[rowIndex]?.[symbol], () => reevaluateRow(rowIndex), {deep: true}))
  })
  extFieldKeys.forEach(symbol => {
    watchList.push(watch(() => formData.value?.[symbol], () => reevaluateRow(rowIndex), {deep: true}))
  })
  rowWatchers[rowIndex] = watchList
  reevaluateRow(rowIndex)
}

function reevaluateRow(rowIndex) {
  if (!rowPermConf[rowIndex]) rowPermConf[rowIndex] = {}
  Object.keys(rowPermConf[rowIndex]).forEach(k => delete rowPermConf[rowIndex][k])
  // 清除行级选项配置覆盖，条件不再满足时自动还原为默认选项
  if (rowOptionConf[rowIndex]) {
    Object.keys(rowOptionConf[rowIndex]).forEach(k => delete rowOptionConf[rowIndex][k])
  }
  const rules = props.config.props.rowLinkageRules
  if (!rules) return
  rules.forEach(rule => execRowRule(rule, rowIndex))
}

function execRowRule(rule, rowIndex) {
  const rowData = _value.value?.[rowIndex] || {}
  const context = {...(formData.value || {}), ...rowData}
  if (compareRuleGroup(rule, context)) {
    rowActionHandler(rule.actions, rowIndex)
  }
}

function rowActionHandler(actions, rowIndex) {
  if (!rowPermConf[rowIndex]) rowPermConf[rowIndex] = {}
  actions.forEach(action => {
    if (!action.type || !action.field) return
    switch (action.type) {
      case 'SET_VAL': {
        const curPerm = rowPermConf[rowIndex]?.[action.field] ?? (permConf[action.field] || props.mode)
        if (curPerm === 'E' && _value.value?.[rowIndex]) {
          _value.value[rowIndex][action.field] = Array.isArray(action.value)
              ? JSON.parse(JSON.stringify(action.value))
              : action.value
        }
        break
      }
      case 'SHOW':
        rowPermConf[rowIndex][action.field] = permConf[action.field] || props.mode || 'E'
        break
      case 'HIDE':
        rowPermConf[rowIndex][action.field] = 'H'
        break
      case 'SET_EDIT':
        rowPermConf[rowIndex][action.field] = 'E'
        break
      case 'RF_OPTIONS': {
        // 调用当前行对应字段的选项重载函数
        const loader = rowOptionLoads[`${rowIndex}_${action.field}`]
        if (loader) loader()
        break
      }
      case 'SET_OPTIONS': {
        // 写入行级选项配置，选项组件的 watch 会自动触发重载
        if (!rowOptionConf[rowIndex]) rowOptionConf[rowIndex] = {}
        rowOptionConf[rowIndex][action.field] = {
          optionType: action.option?.optionType,
          static: action.option?.static,
          http: action.option?.http
        }
        // 同时主动调用 loader，保证立即生效
        const loader = rowOptionLoads[`${rowIndex}_${action.field}`]
        if (loader) loader()
        break
      }
      case 'SET_READ':
        rowPermConf[rowIndex][action.field] = 'R'
        break
    }
  })
}

function cleanRowLinkage(rowIndex) {
  ;(rowWatchers[rowIndex] || []).forEach(stop => stop())
  delete rowWatchers[rowIndex]
  delete rowPermConf[rowIndex]
  delete rowOptionConf[rowIndex]
  // 清理该行注册的选项加载函数
  Object.keys(rowOptionLoads).forEach(k => {
    if (k.startsWith(`${rowIndex}_`)) delete rowOptionLoads[k]
  })
}

function rebuildRowWatchers() {
  Object.keys(rowWatchers).forEach(idx => {
    ;(rowWatchers[idx] || []).forEach(stop => stop())
    delete rowWatchers[idx]
  })
  Object.keys(rowPermConf).forEach(idx => delete rowPermConf[idx])
  // 同步清理 rowOptionConf，防止行删除后旧索引数据残留
  Object.keys(rowOptionConf).forEach(idx => delete rowOptionConf[idx])
  ;(_value.value || []).forEach((_, idx) => setupRowLinkage(idx))
}

function getItemMode(rowIndex, itemKey) {
  if (freeMode.value) return permConf[itemKey] ?? props.mode
  return rowPermConf[rowIndex]?.[itemKey] ?? permConf[itemKey] ?? props.mode
}

function isItemHidden(rowIndex, itemKey) {
  return getItemMode(rowIndex, itemKey) === 'H'
}

onMounted(() => {
  if (!freeMode.value) {
    nextTick(() => {
      ;(_value.value || []).forEach((_, idx) => setupRowLinkage(idx))
    })
  }
})

onBeforeMount(() => {
  //加载自定义校验规则
  if (validates.value) {
    validates.value[props.config.key] = (rule, value, callback) => {
      //只读状态不进行校验
      if (isRequired(props.config.props.required, permConf[props.config.key] || props.mode)
          && (value || []).length === 0) {
        callback(new Error('请至少添加一项'))
      } else {
        const valids = [];
        (itemForm.value || []).forEach(ref => valids.push(ref.validate()))
        Promise.all(valids).then(results => {
          if (results.every(value => value === true)) callback()
          else callback(new Error('请根据提示完成表单项'))
        }).catch(err => {
          callback(new Error('校验失败，请根据提示完成表单项'))
        })
      }
    }
  }
})

function addRow() {
  const row = reactive({})
  props.config.props.columns.forEach(k => row[k.key] = reactive())
  const newIdx = _value.value?.length ?? 0
  emit('update:modelValue', [...(_value.value || []), row])
  formItem?.validate?.()
  nextTick(() => setupRowLinkage(newIdx))
}

function delRow(i) {
  cleanRowLinkage(i)
  _value.value.splice(i, 1)
  rebuildRowWatchers()
  formItem?.validate?.()
}

//function validate
</script>

<template>
  <div style="width: 100%;">
    <div class="w-form-list" v-for="(row, ri) in _value || []" :key="ri">
      <div class="w-form-list-header">
        <el-text v-if="mode === 'D'">拖拽组件到下方区域内👇</el-text>
        <el-text v-else>第{{ ri + 1 }}项</el-text>
        <el-button icon="delete" v-if="mode !=='V'" link :disabled="mode !== 'E' || config.props.disable" @click="delRow(ri)"/>
      </div>
      <el-form class="w-form-list-form" :label-position="config.props.labelPosition" :validate-on-rule-change="false"
               :label-width="config.props.labelWidth" :rules="rules" :model="row" ref="itemForm"
               :disabled="config.props.disable" @submit.prevent="() => {}" @change="formItem?.validate?.()">
        <vue-draggable style="width: 100%;" v-model="config.props.columns" :animation="150" :swapThreshold="0.2"
                       group="FormDesign" :disabled="!freeMode"
                       :ghostClass="freeMode ? 'w-f-cp-select':''" :class="{'w-f-cp-ct':freeMode}" handle=".w-cp-move">
          <template :key="item.id" v-for="(item, idx) in config.props.columns">
            <template v-if="!isItemHidden(ri, item.key)">
              <el-form-item :label="item.name" :prop="item.key"
                            v-if="!item.props.isContainer" @click.stop="_active = item"
                            :class="{'w-form-d-item': freeMode, 'w-form-cp-active': _active?.id === item.id && freeMode,
                            'w-form-cp-nlb':item.props.hideLabel, 'w-form-item-ep': item.props.allowPut}">
                <form-component :index="ri" :parents="config.props.columns" :config="item"
                                :mode="getItemMode(ri, item.key)"
                                :form-data="formData" v-model:active="_active" v-model="_value[ri][item.key]"
                                :col-index="idx" :type="item.type"/>
              </el-form-item>
              <form-component v-else :config="item" :mode="getItemMode(ri, item.key)" v-model:active="_active"
                              :type="item.type" :col-index="idx"
                              @click.stop="_active = item" v-model="_value[ri]" :index="ri"
                              :parents="config.props.columns"
                              :form-data="formData" :class="{'w-form-cp-active': _active?.id === item.id && freeMode}"/>
            </template>
          </template>
        </vue-draggable>
      </el-form>
    </div>
    <el-button icon="plus" v-if="mode !=='V'" :disabled="mode !== 'E' || config.props.disable" @click="addRow">添加一项</el-button>
  </div>
</template>

<style lang="less" scoped>
.w-form-list {
  position: relative;

  &:before {
    position: absolute;
    left: 0;
    height: 100%;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    content: '';
    width: 2px;
    display: block;
    background: var(--el-color-info-light-9);
  }

  .w-form-list-header {
    display: flex;
    height: 30px;
    padding: 0 10px;
    border-radius: 5px;
    background: var(--el-color-info-light-9);

    & > :first-child {
      flex: 1;
    }
  }

  :deep(.w-form-list-form) {
    padding-top: 10px;
    padding-left: 10px;
    display: flex;
    height: 100%;
    margin-bottom: 10px;

    /*解决多项表单组件校验样式影响问题*/
    .el-form-item:not(.is-error) .el-input-tag__wrapper,
    .el-form-item:not(.is-error) .el-input__wrapper,
    .el-form-item:not(.is-error) .el-select__wrapper,
    .el-form-item:not(.is-error) .el-textarea__inner {
      box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color)) inset !important;
    }
  }
}

:deep(.w-f-cp-ct) {
  width: 100%;
  min-height: 50px;
  border-radius: 5px;
  border: 1px dashed var(--el-border-color);
}

.w-f-cp-select {
  border-radius: 2px;
  border: 1px dashed var(--el-color-primary) !important;
}
</style>
