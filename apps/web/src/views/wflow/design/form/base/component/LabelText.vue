<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props
})

</script>

<template>
  <div class="w-label-text" :style="`${config.props.showBgc ? `background: ${config.props.color}20`:''}`">
    <span :style="{background: config.props.color}"></span>
    <el-text>{{config.props.placeholder}}</el-text>
  </div>
</template>

<style scoped>
.w-label-text {
  display: flex;
  width: 100%;
  align-items: center;
  span:first-child{
    display: inline-block;
    width: 5px;
    height: 30px;
    border-radius: 2px;
    margin-right: 5px;
  }
}
</style>
