<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import RowLinkageConf from "../conf/RowLinkageConf.vue";
import WDialog from "@/views/wflow/common/WDialog.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})

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
  <el-form-item label="提示文字">
    <el-input v-model="config.props.placeholder" placeholder="输入提示"/>
  </el-form-item>
  <el-form-item label="标签位置">
    <el-radio-group v-model="config.props.labelPosition">
      <el-radio-button label="上面" value="top"/>
      <el-radio-button label="靠左" value="left"/>
      <el-radio-button label="靠右" value="right"/>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="标签宽度">
    <el-input type="number" v-model="config.props.labelWidth"></el-input>
  </el-form-item>
  <el-form-item label="内部联动">
    <el-button icon="Histogram" @click="showRowLinkage">设置项内联动规则</el-button>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="禁止编辑">
    <el-switch v-model="config.props.disable"/>
  </el-form-item>

  <w-dialog v-model="rowVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmRowLinkage" cancel-text="取消">
    <template #title>内部联动规则</template>
    <row-linkage-conf :columns="config.props.columns" :parent-key="config.key" :parent-name="config.name" v-model="tempRowRules"/>
  </w-dialog>
</template>

<style lang="less" scoped>

</style>
