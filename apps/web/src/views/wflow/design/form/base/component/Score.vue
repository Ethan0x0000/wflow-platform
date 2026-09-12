<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props,
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

const icon = computed(() => {
  const ico = props.config.props.icon
  return [ico, ico, ico]
})

const color = computed(() => {
  const icoColor = props.config.props.color
  return [icoColor, icoColor, icoColor]
})


</script>

<template>
  <el-rate :allow-half="config.props.enableHalf" clearable :void-icon="props.config.props.icon"
           :max="config.props.max" :show-score="config.props.showScore" :text-color="config.props.color"
           v-model="_value" :colors="color" :icons="icon" :disabled="mode === 'R'"/>
</template>

<style scoped>

</style>
