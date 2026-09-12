<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {$debounce, deepCopy, loadOptions} from "@/utils/GlobalFunc.js";
import {useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const formData = inject('formData', {})
const dsVars = inject('dsVars', {})
const optionLoads = inject('optionLoads', {})
const rowOptionLoads = inject('rowOptionLoads', null)
const rowOptionConf = inject('rowOptionConf', null)
const {formItem} = useFormItem()

const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const map = new Map()

const options = ref([])
const updateKey = ref(0)

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
//回显选中状态，由于elementUI机制问题，需要绑定对象，这里需要使用选项终端对象
async function loadStatus() {
  if (_value.value && props.config.props.expanding){
    map.clear()
    options.value.forEach(v => map.set(v.value, v))
    const diffs = []
    _value.value = (_value.value || []).map(v => {
      if (map.has(v.value)) {
        //如果选项内有，就返回选项内的对象
        return map.get(v.value)
      }
      //没有的话，说明选项被移除了，展开的情况需要补一下
      diffs.push(v)
      return v
    });
    _value.value.unshift(...diffs)
    setTimeout(() => updateKey.value ++, 200)
  }
}


async function _loadOptions() {
  // 行级选项配置优先（由行内联动 SET_OPTIONS 动作写入）
  const rowConf = rowOptionConf?.[props.index]?.[props.config.key]
  const prop = rowConf ? {...props.config.props, ...rowConf} : props.config.props
  loadOptions({...formData.value, ...dsVars.value}, prop).then(op => {
    options.value = op
    if (!_value.value && props.config.props.defaultValue) {
      _value.value = deepCopy(props.config.props.defaultValue)
      setTimeout(loadStatus, 100)
    } else {
      loadStatus()
    }
  }).catch(() => options.value = [])
}

watch(() => props.config.props.http, doGetOption, {deep: true, immediate: false})
watch(() => props.config.props.optionType, doGetOption, {immediate: false})
</script>

<template>
  <div v-if="mode !== 'V'">
    <template v-if="config.props.expanding">
      <el-text type="info" v-if="mode === 'D' && config.props.optionType === 'datasource'">从数据源提取选项</el-text>
      <el-text type="warning" v-else-if="mode === 'E' && options.length === 0">暂无可选项</el-text>
      <el-checkbox-group value-key="value" :key="updateKey" :disabled="mode === 'R'"
                         v-else v-model="_value" @change="formItem?.validate?.()">
        <el-checkbox v-for="(op, i) in options" :label="op.label" :value="op"/>
      </el-checkbox-group>
    </template>

    <el-select multiple clearable value-key="value" v-else v-model="_value" style="width: 100%"
               @change="formItem?.validate?.()"
               :disabled="mode === 'R'" :placeholder="config.props?.placeholder">
      <el-option v-for="(op, i) in options" :label="op.label" :value="op"/>
    </el-select>
  </div>
  <span v-else>{{(_value || []).map(v => v.label).join("、")}}</span>
</template>

<style scoped>

</style>
