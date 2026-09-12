<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {$debounce, isEmpty, loadOptions} from "@/utils/GlobalFunc.js";
import {useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const formData = inject('formData', {})
const dsVars = inject('dsVars', {})
const optionLoads = inject('optionLoads', {})
const rowOptionLoads = inject('rowOptionLoads', null)
const rowOptionConf = inject('rowOptionConf', null)
const {formItem} = useFormItem();

const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const updateKey = ref(0)

const options = ref([])
const doGetOption = $debounce(_loadOptions, 500)
onBeforeMount(() => {
  optionLoads[props.config.key] = doGetOption
  if (rowOptionLoads && props.index != null) {
    rowOptionLoads[`${props.index}_${props.config.key}`] = doGetOption
  }
})

onBeforeUnmount(() => {
  // 清理全局和行级 loader 注册，防止持有已卸载组件的 closure
  delete optionLoads[props.config.key]
  if (rowOptionLoads && props.index != null) {
    delete rowOptionLoads[`${props.index}_${props.config.key}`]
  }
})

// 行索引变化时（行删除导致索引偏移），更新注册
watch(() => props.index, (newIdx, oldIdx) => {
  if (!rowOptionLoads) return
  if (oldIdx != null) delete rowOptionLoads[`${oldIdx}_${props.config.key}`]
  if (newIdx != null) rowOptionLoads[`${newIdx}_${props.config.key}`] = doGetOption
})

// 行级选项配置变化时重载
watch(() => rowOptionConf?.[props.index]?.[props.config.key], doGetOption, {deep: true})

onMounted(() => {
  _loadOptions()
})

//回显选中状态
async function loadStatus() {
  if (_value.value && props.config.props.expanding){
    setTimeout(() => {
      const idx = options.value.findIndex(v => v.value === _value.value.value)
      if (idx > -1) {
        _value.value = options.value[idx]
      }
    }, 100)
  }
}

async function _loadOptions() {
  // 行级选项配置优先（由行内联动 SET_OPTIONS 动作写入）
  const rowConf = rowOptionConf?.[props.index]?.[props.config.key]
  const prop = rowConf ? {...props.config.props, ...rowConf} : props.config.props
  loadOptions({...formData.value, ...dsVars.value}, prop).then(op => {
    options.value = op
    if (!_value.value && props.config.props.defaultValue) {
      _value.value = props.config.props.defaultValue
      setTimeout(loadStatus, 100)
    } else {
      loadStatus()
    }
  }).catch(() => options.value = [])
}

watch(() => props.config.props.http, doGetOption, {deep: true, immediate: false})
watch(() => props.config.props.optionType, doGetOption, {immediate: false})
watch(() => props.modelValue, () => {
  //为了在展开模式值变化时回显
  if (props.config.props.expanding) loadStatus()
})
</script>

<template>
  <div v-if="mode !== 'V'" style="width: 100%;">
    <template v-if="config.props.expanding" :key="config.props.optionType">
      <el-text type="info" v-if="mode === 'D' && config.props.optionType === 'datasource'">从数据源提取选项</el-text>
      <el-text type="info" v-else-if="options.length === 0">暂无可选项</el-text>
      <el-radio-group v-else v-model="_value" :key="updateKey" :disabled="mode === 'R'"
                      @change="formItem?.validate?.()">
        <el-radio v-for="(op, i) in options" :label="op.label" :value="op"/>
      </el-radio-group>
    </template>
    <el-select v-else value-key="value" v-model="_value" :disabled="mode === 'R'"
               @change="formItem?.validate?.()" @clear="_value = null"
               clearable :placeholder="config.props?.placeholder" style="width: 100%">
      <el-option v-for="(op, i) in options" :label="op.label" :value="op"/>
    </el-select>
  </div>
  <span v-else>{{_value?.label || ''}}</span>
</template>

<style scoped>

</style>
