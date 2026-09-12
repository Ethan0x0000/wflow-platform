<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {$debounce, resolveByTemplate} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const formData = inject('formData', {})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const _url = ref('')
const loadUrl = $debounce(parsingUrl, 800)
function parsingUrl() {
  _url.value = resolveByTemplate(props.config.props.url, formData.value || {})
}

watch(() => props.config.props.url, loadUrl, {immediate: true})
watch(() => formData, loadUrl, {deep: true})
</script>

<template>
  <iframe v-if="(config.props.url || '') !== ''" scrolling="auto" frameborder="0"
          :src="_url" :height="config.props.height || 200 + 'px'" width="100%"></iframe>
  <el-text type="warning" v-else>请设置url地址</el-text>
</template>

<style scoped>

</style>
