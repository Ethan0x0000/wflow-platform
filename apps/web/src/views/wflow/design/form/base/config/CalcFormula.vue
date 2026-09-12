<script setup>
import {compileHook, evaluateFormula} from '@/utils/form-runtime';
import FormComponentMixin from "../../FormComponentMixin.js";
import WDialog from "../../../../common/WDialog.vue";
import WCodeEditor from "../../../../common/editor/WCodeEditor.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import ValueType from "../../../form/ValueType.js";
import {storeToRefs} from 'pinia'

const props = defineProps({
  ...FormComponentMixin.props
})
const emit = defineEmits([...FormComponentMixin.emits])
const dialog = ref(false)
const explainTemp = ref([])
const jsCodeTemp = ref('')
const modeTemp = ref(false)
const copyOk = ref(false)
const error = reactive({
  show: false,
  text: ''
})
const calcReg = /^[+\-*/()]+$/;
const numberKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '.']
const operators = [
  {label: '+', value: '+'},
  {label: '-', value: '-'},
  {label: '×', value: '*'},
  {label: '÷', value: '/'},
  {label: '(', value: '('},
  {label: ')', value: ')'},
]
const {formFields} = storeToRefs(useWflowStore())
const numberFields = computed(() => {
  const fields = []
  formFields.value.forEach(f => {
    if (f.valueType === ValueType.number && f.key !== props.config.key) {
      fields.push({label: f.name, value: f.key})
    } else if (Array.isArray(f.columns)) {
      f.columns.forEach(c => {
        if (c.valueType === ValueType.number && c.key !== props.config.key) {
          fields.push({label: `${f.name}.${c.name}`, value: `${f.key}/${c.key}`})
        }
      })
    }
  })
  return fields
})

const calcText = computed(() => {
  let text = ''
  props.config.props.explain.forEach(v => {
    if (v.label) {
      text += ` ${v.label} `
    } else {
      text += v
    }
  })
  return text
})

function appendOperator(o) {
  explainTemp.value.push(o)
}

function openDialog() {
  dialog.value = true
  error.show = false
  error.text = ''
  modeTemp.value = props.config.props.isCustom
  jsCodeTemp.value = props.config.props.jsCode
  explainTemp.value = [...props.config.props.explain]
}

function confirm() {
  if (validate()) {
    dialog.value = false
    props.config.props.isCustom = modeTemp.value
    props.config.props.explain = explainTemp.value
    props.config.props.jsCode = jsCodeTemp.value
  }
}

function copyVar(item) {
  const content = document.createElement('textarea')
  // 防止手机上弹出软键盘
  content.setAttribute('readonly', 'readonly')
  content.value = `formData.${item.value}`
  document.body.appendChild(content)
  content.select()
  document.execCommand('copy')
  document.body.removeChild(content)
  copyOk.value
  setTimeout(() => (copyOk.value = false), 500)
}

function validate() {
  let calcFuc = null
  try {
    if (!modeTemp.value) {
      if (explainTemp.value.length === 0) {
        error.show = true
        error.text = '请设置计算公式'
        return false
      } else {
        const explainText = explainTemp.value.map(v => {
          return v.value ? (calcReg.test(v.value) ? ` ${v.value} ` : ' variable ') : v
        }).join('')
        evaluateFormula(explainText, {variable: 1})
      }
    } else {
      if ((jsCodeTemp.value || '').trim().length === 0) {
        error.show = true
        error.text = '请设置js计算代码'
        return false
      } else if (!jsCodeTemp.value.includes('return')){
        error.show = true
        error.text = '函数必须 return 一个值作为计算结果'
        return false
      }
      calcFuc = compileHook(['formData', 'index', 'request'], jsCodeTemp.value)
      calcFuc({}, 0, () => {})
    }
    return true
  } catch (e) {
    error.show = true
    error.text = e
    return false
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
    <el-input v-model="config.props.prefix" placeholder="前缀"/>
    <el-input v-model="config.props.suffix" placeholder="后缀"/>
  </el-form-item>
  <el-form-item label="小数位数">
    <el-input-number controls-position="right" :min="0" :max="20" v-model="config.props.precision"/>
  </el-form-item>
  <el-form-item label="计算规则">
    <el-button icon="SetUp" @click="openDialog">设置计算规则</el-button>
    <el-text type="primary">{{ config.props.isCustom ? '' : calcText }}</el-text>
  </el-form-item>
  <el-form-item label="隐藏名称">
    <el-switch v-model="config.props.hideLabel"/>
  </el-form-item>
  <el-form-item label="是否必填">
    <el-switch v-model="config.props.required"/>
  </el-form-item>
  <w-dialog width="500px" v-model="dialog" @ok="confirm">
    <template #title>
      <span style="margin-right: 20px">设置计算公式</span>
      <el-text>模式选择：</el-text>
      <el-radio-group v-model="modeTemp" @change="error.show = false">
        <el-radio label="简单模式" :value="false"/>
        <el-radio label="高级模式" :value="true"/>
      </el-radio-group>
    </template>
    <el-alert :closable="false" v-if="error.show" type="error">校验失败😢： {{ error.text }}</el-alert>
    <template v-if="modeTemp">
      <el-form-item label-width="50" label="变量:">
        <div class="w-calc-vars" v-if="numberFields.length > 0">
          <el-tooltip v-for="fd in numberFields" placement="top" :content="copyOk ? '复制成功' : '点击复制'">
            <el-text @click="copyVar(fd)" size="small">{{ fd.label }}</el-text>
          </el-tooltip>
        </div>
        <el-text v-else type="warning">只支持数值类型字段作为变量</el-text>
      </el-form-item>
      <w-code-editor style="height: 200px;" auto-theme lang="javascript" v-model="jsCodeTemp"
                     prefix="function calc(formData, index, request) {"
                     prefix-tip="计算函数，每次表单数据变化都会触发</br>参数：formData 整个表单的值</br>参数：index 组件行索引
                     </br>参数：request 系统axios请求对象</br>返回值: return 计算值/返回Promise对象resolve(计算值)"/>
    </template>
    <template v-else>
      <div class="w-calc">
        <div>
          <div class="w-calc-exp">
            <template v-for="ep in explainTemp">
              <el-text class="w-calc-var" v-if="ep.label && !calcReg.test(ep.value)">{{ ep.label }}</el-text>
              <el-text v-else>{{ ep.label || ep }}</el-text>
            </template>
          </div>
          <div>
            <el-button link type="info" icon="back"
                       @click="explainTemp.splice(explainTemp.length - 1, 1)"
                       :disabled="explainTemp.length === 0">退格
            </el-button>
            <el-button link type="danger" icon="Delete" @click="explainTemp.length = 0"
                       :disabled="explainTemp.length === 0">清空
            </el-button>
          </div>
        </div>
        <el-form-item label-width="50" label="变量:">
          <div class="w-calc-vars" v-if="numberFields.length > 0">
            <el-text @click="appendOperator(fd)" size="small" v-for="fd in numberFields">{{ fd.label }}</el-text>
          </div>
          <el-text v-else type="warning">只支持数值类型字段作为变量</el-text>
        </el-form-item>
        <!--        <el-form-item label-width="50" label="函数:"></el-form-item>-->
        <el-form-item label-width="50" label="键盘:">
          <div style="display: flex;">
            <div class="w-calc-keys">
              <el-button style="width: 30px" size="small" @click="appendOperator(key)" v-for="key in numberKeys">
                {{ key }}
              </el-button>
            </div>
            <div class="w-calc-keys" style="width: 100px;">
              <el-button size="small" style="width: 30px" @click="appendOperator(op)" v-for="op in operators">
                {{ op.label }}
              </el-button>
            </div>
          </div>
        </el-form-item>
      </div>
    </template>
  </w-dialog>
</template>

<style lang="less" scoped>
.w-calc {

  .w-calc-exp {
    display: flex;
    flex-wrap: wrap;

    & > * {
      margin-bottom: 5px;
    }
  }

  .w-calc-var {
    padding: 0 2px;
    margin-left: 3px;
    margin-right: 3px;
    border-radius: 5px;
    border: 1px solid var(--el-border-color);
    background: var(--el-fill-color-lighter);
  }

  & > :first-child {
    //屏幕
    padding: 10px;
    margin-bottom: 10px;
    position: relative;
    height: 100px;
    border-radius: 5px;
    background-color: var(--el-fill-color);
    //按钮位置设置
    & > div:last-child {
      position: absolute;
      bottom: 0;
      right: 0;
      padding: 5px 10px;
    }
  }

  & > {
    margin: 5px 0;
  }

  .w-calc-keys {
    width: 150px;

    & > * {
      margin: 5px;
    }
  }
}

.w-calc-vars {
  & > * {
    margin: 5px;
    padding: 5px;
    cursor: pointer;
    border-radius: 5px;
    background-color: var(--el-fill-color);
  }
}
</style>
