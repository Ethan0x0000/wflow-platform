<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WDialog from "../../../../common/WDialog.vue";
import WInstPicker from "../../../../common/WInstPicker.vue";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {ElMessage, useFormItem} from "element-plus";
import ProcessInstPreview from "../../../../pages/workspace/subs/ProcessInstPreview.vue";

const props = defineProps({
  ...FormComponentMixin.props
})
const showDialog = ref(false)
const instanceRef = ref()
const _value = defineModel()
const {formItem} = useFormItem()
function confirm(inst) {
  if ((_value.value || []).some(v => v.value === inst.instId)) {
    ElMessage.warning('该流程已被添加')
  } else {
    showDialog.value = false
    const val = {
      value: inst.instId,
      label: inst.title
    }
    if (_value.value) _value.value.push(val)
    else _value.value = [val]
    formItem?.validate?.()
  }
}

function removeInst(i) {
  _value.value.splice(i, 1)
  formItem?.validate?.()
}
</script>

<template>
  <div class="w-inst-quote">
    <el-text type="warning" v-if="isEmpty(config.props.code)">请设置要引用的流程类型😥</el-text>
    <template v-else-if="mode === 'D' || mode === 'E'">
      <el-button icon="Plus" round @click="showDialog = true" style="margin-right: 10px"
                 v-if="!(!config.props.multiple && _value?.length > 0)">
        {{config.props.addText}}
      </el-button>
      <el-text v-if="!_value?.length > 0" class="w-placeholder">{{config.props.placeholder}}</el-text>
      <w-dialog close-free width="900" title="请选择流程实例" v-model="showDialog">
        <w-inst-picker :code="config.props.code" @confirm="confirm"/>
      </w-dialog>
    </template>
    <div class="w-inst-quote_item" v-for="(item, i) in _value" :key="item.value" @click="instanceRef.open(item.value)">
      <el-link>{{item.label}}</el-link>
      <el-icon @click.stop="removeInst(i)" v-if="mode === 'E'" class="w-inst-quote_close"><Close /></el-icon>
    </div>
    <process-inst-preview ref="instanceRef"/>
  </div>
</template>

<style lang="less" scoped>
.w-inst-quote {
  display: flex;
  flex-wrap: wrap;

  .w-inst-quote_item {
    cursor: pointer;
    display: flex;
    align-items: center;
    line-height: 20px;
    margin: 5px 15px 5px 0px;

    .w-inst-quote_close {
      margin-left: 5px;
      color: var(--el-color-info);
      padding: 2px;
      font-size: small;

      &:hover {
        border-radius: 50%;
        background-color: var(--el-fill-color-darker);
      }
    }
  }

  .w-placeholder {
    margin-left: 0 !important;
  }
}
</style>
