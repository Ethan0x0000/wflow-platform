<script setup>

defineProps({
  title: String,
  color: String,
  icon: String,
  disabled: Boolean,
  active: Boolean,
  size: [Number, String],
  showTip: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <el-tooltip placement="top" :content="title" trigger="hover">
    <iconify :style="size ? `font-size: ${size}px`: ''" @click="$emit('click')"
             :class="{'w-disabled': disabled, 'w-active': active}" :icon="icon"/>
  </el-tooltip>
</template>

<style scoped>
.w-disabled {
  pointer-events: none;
  color: #b4b4b4;

  &:hover {
    cursor: not-allowed !important;
  }
}

.w-active {
  background-color: var(--el-fill-color-darker);
}
</style>

