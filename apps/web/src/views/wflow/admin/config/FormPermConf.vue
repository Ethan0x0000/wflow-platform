<script setup>
import nodeMixin from "../../design/process/NodeMixin.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {storeToRefs} from "pinia";
import {getFormPermFields} from "@/utils/ProcessUtil.js";

const props = defineProps({
  ...nodeMixin.props,
  showE: {
    default: true
  },
  defaultPerm: { //默认加载的字段权限
    default: 'R'
  }
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const permSelect = ref('R')
const updateKey = ref(1)
const {formFields} = storeToRefs(useWflowStore())

//加载的时候判断，赋默认值
onBeforeMount(async () => {
  if (!_value.value){
    _value.value = []
  }
  permSelect.value = props.defaultPerm
  //提取所有的字段及字段默认权限列表
  const def = getFormPermFields(formFields.value, props.defaultPerm);
  //加载之前的权限
  def.forEach(v => {
    const i = _value.value?.findIndex(fv => fv.key === v.key)
    if (i > -1 && v.perm){
      v.perm = _value.value[i].perm
    }
  })
  _value.value = def
})

function allSelect(perm) {
  _value.value.forEach(v => v.perm = perm)
  updateKey.value ++
}

</script>

<template>
  <el-table :key="updateKey" :header-cell-style="{ background: 'var(--el-fill-color-darker)' }" :data="_value" border style="width: 100%">
    <template #empty>
      未解析到表单字段清单😥
    </template>
    <el-table-column prop="title" show-overflow-tooltip label="表单字段">
      <template v-slot="scope">
        <span v-if="scope.row.props?.required" style="color: var(--el-color-danger)"> * </span>
        <span>{{ scope.row.name }}</span>
      </template>
    </el-table-column>
    <el-table-column align="center" prop="readOnly" label="只读" width="80">
      <template #header="scope">
        <el-radio label="R" v-model="permSelect" @change="allSelect('R')">只读</el-radio>
      </template>
      <template v-slot="scope">
        <el-radio v-model="scope.row.perm" value="R" :name="scope.row.id"></el-radio>
      </template>
    </el-table-column>
    <el-table-column align="center" prop="editable" label="可编辑" width="90" v-if="showE">
      <template #header="scope">
        <el-radio label="E" v-model="permSelect" @change="allSelect('E')">可编辑</el-radio>
      </template>
      <template v-slot="scope">
        <el-radio v-model="scope.row.perm" value="E" :name="scope.row.id"></el-radio>
      </template>
    </el-table-column>
    <el-table-column align="center" prop="hide" label="隐藏" width="80">
      <template #header="scope">
        <el-radio label="H" v-model="permSelect" @change="allSelect('H')">隐藏</el-radio>
      </template>
      <template v-slot="scope">
        <el-radio v-model="scope.row.perm" value="H" :name="scope.row.id"></el-radio>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped lang="less">

</style>
