<template>
  <el-tabs>
    <el-tab-pane label="待我处理" lazy>
      <todo-page :code="code" picker-mode @confirm="v => $emit('confirm', v)"/>
    </el-tab-pane>
    <el-tab-pane label="我发起的" lazy>
      <submitted-page :code="code" picker-mode @confirm="v => $emit('confirm', v)"/>
    </el-tab-pane>
    <el-tab-pane label="我处理的" lazy>
      <ido-page :code="code" picker-mode @confirm="v => $emit('confirm', v)"/>
    </el-tab-pane>
    <el-tab-pane label="抄送我的" lazy>
      <cc-page :code="code" picker-mode @confirm="v => $emit('confirm', v)"/>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup>

import CcPage from "../pages/workspace/CcPage.vue";
import SubmittedPage from "../pages/workspace/SubmittedPage.vue";
import TodoPage from "../pages/workspace/TodoPage.vue";
import IdoPage from "../pages/workspace/IdoPage.vue";

const props = defineProps({
  code: {
    type: String,
    default: null
  }
})

defineEmits(['confirm'])
</script>

<style scoped lang="less">

</style>
