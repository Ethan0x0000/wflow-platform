<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

const type = computed(() => {
  switch (props.config.props.format) {
    case 'YYYY-MM-DD':
      return 'daterange'
    case 'YYYY-MM-DD HH:mm':
      return 'datetimerange'
    default:
      return 'daterange'
  }
})

</script>

<template>
  <el-date-picker style="width: calc(100% - 20px);" v-model="_value" clearable :value-format="config.props.format"
                  :format="config.props.format" :type="type" :disabled="mode === 'R'"
                   :start-placeholder="config.props.placeholder[0]" v-if="mode !== 'V'"
                  :end-placeholder="config.props.placeholder[1]"/>
  <span v-else>{{(_value || []).join(" ~ ")}}</span>
</template>

<style scoped>

</style>
