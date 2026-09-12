<script setup>
import Node from "./base/Node.vue";
import nodeMixin from "../NodeMixin.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {validNodeName} from "@/utils/ProcessUtil.js";

const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const showErr = ref(false)
const errInfo = ref(null)
const urlReg = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i

const content = computed(() => {
  let desc = '请设置办理人';
  const prop = _value.value.props
  switch (prop.ruleType){
    case 'ASSIGN_USER':
      if (prop.assignUser.length === 0){
        desc = '请指定办理人'
      }else {
        desc = prop.assignUser.map(v => v.name).join('、')
      }
      break
    case 'FORM_USER':
      if (!prop.formUser){
        desc = '请选择表单人员字段'
      }else {
        desc = `表单[${prop.formUser?.name}]内人员办理`
      }
      break
    case 'NODE_SELECT':
      desc = '由上游节点处理时指定' + (prop.nodeAssign.multiple ? '多人' : '一人')
      break
    case 'ROOT_SELF':
      desc = '发起人自己办理'
      break
    case 'LEADER':
      if (prop.leader.level > 1){
        desc = `发起人的第${prop.leader.level}级部门主管`
      }else {
        desc = '发起人的直属主管'
      }
      break
    case 'LEADER_TOP':
      desc = (prop.leaderTop.toEnd ? '逐级' : `前${prop.leaderTop.level}级`) + '部门主管办理'
      break
    case 'SUPERIOR':
      if (prop.superior.level > 1){
        desc = `发起人的第${prop.superior.level}级上级`
      }else {
        desc = '发起人的直属上级'
      }
      break
    case 'SUPERIOR_TOP':
      desc = (prop.superiorTop.toEnd ? '逐级' : `前${prop.superiorTop.level}级`) + '上级办理'
      break
    case 'ASSIGN_DEPT':
      desc = '部门' + getDeptRuleDesc(prop.assignDept)
      break
    case 'FORM_DEPT':
      desc = '表单' + getDeptRuleDesc(prop.formDept)
      break
    case 'ASSIGN_ROLE':
      desc = `具有角色[${prop.assignRole.map(v => v.name).join('、')}]的人员办理`
      break
    case 'ASSIGN_GROUP':
      desc = `用户组[${prop.assignGroup.map(v => v.name).join('、')}]内的人员办理`
      break
    case 'DYNAMIC':
      switch (prop.dynamic.type) {
        case 'EL':
          desc = `从EL表达式[${prop.dynamic.el || '?'}]解析`
          break
        case 'JS':
          desc = '从js脚本解析'
          break
        case 'HTTP':
          desc = `从请求[${prop.dynamic.http.method} ${prop.dynamic.http.url || '?'}]解析`
          break
      }
      break
    case 'CUSTOM':
      desc = `自定义找人规则`
      break
  }
  if (prop.candidate){
    desc = `(候选)-` + desc
  }
  return desc
})

function getDeptRuleDesc(deptRule) {
  let dept = deptRule.dept.map(v => v?.name).join('、')
  let user = '主管'
  switch (deptRule.type){
    case 'USER':
      user = '所有人'
      break
    case 'ROLE':
      user = `拥有角色[${deptRule.roles.map(v => v.name).join('、')}]的人员`
      break
    case 'GROUP':
      user = `用户组[${deptRule.groups.map(v => v.name).join('、')}]的人员`
      break
  }
  return `[${dept}]内${user}办理`
}

/**
 * 节点规则校验函数
 * @param errs 错误信息
 */
function validate(errs){
  const prop = _value.value.props
  showErr.value = true
  errInfo.value = validNodeName(_value.value.name, errs)
  if (!isEmpty(errInfo.value)) return
  if (prop.mode === 'USER'){
    switch (prop.ruleType){
      case 'ASSIGN_USER':
        if (prop.assignUser.length === 0){
          errInfo.value = '未指定具体办理人'
          errs.push(`${_value.value.name} 节点未指定办理人`)
          return
        }
        break
      case 'FORM_USER':
        if (!prop.formUser){
          errInfo.value = '未选择表单人员字段'
          errs.push(`${_value.value.name} 节点未选择表单人员字段`)
          return
        }
        break
      case 'FORM_DEPT':
        if (prop.formDept.dept.length === 0){
          errInfo.value = '未指定表单内部门字段'
          errs.push(`${_value.value.name} 节点未指定表单内部门字段`)
          return
        }else {
          switch (prop.formDept.type){
            case 'ROLE':
              if (prop.formDept.roles.length === 0){
                errInfo.value = '未指定部门内角色'
                errs.push(`${_value.value.name} 节点未指定部门内角色`)
                return
              }
              break
            case 'GROUP':
              if (prop.formDept.groups.length === 0){
                errInfo.value = '未指定部门内用户组'
                errs.push(`${_value.value.name} 节点未指定部门内用户组`)
                return
              }
              break
          }
        }
        break
      case 'NODE_SELECT':
        if (prop.nodeAssign.nodeIds.length === 0){
          errInfo.value = '未指定上游办理节点'
          errs.push(`${_value.value.name} 节点未指定上游办理节点`)
          return
        }
        break
      case 'ASSIGN_DEPT':
        if (prop.assignDept.dept.length === 0){
          errInfo.value = '未设置部门'
          errs.push(`${_value.value.name} 节点未设置部门`)
          return
        }else {
          switch (prop.assignDept.type){
            case 'ROLE':
              if (prop.assignDept.roles.length === 0){
                errInfo.value = '未指定部门内角色'
                errs.push(`${_value.value.name} 节点未指定部门内角色`)
                return
              }
              break
            case 'GROUP':
              if (prop.assignDept.groups.length === 0){
                errInfo.value = '未指定部门内用户组'
                errs.push(`${_value.value.name} 节点未指定部门内用户组`)
                return
              }
              break
          }
        }
        break
      case 'ASSIGN_ROLE':
        if (prop.assignRole.length === 0){
          errInfo.value = '未设置办理角色'
          errs.push(`${_value.value.name} 节点未设置角色`)
          return
        }
        break
      case 'ASSIGN_GROUP':
        if (prop.assignGroup.length === 0){
          errInfo.value = '未设置办理用户组'
          errs.push(`${_value.value.name} 节点未设置用户组`)
          return
        }
        break
      case 'DYNAMIC':
        switch (prop.dynamic.type) {
          case 'EL':
            if (isEmpty(prop.dynamic.el)){
              errInfo.value = '未设置EL表达式'
              errs.push(`${_value.value.name} 节点未设置EL取人表达式`)
              return
            }
            break;
          case 'JS':
            if (isEmpty(prop.dynamic.script)){
              errInfo.value = '未设置JS脚本'
              errs.push(`${_value.value.name} 节点未设置取人脚本`)
              return
            }
            break
          case 'HTTP':
            if (isEmpty(prop.dynamic.http.url)) {
              errInfo.value = '未设置HTTP请求URL'
              errs.push(`节点 ${_value.value.name} 取人HTTP请求URL未设置`)
              return
            } else if (!urlReg.test(prop.dynamic.http.url)) {
              errInfo.value = 'HTTP请求URL格式不正确'
              errs.push(`节点 ${_value.value.name} 取人HTTP请求URL格式不正确`)
              return
            } else if (isEmpty(prop.dynamic.http.aftJs)) {
              errInfo.value = '后置处理脚本未设置'
              errs.push(`节点 ${_value.value.name} 取人HTTP请求后置处理脚本未设置`)
              return
            }
            break
        }
        break
      case 'CUSTOM':
        if (!prop.customRule){
          errInfo.value = '未设置自定义规则'
          errs.push(`${_value.value.name} 节点未设置自定义规则`)
          return
        }
        break
    }
    if (prop.noUserHandler.type === 'TO_USER' && prop.noUserHandler.assigned.length === 0){
      errInfo.value = '未指定为空转交人'
      errs.push(`${_value.value.name} 节点未指定为空时的转交人`)
      return
    }
  }
  showErr.value = false
}

defineExpose({ validate })
</script>

<template>
<node v-model="_value" :readonly="readonly" :show-error="showErr"
      :error-info="errInfo" header-color="#E6B039" header-icon="stamp"
      :content="content" @select="emit('select', modelValue)"
      @insertNode="type => emit('insertNode', branch, index, type)"
      @delete="emit('delete', branch, index)" :id="_value.id"
      @paste="$emit('paste')"
/>
</template>

<style scoped>

</style>
