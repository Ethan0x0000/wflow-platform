<script setup>

import {createProcGroup, getProcGroup} from "@/api/model.js";
import WOrgPlusPicker from "../common/WOrgPlusPicker.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import WIconSelect from "../common/WIconSelect.vue";
import WTip from "../common/WTip.vue";

const i18n = useI18n()

const props = defineProps({
  modelValue: Object
})
const form = ref()

defineExpose({validate})

const _value = defineModel()

const groupList = ref([])

function validate() {
  return new Promise((resolve, reject) => {
    form.value.validate().then(() => resolve()).catch(err => {
      reject(Object.keys(err).map(v => err[v][0].message))
    })
  })
}

function getGroupList() {
  getProcGroup().then(res => {
    groupList.value = res.data
  })
}

onBeforeMount(getGroupList)

const rules = {
  procName: [
    {required: true, message: i18n.t('design.base.rule.name[0]'), trigger: 'blur'},
    {min: 2, max: 20, message: `${i18n.t('design.base.rule.name[1]')}`, trigger: 'blur'}
  ],
  groupId: [
    {required: true, message: i18n.t('design.base.rule.group'), trigger: 'blur'}
  ],
  startupPerm: {
    validator: (rule, value, callback) => {
      if (_value.value.startupRange === 'RANGE' && value.length === 0) {
        callback(new Error('请添加允许的发起范围'))
      } else {
        callback()
      }
    },
    target: 'blur'
  }
}
const colors = [
  '#ff4500',
  '#ff8c00',
  '#ffd700',
  '#90ee90',
  '#00ced1',
  '#1e90ff',
  '#c71585',
  'rgba(255, 69, 0, 0.68)',
  'rgb(255, 120, 0)',
  'hsl(181, 100%, 37%)',
  'hsla(209, 100%, 56%, 0.73)',
  '#c7158577',
  '#399161',
  '#248689',
  '#B1B433',
  '#59B2AD',
  '#EC6269',
  '#238B8C'
]

function newGroup() {
  ElMessageBox.prompt('请输入分组名称并提交', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputPattern: /^[\s\S]{2,30}$/,
    inputPlaceholder: "请输入分组名称",
    inputErrorMessage: '字符长度为2~30',
  }).then(({value}) => {
    createProcGroup(value).then(res => {
      ElMessage.success(res.data)
      getGroupList()
    }).catch(err => ElMessage.error(err.msg))
  })
}
</script>

<template>
  <el-main class="w-designer-base">
    <el-form ref="form" :rules="rules" :model="_value" label-position="top">
      <el-form-item prop="icon" :label="$t('design.base.logo')">
        <iconify :icon="_value.logo.name" class="w-process-icon"
                 :style="{'background': _value.logo.bgc, color: _value.logo.color}"/>
        <div style="margin: 0 40px">
          <el-text>{{ $t('design.base.bgc') }}：</el-text>
          <el-color-picker v-model="_value.logo.bgc" :predefine="colors"/>
        </div>
        <div style="display: flex; align-items: center">
          <el-text>{{ $t('design.base.icon') }}：</el-text>
          <el-popover placement="bottom-start" width="402" trigger="click">
            <w-icon-select v-model="_value.logo.name"/>
            <template #reference>
              <iconify class="w-p-icon" style="padding: 0" slot="reference" :icon="_value.logo.name"></iconify>
            </template>
          </el-popover>
        </div>
      </el-form-item>
      <el-form-item prop="procName" required :label="$t('design.base.name')">
        <el-input v-model="_value.procName" :placeholder="$t('design.base.nameTip')"/>
      </el-form-item>
      <el-form-item prop="groupId" required :label="$t('design.base.group')">
        <el-select style="width: calc(100% - 140px); padding-right: 20px;" v-model="_value.groupId"
                   :placeholder="$t('design.base.groupTip')">
          <el-option :value="group.id" :label="group.name" v-for="group in groupList"></el-option>
        </el-select>
        <el-button style="width: 120px; float: right" type="primary" icon="plus" @click="newGroup">
          {{ $t('design.modelMg.newGroup') }}
        </el-button>
      </el-form-item>
      <el-form-item prop="formType" required>
        <template #label>
          {{$t('design.base.formType')}}
          <w-tip content="拖拽模式：鼠标拖拽组件像拼图一样生成表单
                          </br>代码模式：直接在线写Vue代码完全自定义实现表单
                          </br>引用模式：通过表单访问路径或编号ID加载表单
                          </br>无主表单模式：没有表单，只需要走流程的情况下使用此模式"/>
        </template>
        <el-radio-group v-model="_value.formType">
          <el-radio :value="0" label="拖拽模式"/>
          <el-radio :value="1" label="代码模式"/>
          <el-radio :value="2" label="引用模式"/>
          <el-radio :value="4" label="无主表单模式"/>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="$t('design.base.remark')">
        <el-input v-model="_value.remark" show-word-limit maxlength="128" :rows="3" type="textarea"
                  :placeholder="$t('design.base.remark')"></el-input>
      </el-form-item>
      <el-form-item prop="startupPerm" :label="$t('design.base.startup')">
        <el-select v-model="_value.startupRange" default-first-option style="width: 150px; margin-right: 20px">
          <el-option label="所有人都可以" value="ALL"/>
          <el-option label="指定人员可以" value="RANGE"/>
          <el-option label="均不可以" value="NO"/>
        </el-select>
        <w-org-plus-picker v-if="_value.startupRange === 'RANGE'" multiple
                           v-model="_value.startupPerm" :type="['org', 'role']"
                           :selected="[]" placeholder="设置流程可发起人员"
                           @change="form.validateField('startupPerm')"/>
        <el-text v-else-if="_value.startupRange === 'NO'" class="w-placeholder">不影响系统内部发起</el-text>
      </el-form-item>
      <el-form-item :label="$t('design.base.mg')">
        <w-org-plus-picker v-model="_value.adminPerm" :type="['org', 'role']"
                           multiple :selected="[]" placeholder="设置流程管理员，默认所有人均可管理"/>
      </el-form-item>
    </el-form>
  </el-main>
</template>

<style lang="less" scoped>
.w-designer-base {
  margin: 0 auto;
  border-radius: 5px;
  background-color: var(--el-bg-color);
  width: 650px;
  min-height: calc(100vh - 100px);
}

.w-p-icon {
  font-size: 20px;
  cursor: pointer;
  color: var(--el-color-info);
}

.w-icons {
  overflow: auto;
  max-height: 400px;
  padding: 2px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;

  .w-icons-ico {
    width: 25px;
    height: 25px;
    padding: 3px;
    cursor: pointer;
    border-radius: 2px;
    &:hover {
      box-shadow: 0 0 3px 0 #9b9595;
    }
  }
}

</style>
