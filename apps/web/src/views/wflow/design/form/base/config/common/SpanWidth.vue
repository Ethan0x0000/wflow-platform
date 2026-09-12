<script setup>

const _value = defineModel({
  type: Number,
  default: 100
})
</script>

<template>
  <el-radio-group size="small" v-model="_value">
    <el-radio-button label="1/4" :value="24"/>
    <el-radio-button label="1/3" :value="33.3"/>
    <el-radio-button label="1/2" :value="50"/>
    <el-radio-button label="占满" :value="100"/>
  </el-radio-group>
</template>

<style scoped lang="less">

</style>
