<script setup>
import WOrgPicker from "./WOrgPicker.vue";
import WOrgTags from "./WOrgTags.vue";

const props = defineProps({
  //选择类型，org、dept、user、role
  title: {
    type: String,
    default: '请选择'
  },
  size: {
    default: 20
  },
  parentId: { //父级部门ID
    type: Number,
    default: 0
  },
  type: {
    type: [String, Array],
    default: 'org'
  },
  excludes:{ //需要排除禁用的选项，对象数组，根据id + type
    type: Array,
    default: () => {
      return []
    }
  },
  multiple: Boolean, //是否多选
  placeholder: String
})

const _value = defineModel({
  type: Array,
  default: () => {
    return []
  }
})

const picker = ref()
function showPicker(){
  picker.value.open()
}

function selectOk(orgs) {
  _value.value = orgs
  picker.value.close()
  emit('change')
}

const emit = defineEmits(['change'])

</script>

<template>
  <div style="display: flex; align-items: center">
    <span @click="showPicker" style="margin-right: 20px">
      <slot>
        <el-button icon="plus" round></el-button>
      </slot>
    </span>
    <el-text v-show="_value.length === 0" style="color: var(--el-text-color-placeholder)">{{placeholder}}</el-text>
    <w-org-picker ref="picker" :parent-id="parentId" :multiple="multiple"
                  :type="type" @ok="selectOk" :excludes="excludes"
                  :title="title" :selected="_value"/>
    <w-org-tags inline v-model="_value" @change="$emit('change')"/>
  </div>
</template>

<style scoped lang="less">

</style>
