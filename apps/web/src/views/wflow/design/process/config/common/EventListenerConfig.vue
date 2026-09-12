<script setup>
import WCodeEditor from "../../../../common/editor/WCodeEditor.vue";
import WHttpConfig from "../../../../common/WHttpConfig.vue";
import {ElMessage} from "element-plus";
import {validateEl} from "@/api/model.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
import WTip from "../../../../common/WTip.vue";
import {SYS_SYMBOLS} from "../../../../common/config/CommonData.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {storeToRefs} from "pinia";

const {formFields} = storeToRefs(useWflowStore())

const props = defineProps({
  label: String,
  modelValue: {
    type: Array,
    default: () => {
      return []
    }
  }
})

const fieldOptions = computed(() => {
  return [
    {
      label: '系统字段',
      value: 'sys',
      children: SYS_SYMBOLS
    },
    {
      label: '表单字段',
      value: 'form',
      children: formFields.value.map(v => {
        return {
          label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
          value: v.key
        }
      })
    }
  ]
})

const _value = defineModel()

function addAction() {
  if (_value.value.length >= 5) {
    ElMessage.error('整太多受不了😥')
    return
  }
  _value.value.push({
    type: 'NONE',
    js: null,
    el: null,
    http: {
      url: null,
      method: 'GET',
      headers: [],
      params: [],
      bodyForms: [],
      data: 'return {}',
      isJson: true,
      preJs: null,
      catchJs: null
    }
  })
}

function validate(el) {
  if (isEmpty(el)) {
    ElMessage.error('EL表达式不能为空')
    return
  }
  validateEl(el).then(res => {
    ElMessage.success(res.data)
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}
</script>

<template>
  <div style="padding: 20px 0" :key="_value.length">
    <div>
      <el-text>{{ label }}:</el-text>
      <el-button link type="primary" @click="addAction">+ 添加动作</el-button>
    </div>
    <div v-for="(ev, i) in _value" :key="i" class="w-ev-conf">
      <div>
        <el-radio-group v-model="ev.type">
          <el-radio label="无动作" value="NONE"/>
          <el-radio value="EL">EL表达式
            <w-tip content="使用 @xxx 引用spring内名称为xxx的实例bean</br> 使用 #xxx 引用名称为xxx的上下文变量"/>
          </el-radio>
          <el-radio label="js脚本" value="JS"/>
          <el-radio label="Http请求" value="HTTP"/>
        </el-radio-group>
        <el-button link type="danger" icon="Delete" @click="_value.splice(i, 1)"/>
      </div>
      <div v-if="ev.type === 'EL'">
        <el-input placeholder="输入Spring EL表达式" v-model="ev.el" @blur="validate(ev.el)">
          <template #append>
            <el-button type="info" @click="validate(ev.el)">校验</el-button>
          </template>
        </el-input>
      </div>
      <div v-if="ev.type === 'JS'">
        <w-code-editor style="height: 200px;" auto-theme lang="javascript"
                       v-model="ev.js" prefix="function doAction(ctx) {"
                       prefixTip="ctx 是上下文，ctx.xxx可取上下文变量xxx"/>
      </div>
      <div v-if="ev.type === 'HTTP'">
        <w-http-config show-aft :var-options="fieldOptions" v-model="ev.http"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.w-ev-conf {
  & > div:first-child {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  padding: 5px 10px;
  margin: 5px;
  border-radius: 5px;
  background: var(--el-fill-color-dark);

}
</style>
