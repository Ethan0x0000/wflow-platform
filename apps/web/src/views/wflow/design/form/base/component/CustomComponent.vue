<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
const ComponentRender = defineAsyncComponent(() => import('../../../../common/dynamic/ComponentRender.vue'))
import {getFormById, getFormByType} from "@/api/form.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const sfc = ref('')
const loading = ref(false)
const isError = ref(false)
const error = ref('')

function getCpDetail(cp) {
  loading.value = true
  isError.value = false
  const getFormCp = cp.props.cpId ? getFormById(cp.props.cpId) : getFormByType(cp.props.cpType)
  getFormCp.then(res => {
    loading.value = false
    cp.props.cpId = res.data.id
    try {
      const _sfc = JSON.parse(res.data.sfc)
      sfc.value = _sfc.pc
    } catch (e) {
      sfc.value = res.data.sfc
    }
  }).catch(err => {
    isError.value = true
    loading.value = false
    error.value = err.msg
  })
}

onBeforeMount(() => {
  getCpDetail(props.config)
})
</script>

<template>
  <el-text v-if="isError" type="danger" truncated>组件加载失败: {{error}}</el-text>
  <component-render v-else :props="{...props, props: props.config.props, mode}"
                    v-loading="loading" v-model="_value" :sfc="sfc"/>
</template>

<style scoped lang="less">

</style>
