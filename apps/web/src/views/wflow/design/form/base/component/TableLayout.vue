<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {VueDraggable} from "vue-draggable-plus";
import FormComponent from "./FormComponent.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";
import {isFormItem} from "@/utils/ProcessUtil.js";

const props = defineProps({
  ...FormComponentMixin.props,
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel({type: Object, default: () => {return {}}})
const freeMode = computed(() => props.mode === 'D')
const _active = computed(FormComponentMixin.computed._active(props, emit))
const permConf = inject('permConf', {})

const wTable = ref()
const menuRef = ref()

let changeIndex = 0;
//拖拽缓存位置
const startPos = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
}
//选中的单元格索引
const selectedCell = reactive({ci: 0, ri: 0})
//弹出层位置
const position = reactive({x: 0, y: 0})

const startColumnResize = (event, index) => {
  startPos.x = event.clientX;
  changeIndex = index
  startPos.w = props.config.props.widths[index]
  document.addEventListener('mousemove', onColumnResize);
  document.addEventListener('mouseup', stopColumnResize);
};

const onColumnResize = async (event) => {
  const prop = props.config.props
  //获取移动格点及相邻的格点的总占比
  const sum = prop.widths[changeIndex] + prop.widths[changeIndex + 1];
  //计算移动的距离占整个表格的百分比
  let changeW = ((event.clientX - startPos.x) / wTable.value.offsetWidth * 100).toFixed(2);
  changeW = parseFloat(changeW)
  if (changeW + prop.widths[changeIndex] < 1) {
    prop.widths[changeIndex] = 1
    prop.widths[changeIndex + 1] = sum - 1
  } else if (changeW + prop.widths[changeIndex + 1] > sum) {
    prop.widths[changeIndex] = sum - 1
    prop.widths[changeIndex + 1] = 1
  } else {
    //禁止移动距离过长
    if (prop.widths[changeIndex] <= 1 && changeW < 0 || prop.widths[changeIndex + 1] <= 1 && changeW > 0) {
      return
    } else {
      prop.widths[changeIndex] += changeW
      prop.widths[changeIndex + 1] = sum - prop.widths[changeIndex]
    }
  }
  startPos.x = event.clientX
};

const stopColumnResize = async () => {
  document.removeEventListener('mousemove', onColumnResize);
  document.removeEventListener('mouseup', stopColumnResize);
};

const startRowResize = async (event, index) => {
  startPos.y = event.clientY;
  startPos.h = props.config.props.heights[index];
  changeIndex = index
  document.addEventListener('mousemove', onRowResize);
  document.addEventListener('mouseup', stopRowResize);
};

const onRowResize = async (event) => {
  const newHeight = startPos.h + (event.clientY - startPos.y);
  props.config.props.heights[changeIndex] = newHeight > 30 ? newHeight : 30; // 设置最小高度为20px
};

const stopRowResize = async () => {
  document.removeEventListener('mousemove', onRowResize);
  document.removeEventListener('mouseup', stopRowResize);
};

const openMenu = (ev, ri, ci) => {
  selectedCell.ri = ri
  selectedCell.ci = ci
  position.x = ev.clientX
  position.y = ev.clientY
  setTimeout(() => menuRef.value.handleOpen(), 100)
}

const addCp = ev => {
}

const resizeWidth = async () => {
  const _props = props.config.props
  const width = parseFloat((100 / _props.cellSpans[0].length).toFixed(2))
  _props.widths = _props.cellSpans[0].map(() => width)
}

const insert = async (pos) => {
  const ri = selectedCell.ri, ci = selectedCell.ci
  const _props = props.config.props
  switch (pos) {
    case 'top':
      _props.columns.splice(ri, 0, _props.columns[ri].map(() => []))
      _props.cellSpans.splice(ri, 0, deepCopy(_props.cellSpans[ri]))
      _props.heights.splice(ri, 0, 40)
      break
    case 'bottom':
      _props.columns.splice(ri + 1, 0, _props.columns[ri].map(() => []))
      _props.cellSpans.splice(ri + 1, 0, deepCopy(_props.cellSpans[ri]))
      _props.heights.splice(ri + 1, 0, 40)
      break
    case 'left':
      _props.columns.forEach(row => row.splice(ci, 0, []))
      _props.cellSpans.forEach(row => row.splice(ci, 0, {row: 1, col: 1}))
      resizeWidth()
     break
    case 'right':
      _props.columns.forEach(row => row.splice(ci + 1, 0, []))
      _props.cellSpans.forEach(row => row.splice(ci + 1, 0, {row: 1, col: 1}))
      resizeWidth()
      break
  }
}

const merge = async (pos) => {
  const ri = selectedCell.ri, ci = selectedCell.ci
  const _props = props.config.props
  const self = _props.cellSpans[ri][ci]
  switch (pos) {
    case 'top':
      let topRowIndex = ri - 1
      let top = _props.cellSpans[topRowIndex][ci]
      for (let i = ri - 1; i >= 0; i--) {
        top = _props.cellSpans[i][ci]
        if (top.row > 0) {
          topRowIndex = i
          break
        }
      }
      // 合并cellSpans
      top.row += self.row
      self.row = 0
      // 合并columns数据：将当前单元格的组件移动到目标单元格
      _props.columns[topRowIndex][ci] = _props.columns[topRowIndex][ci].concat(_props.columns[ri][ci])
      _props.columns[ri][ci] = []
      break
    case 'bottom':
      let bottomRowIndex = ri + 1
      let bottom = _props.cellSpans[ri + 1][ci]
      for (let i = ri + 1; i < _props.cellSpans.length; i++) {
        bottom = _props.cellSpans[i][ci]
        if (bottom.row > 0) {
          bottomRowIndex = i
          break
        }
      }
      // 合并cellSpans
      self.row += bottom.row
      bottom.row = 0
      // 合并columns数据：将目标单元格的组件移动到当前单元格
      _props.columns[ri][ci] = _props.columns[ri][ci].concat(_props.columns[bottomRowIndex][ci])
      _props.columns[bottomRowIndex][ci] = []
      break
    case 'left':
      let leftColIndex = ci - 1
      let left = _props.cellSpans[ri][leftColIndex]
      for (let i = ci - 1; i >= 0; i--) {
        left = _props.cellSpans[ri][i]
        if (left.col > 0) {
          leftColIndex = i
          break
        }
      }
      // 合并cellSpans
      left.col += self.col
      self.col = 0
      // 合并columns数据：将当前单元格的组件移动到目标单元格
      _props.columns[ri][leftColIndex] = _props.columns[ri][leftColIndex].concat(_props.columns[ri][ci])
      _props.columns[ri][ci] = []
      break
    case 'right':
      let rightColIndex = ci + 1
      let right = _props.cellSpans[ri][ci + 1]
      for (let i = ci + 1; i < _props.cellSpans[ri].length; i++) {
        right = _props.cellSpans[ri][i]
        if (right.col > 0) {
          rightColIndex = i
          break
        }
      }
      // 合并cellSpans
      self.col += right.col
      right.col = 0
      // 合并columns数据：将目标单元格的组件移动到当前单元格
      _props.columns[ri][ci] = _props.columns[ri][ci].concat(_props.columns[ri][rightColIndex])
      _props.columns[ri][rightColIndex] = []
      break
  }
}

const unMerge = async (isRow, targetRi = selectedCell.ri, targetCi = selectedCell.ci) => {
  const ri = targetRi, ci = targetCi
  const _props = props.config.props
  const spans = _props.cellSpans
  if (isRow) {
    const sum = spans[ri][ci].row
    // 获取主单元格的所有组件
    const allComponents = _props.columns[ri][ci]
    // 平均分配组件到各个单元格
    const componentsPerCell = Math.floor(allComponents.length / sum)
    const remainder = allComponents.length % sum

    for (let i = 0; i < sum; i++) {
      spans[ri + i][ci].row = 1
      // 分配组件数据
      const startIndex = i * componentsPerCell + Math.min(i, remainder)
      const endIndex = startIndex + componentsPerCell + (i < remainder ? 1 : 0)
      _props.columns[ri + i][ci] = allComponents.slice(startIndex, endIndex)
    }
  } else {
    const sum = spans[ri][ci].col
    // 获取主单元格的所有组件
    const allComponents = _props.columns[ri][ci]
    // 平均分配组件到各个单元格
    const componentsPerCell = Math.floor(allComponents.length / sum)
    const remainder = allComponents.length % sum

    for (let i = 0; i < sum; i++) {
      spans[ri][ci + i].col = 1
      // 分配组件数据
      const startIndex = i * componentsPerCell + Math.min(i, remainder)
      const endIndex = startIndex + componentsPerCell + (i < remainder ? 1 : 0)
      _props.columns[ri][ci + i] = allComponents.slice(startIndex, endIndex)
    }
  }
}

const del = async (isRow) => {
  const ri = selectedCell.ri, ci = selectedCell.ci
  const _props = props.config.props
  if (isRow) {
    //删除行，先判断是否有合并的单元格，然后从头开始删除，每一列都要注意是不是有合并的单元格
    //找到本单元格跨的行数
    const selfRow = _props.cellSpans[ri][ci].row
    //先遍历列，再遍历行进行数据调整
    for (let c = 0; c < _props.widths.length; c++) {
      //找到当前行这个列，判断是否有合并的单元格，有就继续处理，没就直接删除
      const cellRow = _props.cellSpans[ri][c].row
      if (cellRow > 1) {
        //是合并的单元格的主格，取消合并单元格
        unMerge(true, ri, c)
      }else if (cellRow < 1) {
        //是被合并的格子，需要向上找到主格子，然后取消合并
        for (let i = ri - 1; i >= 0; i--) {
          if (_props.cellSpans[i][c].row > 1) {
            unMerge(true, i, c)
            break
          }
        }
      }
    }
    //处理完成，直接删除行数据
    _props.heights.splice(ri, selfRow)
    _props.cellSpans.splice(ri, selfRow)
    _props.columns.splice(ri, selfRow)
  } else {
    //找到本单元格跨的列数
    const selfCol = _props.cellSpans[ri][ci].col
    //先遍历行，再遍历列进行数据调整
    for (let r = 0; r < _props.heights.length; r++) {
      //找到当前行这个列，判断是否有合并的单元格，有就继续处理
      const colRow = _props.cellSpans[r][ci].col
      if (colRow > 1) {
        //是合并的单元格的主格，取消合并单元格
        unMerge(false, r, ci)
      } else if (colRow < 1) {
        //是被合并的格子，需要向左找到主格子，然后取消合并
        for (let i = ci - 1; i >= 0; i--) {
          if (_props.cellSpans[r][i].col > 1) {
            unMerge(false, r, i)
            break
          }
        }
      }
    }
    //处理完成，直接删除列数据
    _props.widths.splice(ci, selfCol)
    _props.heights.forEach((v, row) => {
      _props.cellSpans[row].splice(ci, selfCol)
      _props.columns[row].splice(ci, selfCol)
    })
    resizeWidth()
  }
}
</script>

<template>
  <table ref="wTable" :class="{'w-table-layout': true, 'w-table-layout-render': true}"
         :style="config.props.fonts.length > 0 ? `font-family: ${String(config.props.fonts)}`: ''">
    <colgroup>
      <col v-for="(width, index) in config.props.widths" :key="index" :style="{width: width + '%'}" />
    </colgroup>
    <el-dropdown ref="menuRef" size="small" trigger="click">
      <div :style="{position: 'fixed', top: position.y + 'px', left: position.x + 'px'}"></div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="insert('top')">上方插入一行</el-dropdown-item>
          <el-dropdown-item @click="insert('bottom')">下方插入一行</el-dropdown-item>
          <el-dropdown-item @click="insert('left')">左侧插入一列</el-dropdown-item>
          <el-dropdown-item @click="insert('right')">右侧插入一列</el-dropdown-item>
          <el-dropdown-item divided @click="merge('top')" :disabled="selectedCell.ri <= 0">向上合并单元格</el-dropdown-item>
          <el-dropdown-item @click="merge('bottom')" :disabled="selectedCell.ri >= config.props.heights.length - 1">向下合并单元格</el-dropdown-item>
          <el-dropdown-item @click="merge('left')" :disabled="selectedCell.ci <= 0">向左合并单元格</el-dropdown-item>
          <el-dropdown-item @click="merge('right')" :disabled="selectedCell.ci >= config.props.widths.length - 1">向右合并单元格</el-dropdown-item>
          <el-dropdown-item divided @click="unMerge(true)" :disabled="config.props.cellSpans[selectedCell.ri][selectedCell.ci].row <= 1">取消行合并</el-dropdown-item>
          <el-dropdown-item @click="unMerge(false)" :disabled="config.props.cellSpans[selectedCell.ri][selectedCell.ci].col <= 1">取消列合并</el-dropdown-item>
          <el-dropdown-item divided @click="del(true)">删除当前行</el-dropdown-item>
          <el-dropdown-item @click="del(false)">删除当前列</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <tbody>
    <tr v-for="(row, ri) in config.props.columns" :key="`row_${ri}`"
        :style="{ height: config.props.heights[ri] + 'px', '--border-width': config.props.borderWidth + 'px'}">
      <template v-for="(cells, ci) in row" :key="`col_${ci}`">
        <td :colspan="config.props.cellSpans[ri][ci].col" :rowspan="config.props.cellSpans[ri][ci].row"
            v-if="config.props.cellSpans[ri][ci].col > 0 && config.props.cellSpans[ri][ci].row > 0">
          <div v-if="freeMode" class="w-table-layout-cell-op" @click="openMenu($event, ri, ci)">
            <el-icon color="white"><Menu /></el-icon>
          </div>
          <div class="resize-handle-col" v-if="ci < row.length - 1 && freeMode"
               @mousedown="startColumnResize($event, ci)"></div>
          <div class="resize-handle-row" v-if="freeMode" @mousedown="startRowResize($event, ri)"></div>
          <vue-draggable v-model="config.props.columns[ri][ci]" :animation="150" group="FormDesign" :disabled="!freeMode"
                         style="width: 100%; height: 100%;" @onAdd="addCp" handle=".w-cp-move" :swapThreshold="0.2"
                         :ghostClass="freeMode ? 'w-f-cp-select':''" :class="{'w-f-cp-ct':freeMode}">
            <template :key="item.id" v-for="(item, idx) in cells">
              <template v-if="permConf[item.key] !== 'H'">
                <el-form-item :label="item.name" :prop="item.key"
                              v-if="isFormItem(item, mode)" @click.stop="_active = item"
                              :class="{'w-form-d-item': freeMode, 'w-form-cp-active': _active?.id === item.id && freeMode,
                                      'w-form-cp-nlb':item.props.hideLabel, 'w-form-item-ep': item.props.allowPut}">
                  <form-component :index="idx" :parents="cells" :config="item"
                                  :mode="permConf[item.key] || mode" v-model:active="_active" v-model="_value[item.key]" :type="item.type"/>
                </el-form-item>
                <form-component v-else :config="item" :mode="permConf[item.key] || mode" v-model:active="_active" :type="item.type"
                                @click.stop="_active = item" v-model="_value" :index="idx" :parents="cells"
                                :class="{'w-form-d-item': freeMode, 'w-form-cp-active': _active?.id === item.id && freeMode}"/>
              </template>
            </template>
          </vue-draggable>
        </td>
      </template>
    </tr>
    </tbody>
  </table>
</template>

<style scoped lang="less">
.w-table-layout-render {
  table-layout: fixed;

  :deep(.el-form-item__content) {
    .el-input__wrapper, .el-select__wrapper, .el-textarea__inner {
      box-shadow: none;
    }

    .el-input-number__decrease, .el-input-number__increase {
      display: none;
    }

    .el-form-item__error {
      top: 95%;
      z-index: 1;
    }
  }
}

.w-table-layout {
  margin-bottom: 20px;
  border-collapse: collapse;
  width: 100%;
}

.el-form-item {
  margin-bottom: 0 !important;
}

th,
td {
  border: var(--border-width) solid var(--el-border-color-darker);
  position: relative;
}

td {
  &:hover {
    .w-table-layout-cell-op {
      display: block;
    }
  }
}

.resizeable {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resize-handle {
  width: 5px;
  cursor: ew-resize;
  background: #ddd;
}

.resize-handle-row {
  height: 5px;
  cursor: ns-resize;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.resize-handle-col {
  width: 5px;
  height: 100%;
  cursor: e-resize;
  position: absolute;
  bottom: 0;
  right: 0;
}

.w-table-layout-cell-op {
  display: none;
  cursor: pointer;
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 2px;
  padding-bottom: 0;
  z-index: 1;
  border-top-right-radius: 5px;
  background: var(--el-color-primary);
}

</style>
