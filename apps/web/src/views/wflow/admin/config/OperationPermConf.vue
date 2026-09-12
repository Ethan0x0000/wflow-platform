<script setup>
import nodeMixin from "../../design/process/NodeMixin.js";

const props = defineProps({
  modelValue: Array
})

const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()


</script>

<template>
  <el-table :data="_value || []" border :header-cell-style="{ background: 'var(--el-fill-color-darker)' }">
    <el-table-column label="操作项" prop="name"></el-table-column>
    <el-table-column label="定义别名" prop="alisa">
      <template v-slot="scope">
        <el-input v-model="scope.row.alisa"/>
      </template>
    </el-table-column>
    <el-table-column align="center" label="允许操作" prop="enable">
      <template v-slot="scope">
        <el-checkbox v-model="scope.row.enable"/>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped lang="less">

</style>
