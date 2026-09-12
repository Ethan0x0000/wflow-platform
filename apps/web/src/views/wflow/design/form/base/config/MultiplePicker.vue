<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {VueDraggable} from "vue-draggable-plus";
import WHttpConfig from "../../../../common/WHttpConfig.vue";
import WDialog from "../../../../common/WDialog.vue";
import DefaultValue from "./common/DefaultValue.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";
import ValueType from "../../ValueType.js";
import OptionsConf from "@/views/wflow/design/form/base/config/common/OptionsConf.vue";

const props = defineProps({
  ...FormComponentMixin.props
})
const dsOptions = inject('dsOptions', [])
const httpVisible = ref(false)
const httpRef = ref()
const tempHttp = ref({})

const emit = defineEmits([...FormComponentMixin.emits])

//过滤出选项类型的数据源
const options = computed(() => {
  const op = dsOptions.value.map(items => {
    items.children = items.children.filter(v => v.valueType === ValueType.options)
    return items
  })
  return op.filter(ds => ds.children && ds.children.length > 0)
})

function addOption() {
  const option = `选项${props.config.props.static.length + 1}`
  props.config.props.static.push({label: option, value: option})
}

function configHttp() {
  httpVisible.value = true;
  tempHttp.value = deepCopy(props.config.props.http)
}

function configHttpOk() {
  if (httpRef.value.validate()) {
    props.config.props.http = deepCopy(tempHttp.value);
    httpVisible.value = false
  }
}

function changeOption(i, v) {
  props.config.props.static[i].label = v
  props.config.props.static[i].value = v
}


</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="提示文字">
    <el-input v-model="config.props.placeholder" placeholder="输入提示"/>
  </el-form-item>
  <options-conf v-model="config.props"/>
  <el-form-item label="默认值">
    <default-value v-model="config.props.defaultValue" :config="config" placeholder="设置默认值"/>
  </el-form-item>
  <el-form-item label="选项展开">
    <el-switch v-model="config.props.expanding"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
</template>

<style lang="less" scoped>
:deep(.w-fd-options) {
  .el-input-group__append, .el-input-group__prepend {
    padding: 0 10px;
  }
}

.w-move {
  cursor: move;
}
</style>
