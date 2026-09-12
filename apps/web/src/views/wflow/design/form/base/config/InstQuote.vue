<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {getProcGroupItemsList} from "@/api/model.js";
import {ElMessage} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})

const groupItems = ref([])

onMounted(loadOptions)
function loadOptions() {
  if (groupItems.value.length === 0) {
    getProcGroupItemsList().then(res => {
      groupItems.value = res.data.filter(g => g.items.length > 0).map(group => {
        return {
          value: group.id,
          label: group.name,
          children: group.items.map(it => {
            return {
              value: it.code,
              label: it.procName,
            }
          })
        }
      })
    }).catch(err => {
      ElMessage.error(err.msg)
    })
  }
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
    <el-input v-model="config.props.placeholder" placeholder="请设置显示的文字"/>
  </el-form-item>
  <el-form-item label="按钮文字">
    <el-input v-model="config.props.addText" placeholder="添加按钮的文字"/>
  </el-form-item>
  <el-form-item label="选择流程">
    <el-cascader clearable :show-all-levels="false" :options="groupItems" :props="{emitPath: false}"
                 placeholder="选择引用类型" v-model="config.props.code"/>
  </el-form-item>
  <el-form-item label="是否多选">
    <el-switch v-model="config.props.multiple"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
</template>

<style lang="less" scoped>
.w-text-option {
  --el-color-text: var(--el-text-color-primary) !important;
}
.w-text-option {
  display: flex;
  justify-content: space-between;
  align-items: center;

  & > div {
    width: 25px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    margin-right: 10px;
    color: white;
    cursor: pointer;
  }
}
</style>
