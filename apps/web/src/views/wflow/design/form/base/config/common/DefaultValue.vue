<script setup>
import {FormComponents} from "../../../FormComponents.js";
import componentMixin from "../../../FormComponentMixin.js";

const props = defineProps({
  config: {
    type: Object,
    default: () => {
      return {}
    }
  },
  placeholder: String
})
const emit = defineEmits([...componentMixin.emits])
const _value = defineModel({type: [Array, Object, String, Number]})

const updateKey = ref(0)
//移除默认值设置项，防止影响
const cpConf = computed(() => {
  //updateKey.value ++
  const conf = JSON.parse(JSON.stringify(props.config))
  if (!props.config.id) {
    return {}
  }
  conf.props.placeholder = props.placeholder
  conf.props.expanding = false
  delete conf.props.disable
  delete conf.props.defaultValue
  return conf
})

watch(() => props.config.props, () => {
  if (props.config.type === 'SinglePicker' || props.config.type === 'MultiPicker') {
    updateKey.value++
  }
}, {deep: true})
</script>

<template>
  <component style="width: 100%" :key="updateKey" v-model="_value" :is="FormComponents[cpConf.type]" :config="cpConf" />
</template>

<style scoped lang="less">

</style>
