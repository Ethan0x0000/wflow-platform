<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props,

})

const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

</script>

<template>
  <el-input show-word-limit :rows="3" type="textarea"
            :disabled="config.props.disable || mode === 'R'"
            v-if="mode !== 'V'"
            :maxlength="config.props.max || 255" v-model="_value"
            :placeholder="config.props.placeholder"/>
  <div style="line-height: 1.5; white-space: pre-line" v-text="_value || ''" v-else></div>
</template>

<style scoped>

</style>
