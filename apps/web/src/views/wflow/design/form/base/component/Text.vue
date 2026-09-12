<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props
})

</script>

<template>
  <el-text type="warning" v-if="mode === 'D' && (config.props.content || '').trim() === ''">请设置文字内容😥</el-text>
  <component :is="config.props.tag || 'div'" v-else class="w-text"
             :style="{'text-align': config.props.align, display: 'block',
             color: `var(--el-color-${config.props.type || 'text'})`,
             'font-family': String(config.props.fonts || [])}"
             :type="config.props.type">
    <el-text v-if="config.props.showX" type="danger">*</el-text>
    {{ config.props.content }}
  </component>
</template>

<style scoped>
.w-text {
  --el-color-text: var(--el-text-color-primary) !important;
}

h1 {
  font-size: 2em !important;
}
</style>
