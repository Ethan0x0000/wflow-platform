<script setup>
const props = defineProps({
  content: String
})
</script>

<template>
  <el-tooltip :content="content" placement="top">
    <template #content>
      <span v-html="content"></span>
    </template>
    <el-icon style="cursor: help;"><QuestionFilled /></el-icon>
  </el-tooltip>
</template>

<style scoped lang="less">

</style>
