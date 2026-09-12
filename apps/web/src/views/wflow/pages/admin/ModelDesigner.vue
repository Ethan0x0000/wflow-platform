<script setup>
import FormProcessDesigner from "../../admin/FormProcessDesigner.vue";

//页面渲染完成移除加载效果
onMounted(() => window?.removeLoading())
</script>

<template>
  <form-process-designer/>
</template>

<style scoped lang="less">

</style>
