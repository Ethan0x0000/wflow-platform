<template>
  <w-rich-editor :placeholder="config.props.placeholder" :max-height="config.props.maxHeight"
                 :readonly="mode !== 'E'" :class="{'w-form-v': mode === 'V'}"
                 :key="mode" v-model="_value" @blur="formItem?.validate?.()"/>
</template>

<script setup>
import WRichEditor from "../../../../common/editor/WRichEditor.vue";
import FormComponentMixin from "../../FormComponentMixin.js";
import {useFormItem} from "element-plus";
import {isRequired} from "@/utils/GlobalFunc.js";

const props = defineProps({
  ...FormComponentMixin.props
})
const validates = inject('validates', {})
const permConf = inject('permConf', {})
const _value = defineModel({
  type: String,
  default: ''
})
const {formItem} = useFormItem()

onBeforeMount(() => {
  //加载自定义校验规则
  if (validates.value){
    validates.value[props.config.key] = (rule, value, callback) => {
      if (isRequired(props.config.props.required, permConf[props.config.key] || props.mode)){
        if (!value || value.replace(/<\/?[a-z][\s\S]*?>/gi, '').trim() === '')
          callback(new Error('内容不能为空'))
        else callback()
      } else {
        callback()
      }
    }
  }
})
</script>

<style scoped lang="less">
.w-form-v {
  border: none;
  padding: 0;
}
</style>
