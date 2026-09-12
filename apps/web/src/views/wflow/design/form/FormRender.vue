<script setup>
import {FormComponents} from "../form/FormComponents.js";
import componentMixin from "../form/FormComponentMixin.js";
import {resolveFormJson} from "@/utils/ProcessUtil.js";
import {$debounce, deepCopy, getFieldValidRules, isEmpty, loadDsVars} from "@/utils/GlobalFunc.js";
import {compareRuleGroup} from "@/utils/ConditionCompare.js";
import request from "@/api/request.js";
import {compileHook} from '@/utils/form-runtime';

const props = defineProps({
  ...componentMixin.props,
  permConf: {
    type: Object,
    default: () => {
      return {}
    }
  },
  isStart: Boolean //是否当前是填表的时候
})
const _value = defineModel({
  type: Object,
  default: () => {
    return {}
  }
})

const formFields = computed(() => {
  return (props.config.components || []).length > 0 ?
      resolveFormJson(props.config.components) : []
})

const fields = computed(() => {
  const obj = {}
  formFields.value.forEach(v => {obj[v.key] = v})
  return obj
})

const form = ref()
const loading = ref(true)
const tempPermConf = ref({})
//数据源数据项
const sourceData = ref({})
//校验联动消抖函数
const doShowHide = $debounce(excShowHideRules, 200)
//表单组件校验函数
const validates = ref({})
//组件选项重载函数
const optionCpLoad = reactive({})
//组件加载状态设置对象，如果某个组件正在加载中，则设置其值为true
const cpLoading = reactive({})
//表单校验规则js函数
let validateFuc = null
//显隐规则js函数
let showHideFuc = null
//联动规则js函数
let actionFuc = null
//监听变化的所有watch
const watchings = []
//把权限注入给所有的表单组件
provide('permConf', tempPermConf)
//注入表单组件自定义校验函数
provide('validates', validates)
//注入全局数据源
provide('dsVars', sourceData)
//注入整个表单数据
provide('formData', _value)
//全局注入选项组件刷新函数收集器
provide('optionLoads', optionCpLoad)
//全局注入组件加载状态对象，子组件没加载完时不能提交表单
provide('cpLoadings', cpLoading)
//注入流程发起人数据
const initiator = inject('initiator', ref({}))
//注入流程发起人部门数据
const startDept = inject('startDept', ref({}))
//是否是发起流程状态
const isStart = inject('isStart', true)
//构建表单校验规则
const formRules = computed(() => {
  return getFieldValidRules(formFields.value, validates, props.permConf, props.mode)
})
defineExpose({validate, getFields, getPermConf})

onMounted(async () => {
  loading.value = true
  try {
    appendSysVars(sourceData)
    loadDsVars(props.config.datasource, _value.value, sourceData, () => {
      loading.value = false
      nextTick(() => {
        doOnLoadAction()
        excShowHideRules()
        excActionRule()
      })
    })
  } catch (e) {
    loading.value = false
  }
})

function appendSysVars(vars) {
  vars.value['startUserId'] = initiator.value?.id
  vars.value['startUsername'] = initiator.value?.name
  vars.value['startUser'] = [initiator.value]
  vars.value['startDeptId'] = startDept.value?.id
  vars.value['startDeptName'] = startDept.value?.name
  vars.value['startDept'] = [{
    id: startDept.value?.id,
    name: startDept.value?.name,
    type: 'dept'
  }]
  vars.value['isStart'] = isStart
}

async function doOnLoadAction() {
  const onLoad = props.config.conf.onLoad
  if (onLoad) {
    if (onLoad.type === 'SIMPLE') {
      //简单模式
      const context = {..._value.value, ...sourceData.value}
      onLoad.actions.forEach(action => {
        action.cdType = action.cdType || 'NONE'
        if (action.cdType === 'NONE'
            || (action.cdType === 'FILL' && isStart)
            || (action.cdType === 'VIEWER' && !isStart)) {
          //判断满足触发条件
          if (action.type === 'SET_VALUE') {
            //设置字段值
            //简单模式只有可编辑模式允许修改值
            if ((tempPermConf.value[action.field] || props.mode) === 'E') {
              _value.value[action.symbol] = action.isDynamic ? context[action.value] : action.value
            }
          }
        }

      })
    } else if (!isEmpty(onLoad.js)){
      const actionFuc = compileHook(['dsVars', 'formData', 'formMap', 'request'], onLoad.js)
      actionFuc(sourceData.value, _value.value, fields.value, request)
    }
  }
}

function validate() {
  return new Promise((resolve, reject) => {
    if (Object.values(cpLoading).some(value => value === true)) {
      reject('存在未加载完毕的字段，请稍后提交')
      return
    }
    form.value.validate((valid) => {
      if (valid) {
        excValidateRules().then(() => resolve()).catch(err => reject(err))
      } else {
        reject('根据提示完成表单')
      }
    })
  })
}

//解析简单模式校验规则
function excValidateRules(){
  const context = {..._value.value, ...sourceData.value}
  return new Promise((resolve, reject) => {
    if (props.config.conf.valid.type === 'SIMPLE') {
      const errs = []
      props.config.conf.valid.rules.forEach(rule => {
        if (compareRuleGroup(rule, context)) {
          errs.push(rule.errMsg)
        }
      })
      if (errs.length > 0) reject(String(errs))
      else resolve()
    } else {
      if (!validateFuc) {
        validateFuc = compileHook(['ctx', 'resolve', 'reject', 'request'], props.config.conf.valid.js)
      }
      validateFuc(context, resolve, reject, request)
    }
  })
}

//解析简单模式显隐规则
async function excShowHideRules(){
  try {
    const context = {..._value.value, ...sourceData.value}
    if (props.config.conf.showHide.type === 'SIMPLE') {
      props.config.conf.showHide.rules.forEach(rule => {
        if (compareRuleGroup(rule, context)) {
          showHide(rule.fields, rule.isShow)
        } else {
          showHide(rule.fields, !rule.isShow)
        }
      })
    } else {
      if (!showHideFuc) {
        showHideFuc = compileHook(['ctx', 'formMap', 'show', 'hide', 'request'], props.config.conf.showHide.js)
      }
      showHideFuc(context, fields.value,
          (keys) => showHide(keys, true),
          (keys) => showHide(keys, false),
          request)
    }
  } catch (e) {
    console.error(e)
  }
}

//控制字段显隐
function showHide(fields, isShow) {
  if(fields) {
    if (Array.isArray(fields)) {
      fields.forEach(field => doShowHideAction(field, isShow))
    } else {
      doShowHideAction(fields, isShow)
    }
  }
}

function doShowHideAction(field, isShow) {
  const dfPerm = props.permConf[field] || props.mode
  tempPermConf.value[field] = isShow ? (dfPerm ? dfPerm : 'E') : 'H'
}

function getFields(deep) {
  return (props.config.components || []).length > 0 ?
      resolveFormJson(props.config.components, deep) : []
}

//打开表单时做一次判断
async function excActionRule() {
  try {
    const rule = props.config.conf?.actionRule
    if (rule?.type === 'SIMPLE') {
      rule.rules.forEach(rule => {
        rule.conditions.forEach(cd => {
          const context = {..._value.value, ...sourceData.value}
          // 监控下变化的字段，然后扫描所有规则，判断含有该字段的逻辑
          if (cd.compare === 'CHANGE' || compareRuleGroup(rule, context)) {
            actionHandler(rule.actions)
          }
        })
      })
    }
  } catch (e) {}
  resolveWatch()
}

function resolveWatch() {
  try {
    if (watchings.length > 0) {
      //取消之前的监听
      watchings.forEach(v => v())
      watchings.length = 0
    }
    const rule = props.config.conf?.actionRule
    if (rule?.type === 'SIMPLE') {
      rule.rules.forEach(rule => {
        rule.conditions.forEach(cd => {
          watchings.push(watch(() => _value.value[cd.symbol], async () => {
            const context = {..._value.value, ...sourceData.value}
            // 监控下变化的字段，然后扫描所有规则，判断含有该字段的逻辑
            if (cd.compare === 'CHANGE' || compareRuleGroup(rule, context)) {
              actionHandler(rule.actions)
            }
          }, {deep: true}))
        })
      })
    } else {
      //提供watch函数，只监听需要的字段
      const _watch = (_fields, callback) => {
        _fields.forEach(field => {
          watchings.push(watch(() => _value.value[field],
              () => callback(_value.value, sourceData.value,
                  fields.value, request), {deep: true}));
        })
      }
      if (!actionFuc) {
        actionFuc = compileHook(['watch', 'optionLoad'], rule.js)
      }
      actionFuc(_watch, optionCpLoad)
    }
  } catch (e) {
    console.error(e)
  }
}

function actionHandler(actions) {
  actions.forEach(action => {
    switch (action.type) {
      case 'SET_VAL': //设置字段值
        const newVal = Array.isArray(action.value) ? deepCopy(action.value) : action.value
        //简单模式只有可编辑模式允许修改值
        if ((tempPermConf.value[action.field] || props.mode) === 'E') {
          _value.value[action.field] = newVal
        }
        break
      case 'RF_OPTIONS': //重载选项
        const rfFunc = optionCpLoad[action.field]
        if (rfFunc && rfFunc instanceof Function) rfFunc()
        break
      case 'SET_OPTIONS': //设置选项
        const fieldProps = fields.value[action.field].props
        fieldProps.optionType = action.option.optionType
        fieldProps.http = action.option.http
        fieldProps.static = action.option.static
        break
      case 'REQUIRED':
        fields.value[action.field].props.required = true
        break
      case 'UN_REQUIRED':
        fields.value[action.field].props.required = false
        break;
    }
  })
}

function getPermConf() {
  return tempPermConf.value
}

//监听表单值变化，执行显隐规则
watch(() => props.modelValue, () => {
  doShowHide()
}, {deep: true})

//监听表单字段权限项变化
watch(props.permConf, () => {
  tempPermConf.value = {...props.permConf}
}, {deep: true, immediate: true})
</script>

<template>
  <div v-if="!loading">
    <el-form ref="form" :label-width="config.conf?.labelWidth"
             :size="config.conf?.size" @submit.prevent="() => {}"
             :label-position="config.conf?.labelPosition" :model="_value"
             :rules="formRules" class="w-form-render" :validate-on-rule-change="false"	>
      <template v-for="(cp, i) in config.components" :key="cp.type + i">
        <template v-if="tempPermConf[cp.key] !== 'H'">
          <el-form-item :label="cp.name" v-if="!cp.props.isContainer"
                        :class="{'w-form-cp-nlb':cp.props.hideLabel}" :prop="cp.key">
            <component :is="FormComponents[cp.type]" :mode="tempPermConf[cp.key] || mode"
                       :config="cp" v-model="_value[cp.key]"/>
          </el-form-item>
          <component v-else :is="FormComponents[cp.type]" :mode="tempPermConf[cp.key] || mode" v-model="_value" :config="cp"/>
        </template>
      </template>
    </el-form>
  </div>
  <div element-loading-text="等待数据源加载完毕..." v-loading="true"
       style="height: 300px; text-align: center" v-else></div>
</template>

<style lang="less" scoped>

</style>
