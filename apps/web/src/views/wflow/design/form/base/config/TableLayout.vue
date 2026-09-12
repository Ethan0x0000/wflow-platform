<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {deepCopy} from "@/utils/GlobalFunc.js";
import WTip from "../../../../common/WTip.vue";

const props = defineProps({
  ...FormComponentMixin.props
})

const emit = defineEmits([...FormComponentMixin.emits])
const height = ref(30)
const pos = reactive({
  x: 0, y: 0
})

function initTable(r, c) {
  const _props = props.config.props
  //列宽
  const width = parseFloat((100 / c).toFixed(2))
  //重置单元格
  _props.widths.length = 0
  _props.heights.length = 0
  _props.cellSpans.length = 0
  _props.columns.length = 0
  const cellRow = [], colRow = [];
  for (let i = 0; i < c; i++) {
    cellRow.push({row: 1, col: 1})
    colRow.push([])
    _props.widths.push(width)
  }
  for (let i = 0; i < r; i++) {
    _props.heights.push(40)
    _props.cellSpans.push(deepCopy(cellRow))
    _props.columns.push(deepCopy(colRow))
  }

}

function resizeHeight() {
  const _props = props.config.props
  for (let i = 0; i < _props.heights.length; i++) {
    _props.heights[i] = height.value
  }
}

</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="表格大小">
    <el-popover width="180">
      <el-text>{{pos.y}}行 {{pos.x}}列  （单击确定）</el-text>
      <table @mouseleave="pos.x = 0; pos.y = 0">
        <tbody>
          <tr v-for="r in 15">
            <td v-for="c in 10" @mouseover="pos.y = r; pos.x = c"
                @click="initTable(r, c)" :class="{'w-table-layout-rs': pos.x >= c && pos.y >= r}"></td>
          </tr>
        </tbody>
      </table>
      <template #reference>
        <el-button icon="Menu">重置行列数</el-button>
      </template>
    </el-popover>
  </el-form-item>
  <el-form-item label="边框粗细">
    <el-input type="number" :min="1" :max="5" v-model="config.props.borderWidth" placeholder="表格边框粗细">
      <template #append>px</template>
    </el-input>
  </el-form-item>
  <el-form-item label="重置行高">
    <el-input type="number" :min="20" :max="500" v-model="height" placeholder="表格行高px">
      <template #append>
        <el-button @click="resizeHeight">重置</el-button>
      </template>
    </el-input>
  </el-form-item>
  <el-form-item>
    <template #label>
      <span class="w-flex-col-ct">内字体 <w-tip content="根据选择顺序来优先级来显示系统存在的字体"/></span>
    </template>
    <el-select multiple allow-create v-model="config.props.fonts" placeholder="不选为默认字体">
      <el-option label="宋体" value="宋体"/>
      <el-option label="黑体" value="黑体"/>
      <el-option label="华文仿宋" value="华文仿宋"/>
      <el-option label="Arial" value="Arial"/>
    </el-select>
  </el-form-item>
</template>

<style lang="less" scoped>
td {
  width: 10px;
  height: 10px;
  border: 1px solid var(--el-border-color-darker);
}
.w-table-layout-rs{
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}
</style>
