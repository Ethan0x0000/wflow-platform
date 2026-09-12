<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WOrgPicker from "../../../../common/WOrgPicker.vue";
import WOrgTags from "../../../../common/WOrgTags.vue";
import {useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const {formItem} = useFormItem()
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const orgPicker = ref()

function selectOk(users){
  _value.value = users
  formItem?.validate?.()
  orgPicker.value.close()
}

</script>

<template>
  <div style="display: flex; align-items: center" v-if="mode !== 'V'">
    <el-button v-if="mode !== 'R'" icon="plus" @click="orgPicker.open()" round></el-button>
    <w-org-tags @change="formItem?.validate?.()" :disabled="mode === 'R'" inline
                v-model="_value" v-if="_value?.length > 0"/>
    <el-text class="w-placeholder" v-else>{{config.props.placeholder}}</el-text>
    <w-org-picker :multiple="config.props.multiple" ref="orgPicker" type="user" :selected="_value" @ok="selectOk"/>
  </div>
  <span v-else> {{(_value || []).map(v => v.name).join("、")}}</span>
</template>

<style scoped>
</style>
