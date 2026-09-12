<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WTip from "../../../../common/WTip.vue";

const props = defineProps({
  ...FormComponentMixin.props
})

const colors = ['text', 'info', 'primary', 'success', 'warning', 'error']

</script>

<template>
  <el-form-item label="字段KEY">
    <el-input v-model="config.key" placeholder="请输入字段唯一key值"/>
  </el-form-item>
  <el-form-item label="字段名称">
    <el-input v-model="config.name" placeholder="请设置字段名称"/>
  </el-form-item>
  <el-form-item label="主题色">
    <div class="w-text-option">
      <div v-for="color in colors" @click="config.props.type = color"
           :style="`background-color: var(--el-color-${color})`">
        <el-icon v-if="color === config.props.type"><Select /></el-icon>
      </div>
    </div>
  </el-form-item>
  <el-form-item label="文字位置">
    <el-radio-group v-model="config.props.align">
      <el-radio-button label="靠左" value="left"/>
      <el-radio-button label="居中" value="center"/>
      <el-radio-button label="靠右" value="right"/>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="文字内容">
    <el-input v-model="config.props.content" placeholder="请设置显示的文字"/>
  </el-form-item>
  <el-form-item label="文字类型">
    <el-select v-model="config.props.tag">
      <el-option label="一级标题" value="h1"/>
      <el-option label="二级标题" value="h2"/>
      <el-option label="三级标题" value="h3"/>
      <el-option label="四级标题" value="h4"/>
      <el-option label="普通文字" value="div"/>
      <el-option label="加粗文字" value="b"/>
      <el-option label="字体倾斜" value="em"/>
      <el-option label="下划线" value="u"/>
      <el-option label="删除线" value="s"/>
    </el-select>
  </el-form-item>
  <el-form-item>
    <template #label>
      <span class="w-flex-col-ct">字体 <w-tip content="根据选择顺序来优先级来显示系统存在的字体"/></span>
    </template>
    <el-select multiple allow-create v-model="config.props.fonts" placeholder="不选为默认字体">
      <el-option label="宋体" value="宋体"/>
      <el-option label="黑体" value="黑体"/>
      <el-option label="华文仿宋" value="华文仿宋"/>
      <el-option label="Arial" value="Arial"/>
    </el-select>
  </el-form-item>
  <el-form-item label="显示*号">
    <el-switch v-model="config.props.showX"/>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
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
