<script setup>

const props = defineProps({
  type: {
    type: String,
    default: 'primary'
  },
  closable: {
    type: Boolean,
    default: false
  },
  showIcon: Boolean,
  content: String
})
</script>

<template>
  <div :class="{'w-bright-block': true, 'w-bright-block-primary': type === 'primary'}">
    <el-alert :show-icon="showIcon" :closable="closable"
              :type="type === 'primary' ? 'info' : type" :description="content"/>
  </div>

</template>

<style scoped lang="less">
.w-bright-block {
  width: 100%;

  :deep(.el-alert) {
    padding: 3px 10px;

    .el-icon {
      font-size: 18px;
      margin-right: 2px;
    }

    .el-alert__description {
      line-height: 25px;
    }
  }

  .el-alert--warning {
    border: 1px solid var(--el-color-warning);
  }

  .el-alert--success {
    border: 1px solid var(--el-color-success);
  }

  .el-alert--info {
    border: 1px solid var(--el-color-info);
  }

  .el-alert--error {
    border: 1px solid var(--el-color-danger);
  }
}

.w-bright-block-primary {
  :deep(.el-alert) {
    background-color: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary);
    color: var(--el-color-primary);

    .el-alert__description {
      color: var(--el-color-primary);
    }
  }
}
</style>
