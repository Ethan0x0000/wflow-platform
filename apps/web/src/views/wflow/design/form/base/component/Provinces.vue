<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import { areaList } from '@vant/area-data'
import {isEmpty, useFormCpDefaultValue} from "@/utils/GlobalFunc.js";
import {dayjs, useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const value = ref([])
const {formItem} = useFormItem()
const _value = computed({
  get() {
    if (!isEmpty(props.modelValue))
      return props.modelValue.split('-')
    else return []
  },
  set(val) {
    const value = Array.isArray(val) ? val.join('-') : val
    emit('update:modelValue', value)
  }
})
const treeData = ref([])
async function loadTreeData() {
  const province_list = Object.assign({}, areaList.province_list)
  const city_list = Object.assign({}, areaList.city_list)
  const county_list = Object.assign({}, areaList.county_list)
  treeData.value.length = 0
  for (const k in province_list) {
    let province = {
      label: province_list[k],
      value: province_list[k],
      children: [],
    }
    if (props.config.props.level >= 2) {
      for (const k2 in city_list) {
        let v = k2 - k
        if (v > 0 && v < 10000) {
          let city = {
            label: city_list[k2],
            value: city_list[k2],
            children: [],
          }
          if (props.config.props.level > 2) {
            for (const k3 in county_list) {
              let v2 = k3 - k2
              if (v2 > 0 && v2 < 100) {
                let county = {
                  label: county_list[k3],
                  value: county_list[k3],
                }
                delete county_list[k3]
                city.children.push(county)
              }
            }
          } else {
            city.children = undefined
          }
          delete city_list[k2]
          province.children.push(city)
        }
      }
    } else {
      province.children = undefined
    }
    delete province_list[k]
    treeData.value.push(province)
  }
}

onBeforeMount(loadTreeData)
useFormCpDefaultValue(props, _value)
</script>

<template>
  <el-cascader v-model="_value" style="width: 100%" v-if="mode !== 'V'" @change="formItem?.validate?.()"
               clearable separator="-" :options="treeData" :disabled="mode === 'R'"/>
  <el-text v-else>{{(_value || []).join('-')}}</el-text>
</template>

<style scoped>

</style>
