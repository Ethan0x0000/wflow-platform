<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props,
  modelValue: {
    type: Object,
    default: () => {
      return {}
    }
  }
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

onMounted(() => {

})
</script>

<template>
  <el-input :placeholder="config.props?.placeholder" :disabled="mode === 'R'"
            v-if="mode !== 'V'" v-model="_value" :clearable="config.props?.enableClear"
  />
  <span v-else>{{_value || ''}}</span>
</template>

<style scoped>

</style>
