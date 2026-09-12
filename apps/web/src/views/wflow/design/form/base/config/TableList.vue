<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {VueDraggable} from "vue-draggable-plus";
import RowLinkageConf from "../conf/RowLinkageConf.vue";
import WDialog from "@/views/wflow/common/WDialog.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})

const numberCols = computed(() => {
  return props.config.props.columns.filter(v => v.valueType === 'number')
})

const emit = defineEmits([...FormComponentMixin.emits])

const rowVisible = ref(false)
const tempRowRules = ref([])

function showRowLinkage() {
  rowVisible.value = true
  tempRowRules.value = deepCopy(props.config.props.rowLinkageRules || [])
}

function confirmRowLinkage() {
  rowVisible.value = false
  props.config.props.rowLinkageRules = tempRowRules.value
}
</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="合计列">
    <el-select v-model="config.props.summaryCols" multiple placeholder="选择需要显示合计的列">
      <el-option :label="col.name" :value="col.key" v-for="col in numberCols" :key="col.id"/>
    </el-select>
  </el-form-item>
  <el-form-item label="列设置">
    <el-text type="info">可拖拽列顺序及设置列宽</el-text>
    <vue-draggable class="w-pm-groups" v-model="config.props.columns" :animation="150" handle=".w-pm-drag">
      <template v-for="(col, i) in config.props.columns" :key="col.id">
        <div class="w-flex-col-ct" style="margin-bottom: 5px">
          <iconify class="w-pm-drag" icon="ci:drag-vertical"/>
          <el-text style="width: 80px;" truncated>{{col.name}}</el-text>
          <el-input style="width: 90px;" placeholder="列宽px" type="number" :min="100"
                    v-model="config.props.colWidths[col.id]"></el-input>
        </div>
      </template>
    </vue-draggable>
  </el-form-item>
  <el-form-item label="内部联动">
    <el-button icon="Histogram" @click="showRowLinkage">设置行内联动规则</el-button>
  </el-form-item>
  <el-form-item label="显示序号">
    <el-switch v-model="config.props.showSort"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <w-dialog v-model="rowVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmRowLinkage" cancel-text="取消">
    <template #title>行内联动规则</template>
    <row-linkage-conf :columns="config.props.columns" :parent-key="config.key" :parent-name="config.name" v-model="tempRowRules"/>
  </w-dialog>
</template>

<style lang="less" scoped>
.w-pm-drag {
  cursor: grab;
  font-size: medium;
}
</style>
