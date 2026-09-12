<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
const ComponentRender = defineAsyncComponent(() => import("../../../../common/dynamic/ComponentRender.vue"));
import {useFormCpDefaultValue} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()

useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-text type="warning" v-if="(config.props.sfc || '').trim() === ''">请编写组件SFC代码</el-text>
  <component-render v-else :props="props" v-model="_value" :sfc="config.props.sfc"/>
</template>

<style scoped>

</style>
