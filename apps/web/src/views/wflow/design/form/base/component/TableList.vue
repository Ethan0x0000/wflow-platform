<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {VueDraggable} from "vue-draggable-plus";
import {delField, copyField, deepCopy, getFieldValidRules} from "@/utils/GlobalFunc.js";
import FormComponent from "./FormComponent.vue";
import Schema from 'async-validator';
import {useFormItem} from "element-plus";
import {compareRuleGroup} from "@/utils/ConditionCompare.js";

const props = defineProps({
  ...FormComponentMixin.props,
  modelValue: {
    type: Array,
    default: () => {
      return []
    }
  }
})

const permConf = inject('permConf', {})
const validates = inject('validates', {})
const formData = inject('formData', ref({}))
const {formItem} = useFormItem()
const emit = defineEmits([...FormComponentMixin.emits])
const _active = computed(FormComponentMixin.computed._active(props, emit))
const _value = defineModel()
const freeMode = computed(() => props.mode === 'D')
const validator = computed(() => {
  return new Schema(getFieldValidRules(props.config.props.columns, validates, permConf, props.mode));
})

const updateKey = ref(0)
const errCells = ref({})

// 行级联动状态：rowPermConf[rowIndex][colKey] = 'E'|'R'|'H'
const rowPermConf = reactive({})
// 行级 watch 清理函数：rowWatchers[rowIndex] = [stopFn, ...]
const rowWatchers = {}
// 行级选项加载函数：rowOptionLoads[`${rowIndex}_${colKey}`] = loadFn（由 SinglePicker/MultiplePicker 注册）
// 仅作函数注册表，不需要响应式
const rowOptionLoads = {}
// 行级选项配置覆盖：rowOptionConf[rowIndex][colKey] = { optionType, static, http }（SET_OPTIONS 写入）
const rowOptionConf = reactive({})
provide('rowOptionLoads', rowOptionLoads)
provide('rowOptionConf', rowOptionConf)

// el-table 不会因外部 reactive 变化自动重渲染单元格，需要监听 rowPermConf 变化强制刷新
// 防抖：reevaluateRow 一次评估会多次修改 rowPermConf（先 delete 再写入），用 nextTick 合并到一次重建
let _updateKeyScheduled = false
function scheduleTableRebuild() {
  if (_updateKeyScheduled) return
  _updateKeyScheduled = true
  nextTick(() => {
    updateKey.value++
    _updateKeyScheduled = false
  })
}
watch(rowPermConf, scheduleTableRebuild, {deep: true})

// 组件卸载时清理所有行级 watcher，防止内存泄漏
// （通过事件处理器 addRow/copyRow 创建的 watcher 不在 Vue effect scope 内，不会自动销毁）
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
          _value.value[rowIndex][action.field] = Array.isArray(action.value) ? deepCopy(action.value) : action.value
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

// 获取单元格实际 mode（优先行级权限）
function getCellMode(rowIndex, colKey, col) {
  if (freeMode.value) return col.perm ?? permConf[colKey] ?? props.mode
  return rowPermConf[rowIndex]?.[colKey] ?? col.perm ?? permConf[colKey] ?? props.mode
}

// 判断单元格是否在当前行隐藏
function isCellHidden(rowIndex, colKey) {
  return getCellMode(rowIndex, colKey, {}) === 'H'
}

onBeforeMount( () => {
  //加载自定义校验规则
  if (validates.value){
    validates.value[props.config.key] = (rule, value, callback) => {
      //校验每个单元格
      const cols = props.config.props.columns
      const valids = []
      errCells.value = {}
      for (let i = 0; i < (_value.value || []).length; i++) {
        //每一行作为一个表单进行校验
        valids.push(validator.value.validate(_value.value[i]).then(() => {
          if (Array.isArray(errCells.value[i])) errCells.value[i].length = 0
        }).catch(({errors, fields}) => {
          errCells.value[i] = Object.keys(fields)
          return Promise.reject({errors, fields})
        }))
      }
      Promise.all(valids).then(() => {
        callback()
      }).catch(({errors, fields}) => {
        callback(new Error('校验失败：' + errors.map(v => v.message).join('、')))
      })
    }
  }
})

onMounted(() => {
  if (!freeMode.value) {
    setTimeout(() => updateKey.value++, 50)
    nextTick(() => {
      ;(_value.value || []).forEach((_, idx) => setupRowLinkage(idx))
    })
  }
})

const tbCellStyle = {
  background: 'var(--el-fill-color-darker)',
  padding: '10px 0',
  cursor: freeMode.value ? 'grab' :'unset'
}

function ck(column, ev) {
  ev.stopPropagation()
  const active = props.config.props.columns[column.no]
  if (active) {
    emit('update:active', active)
  }
}

function onChoose(ev) {
  const active = props.config.props.columns[ev.oldIndex]
  if (active) {
    _active.value = active
  }
}

function getRow(){
  let row = {}
  props.config.props.columns.forEach(col => row[col.key] = reactive())
  return row
}

function addRow() {
  if (!_value.value) _value.value = [getRow()]
  else _value.value.push(getRow())
  formItem?.validate?.()
  nextTick(() => setupRowLinkage((_value.value.length - 1)))
}

function delRow(i){
  cleanRowLinkage(i)
  _value.value.splice(i, 1)
  rebuildRowWatchers()
  formItem?.validate?.()
  // 保证无联动规则时也能强制表格重建，让 picker 以新索引重新注册 rowOptionLoads
  // 有规则时 rebuildRowWatchers 已通过 rowPermConf 变化触发 scheduleTableRebuild，这里会被合并（幂等）
  scheduleTableRebuild()
}

function copyRow(row){
  _value.value.push(deepCopy(row))
  const newIdx = (_value.value.length - 1)
  nextTick(() => setupRowLinkage(newIdx))
}

function getSummaries(param) {
  const { columns, data } = param
  const sums = []
  columns.forEach((column, index) => {
    const summaryCols = props.config.props.summaryCols
    if (summaryCols.length > 0 && props.config.props.showSort) {
      if (index === 0) {
        sums[index] = '合计'
        return
      }
    }
    if (summaryCols.indexOf(column.property) === -1) return;
    const values = data.map((item) => Number(item[column.property]))
    if (!values.every((value) => isNaN(value))) {
      sums[index] = values.reduce((prev, curr) => {
        const value = Number(curr)
        if (!isNaN(value)) {
          return sumToNum(prev, curr)
        } else {
          return prev
        }
      }, 0)
    } else {
      sums[index] = '...'
    }
  })
  return sums
}

function sumToNum(a, b) {
  // 获取 a 和 b 的小数位数
  const getDecimalDigits = (num) => {
    const str = num.toString();
    const decimalIndex = str.indexOf('.');
    return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
  };
  const digitsA = getDecimalDigits(a || 0);
  const digitsB = getDecimalDigits(b || 0);
  const maxDigits = Math.max(digitsA, digitsB);
  // 转换成整数运算
  const factor = 10 ** maxDigits;
  const intA = Math.round(a * factor);
  const intB = Math.round(b * factor);
  // 计算后再转换回小数
  return (intA + intB) / factor;
}

</script>

<template>
  <vue-draggable v-model="config.props.columns" target=".w-tb-header-cell" group="FormDesign"
                 style="width: -webkit-fill-available" class="w-form-cp-ct"
                 filter=".w-tb-op" handle=".w-cp-move" :animation="150" :disabled="!freeMode"
                 :ghostClass="freeMode ? 'w-f-cp-select': ''" :swapThreshold="0.2">
    <el-table :data="_value" :cell-style="{padding: 0}" header-row-class-name="w-tb-header-cell"
              :header-cell-style="tbCellStyle" @header-click="ck" max-height="500" :key="updateKey"
              border :style="{'z-index': freeMode ? 1 : 'auto'}" :summary-method="getSummaries"
              :show-summary="(config.props.summaryCols || []).length > 0">
      <template #empty v-if="freeMode">
        <span>👆拖拽字段到上方列内</span>
      </template>
      <el-table-column label="序号" align="center" width="60"  v-if="config.props.showSort">
        <template v-slot="scope">{{scope.$index + 1}}</template>
      </el-table-column>
      <template v-for="(col, i) in config.props.columns" :key="`col_${col.id}`">
        <el-table-column v-if="permConf[col.key] !== 'H'" min-width="100" ref="col" :prop="col.key" :label="col.name"
                         :width="(config.props.colWidths || {})[col.id]" show-overflow-tooltip
                         :class-name="`${mode === 'D' ? 'w-form-d-item':''} ${_active?.id === col.id && freeMode ? 'w-form-cp-active':''}`">
          <template #header>
            <div style="border: none !important;" :class="{'w-form-cp-active': _active?.id === col.id && freeMode}">
              <div class="w-form-component" v-if="_active?.id === col.id && freeMode">
                <el-icon color="#ffffff" class="w-cp-move"><Rank /></el-icon>
                <el-icon color="#ffffff" @click="copyField(config.props.columns, i)"><CopyDocument /></el-icon>
                <el-icon color="#ffffff" @click="delField(config.props.columns, i)"><Delete /></el-icon>
              </div>
              <div>
                {{col.name}}
                <span v-if="col.props.required" style="color: var(--el-color-danger)"> *</span>
              </div>
            </div>
          </template>
          <template v-slot="scope">
            <template v-if="!isCellHidden(scope.$index, col.key)">
              <form-component :index="scope.$index" :parents="config.props.columns" :config="col"
                              :mode="getCellMode(scope.$index, col.key, col)" v-model:active="_active"
                              v-model="_value[scope.$index][col.key]" :key="col.id" :type="col.type"/>
              <div class="w-tb-valid-err" v-if="(errCells[scope.$index] || []).indexOf(col.key) > -1"></div>
            </template>
          </template>
        </el-table-column>
      </template>
      <el-table-column v-if="mode === 'D' || mode === 'E'" fixed="right"
                       :width="config.props.columns.length === 0 ? undefined : 120"
                       label="操作" @click.native="ck" class-name="w-tb-op">
        <template #header>
          <span>操作</span>
          <el-button :disabled="mode === 'D'" icon="plus" @click="addRow" circle class="w-tb-op-add"/>
        </template>
        <template v-slot="scope">
          <el-link type="danger" underline="hover" @click="delRow(scope.$index)">删除</el-link>
          <el-divider direction="vertical"/>
          <el-link type="primary" underline="hover" @click="copyRow(scope.row)">复制</el-link>
        </template>
      </el-table-column>
    </el-table>
  </vue-draggable>
</template>

<style lang="less" scoped>
.w-f-cp-ct {
  height: 100%;
  min-height: 50px;
  background-color: var(--el-bg-color-page);
}

.w-tb-valid-err {
  border-bottom: 1px dashed var(--el-color-danger);
}

//为了美观，覆盖了一些表格内组件的默认样式
:deep(.el-table__row) {
  .el-input.is-focus .el-input__wrapper {
    box-shadow: none;
  }
  .cell{
    min-height: 30px;
    .el-input__wrapper, .el-select__wrapper, .el-input__inner, .el-textarea__inner{
      border-radius: 0;
      border: none;
      padding-left: 0;
      box-shadow: none;
    }
    .el-input__prefix{
      display: none;
    }

    .el-input-number__decrease, .el-input-number__increase {
      background: none;
      border: none;
    }

    .el-input-group__prepend {
      .el-select {
        background-color: var(--el-bg-color);
        max-width: 60px !important;
        .el-select__wrapper {
          background-color: var(--el-bg-color) !important;
        }
      }
    }
  }
}

.w-tb-op {
  position: relative;
  .w-tb-op-add {
    position: absolute;
    top: 5px;
    right: 5px;
  }
}

:deep(.w-tb-header-cell) {

  .w-form-cp-active {
    border: 1px dashed var(--el-color-primary) !important;
  }
}

.w-f-cp-select {
  border-radius: 2px;
  border: 1px dashed var(--el-color-primary) !important;
}

.w-form-component {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 9;
  display: none;
  border-radius: 5px 0 0 0;
  overflow: hidden;

  i {
    padding: 5px;
    cursor: pointer;
    background: var(--el-color-primary);
    &:hover {
      background: var(--el-color-primary-light-3);
    }
  }
}
</style>
