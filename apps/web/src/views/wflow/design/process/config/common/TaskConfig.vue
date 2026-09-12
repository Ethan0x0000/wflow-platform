<script setup>
import nodeMixin from "../../NodeMixin.js";
import WOrgPicker from "../../../../common/WOrgPicker.vue";
import WOrgTags from "../../../../common/WOrgTags.vue";
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import WCodeEditor from "../../../../common/editor/WCodeEditor.vue";
import WHttpConfig from "../../../../common/WHttpConfig.vue";
import ProcessNodes from "../../ProcessNodes.js";
import {SYS_SYMBOLS} from "@/views/wflow/common/config/CommonData.js";

const props = defineProps({
  ...nodeMixin.props,
  isApproval: Boolean
})
const initConfig = ProcessNodes.Approval.create()[0]
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const action = computed(() => props.isApproval ? '审批' : '办理')

const orgPicker = ref()
const orgPickerType = ref('org')
//选中的组织架构属性
const selectedOrg = ref([])
const beforeNodes = ref([])
const nodes = ref([])
const {formFields} = storeToRefs(useWflowStore())
const processNodeMap = inject('processNodeMap')

const modes = {
  USER: {label: '人工审批', type: 'USER', desc: null, color: ''},
  AUTO_REFUSE: {label: '自动拒绝', type: 'AUTO_REFUSE', desc: '📢 将会自动驳回流程', color: 'danger'},
  AUTO_PASS: {label: '自动通过', type: 'AUTO_PASS', desc: '📢 将会自动通过流程', color: 'success'}
}
//审批规则类型定义
const types = [
  {label: '指定人员', type: 'ASSIGN_USER'},
  {label: '上游节点指定', type: 'NODE_SELECT'},
  {label: '发起人自己', type: 'ROOT_SELF'},
  {label: '部门主管', type: 'LEADER'},
  {label: '逐级部门主管', type: 'LEADER_TOP'},
 /* {label: '发起人上级', type: 'SUPERIOR'},
  {label: '逐级上级', type: 'SUPERIOR_TOP'},*/
  {label: '用户组', type: 'ASSIGN_GROUP'},
  {label: '系统角色', type: 'ASSIGN_ROLE'},
  {label: '指定部门', type: 'ASSIGN_DEPT'},
  {label: '表单内部门', type: 'FORM_DEPT'},
  {label: '表单内人员', type: 'FORM_USER'},
  {label: '动态解析✨', type: 'DYNAMIC'},
/*  {label: '自定义规则', type: 'CUSTOM'},*/
]

const userFields = computed(() => {
  return formFields.value.filter(v => v.type === 'UserPicker').map(v => {
    return {id: v.key, type: 'user', name: v.name}
  })
})

const deptFields = computed(() => {
  return formFields.value.filter(v => v.type === 'DeptPicker').map(v => {
    return {id: v.key, type: 'dept', name: v.name}
  })
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

onMounted(() => {
  if (!_value.value.props.dynamic) {
    _value.value.props.dynamic = initConfig.props.dynamic
  }
})

function showOrgPicker(orgs, type) {
  orgPickerType.value = type
  selectedOrg.value = orgs
  orgPicker.value.open()
}

function selectOk(orgs) {
  orgPicker.value.close()
  selectedOrg.value.length = 0
  selectedOrg.value.push(...orgs)
}

async function loadBeforeNodes(){
  let parentId = _value.value.parentId
  beforeNodes.value.length = 0
  nodes.value.length = 0
  do {
    let node = processNodeMap.get(parentId)
    if (node) {
      if (node.type === 'Approval' || node.type === 'Task' || node.type === 'Start'){
        beforeNodes.value.push(node)
        nodes.value.push(node)
      }
      parentId = node.parentId
    } else {
      break
    }
  } while (parentId && parentId !== 'start')
}

onMounted(loadBeforeNodes)
</script>

<template>
  <div>
    <div style="margin-bottom: 15px" v-if="isApproval">
      <el-radio-group v-model="_value.props.mode">
        <template v-for="mode in modes">
          <el-radio :label="mode.label" :value="mode.type"/>
        </template>
      </el-radio-group>
      <el-text style="display:block; margin: 10px" :type="modes[_value.props.mode].color"
               v-if="modes[_value.props.mode].desc">
        {{ modes[_value.props.mode].desc }}
      </el-text>
    </div>
    <el-form label-position="top" v-if="_value.props.mode === 'USER'">
      <div class="w-node-rules">
        <el-text>👨‍⚖️ 设置{{ action }}人规则</el-text>
        <div>
          <el-radio-group v-model="_value.props.ruleType" class="w-a-t-group">
            <el-radio v-for="type in types" :key="type.type" :label="type.label" :value="type.type"/>
          </el-radio-group>
          <el-divider style="margin: 5px 0 10px">
            <el-text type="info">规则设置</el-text>
          </el-divider>
          <template v-if="_value.props.ruleType === 'ASSIGN_USER'">
            <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignUser, 'user')"
                       size="small" type="primary" icon="plus" plain>添加{{ action }}人
            </el-button>
            <w-org-tags v-model="_value.props.assignUser"/>
          </template>

          <el-form-item v-else-if="_value.props.ruleType === 'NODE_SELECT'" label="指定节点及选择方式">
            <el-select multiple v-model="_value.props.nodeAssign.nodeIds" style="width: 200px; margin-right: 20px"
                       placeholder="选择指定的节点" @click="loadBeforeNodes">
              <el-option :key="node.id" v-for="node in beforeNodes" :label="node.name" :value="node.id"/>
            </el-select>
            <el-radio-group v-model="_value.props.nodeAssign.multiple">
              <el-radio :value="false" label="选一个人"></el-radio>
              <el-radio :value="true" label="选多个人"></el-radio>
            </el-radio-group>
          </el-form-item>

          <el-text v-else-if="_value.props.ruleType === 'ROOT_SELF'">
            发起人自己将作为{{ action }}人进行{{ action }}
          </el-text>

          <template v-else-if="_value.props.ruleType === 'LEADER'">
            <el-form-item label="指定主管级别">
              <el-text>发起人的：</el-text>
              <el-select style="width: 80%;" v-model="_value.props.leader.level">
                <el-option :value="1" label="向上第1级部门主管（直属主管）"></el-option>
                <el-option v-for="i in 18" :value="i + 1" :label="`向上第${i + 1}级部门主管`"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="对应部门主管未设置时">
              <el-radio-group v-model="_value.props.leader.emptySkip">
                <el-radio :value="false" label="也算找了一级"></el-radio>
                <el-radio :value="true" label="有人才算找了一级"></el-radio>
              </el-radio-group>
            </el-form-item>
          </template>

          <el-form-item label="指定上级级别" v-else-if="_value.props.ruleType === 'SUPERIOR'">
            <el-text>发起人的：</el-text>
            <el-select style="width: 80%;" v-model="_value.props.superior.level">
              <el-option :value="1" label="向上第1级上级（直属上级）"></el-option>
              <el-option v-for="i in 18" :value="i + 1" :label="`向上第${i + 1}级上级`"></el-option>
            </el-select>
          </el-form-item>

          <template v-else-if="_value.props.ruleType === 'SUPERIOR_TOP'">
            <el-form-item label="上级层级终点">
              <el-radio-group v-model="_value.props.superiorTop.toEnd">
                <el-radio :value="true" label="直到最上级"></el-radio>
                <el-radio :value="false" label="到指定级别为止"></el-radio>
              </el-radio-group>
              <el-input-number style="margin-left: 10px" size="small" :precision="0"
                               v-if="!_value.props.superiorTop.toEnd" v-model="_value.props.superiorTop.level" :min="1"
                               :max="50"/>
            </el-form-item>
          </template>

          <template v-else-if="_value.props.ruleType === 'LEADER_TOP'">
            <el-form-item label="部门层级终点">
              <el-radio-group v-model="_value.props.leaderTop.toEnd">
                <el-radio :value="true" label="直到最顶级部门"></el-radio>
                <el-radio :value="false" label="到指定级别为止"></el-radio>
              </el-radio-group>
              <el-input-number style="margin-left: 10px" size="small" :precision="0"
                               v-if="!_value.props.leaderTop.toEnd" v-model="_value.props.leaderTop.level" :min="1"
                               :max="50"/>
            </el-form-item>
            <el-form-item label="对应部门主管未设置时">
              <el-radio-group v-model="_value.props.leaderTop.emptySkip">
                <el-radio :value="false" label="也算找了一级"></el-radio>
                <el-radio :value="true" label="有人才算找了一级"></el-radio>
              </el-radio-group>
            </el-form-item>
          </template>

          <template v-else-if="_value.props.ruleType === 'ASSIGN_DEPT'">
            <el-form-item label="指定部门">
              <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignDept.dept, 'dept')"
                         size="small" type="primary" icon="plus" plain>选择部门
              </el-button>
              <w-org-tags v-model="_value.props.assignDept.dept"/>
            </el-form-item>
            <el-form-item label="部门内匹配规则设置" v-show="_value.props.assignDept.dept.length > 0">
              <el-radio-group style="margin-bottom: 10px" v-model="_value.props.assignDept.type">
                <el-radio label="部门主管" value="LEADER"></el-radio>
                <el-radio label="部门人员" value="USER"></el-radio>
                <el-radio label="部门角色" value="ROLE"></el-radio>
                <el-radio label="部门用户组" value="GROUP"></el-radio>
              </el-radio-group>
              <el-checkbox v-if="_value.props.assignDept.type === 'USER'" v-model="_value.props.assignDept.nested">
                包含子部门内人员
              </el-checkbox>
              <template v-else-if="_value.props.assignDept.type === 'ROLE'">
                <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignDept.roles, 'role')"
                           size="small" type="primary" icon="plus" plain>选择角色
                </el-button>
                <w-org-tags v-model="_value.props.assignDept.roles"/>
              </template>
              <template v-else-if="_value.props.assignDept.type === 'GROUP'">
                <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignDept.groups, 'group')"
                           size="small" type="primary" icon="plus" plain>选择用户组
                </el-button>
                <w-org-tags v-model="_value.props.assignDept.groups"/>
              </template>
            </el-form-item>
          </template>

          <template v-else-if="_value.props.ruleType === 'FORM_DEPT'">
            <el-form-item label="选择表单部门字段">
              <el-select clearable v-model="_value.props.formDept.dept[0]" value-key="id" placeholder="选择表单部门字段">
                <el-option :label="dept.name" :value="dept" :key="dept.id" v-for="dept in deptFields"/>
              </el-select>
            </el-form-item>
            <el-form-item label="部门内匹配规则设置" v-show="_value.props.formDept.dept.length > 0">
              <el-radio-group style="margin-bottom: 10px" v-model="_value.props.formDept.type">
                <el-radio label="部门主管" value="LEADER"></el-radio>
                <el-radio label="部门人员" value="USER"></el-radio>
                <el-radio label="部门角色" value="ROLE"></el-radio>
                <el-radio label="部门用户组" value="GROUP"></el-radio>
              </el-radio-group>
              <el-checkbox v-if="_value.props.formDept.type === 'USER'" v-model="_value.props.formDept.nested">
                包含子部门内人员
              </el-checkbox>
              <template v-else-if="_value.props.formDept.type === 'ROLE'">
                <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.formDept.roles, 'role')"
                           size="small" type="primary" icon="plus" plain>选择角色
                </el-button>
                <w-org-tags v-model="_value.props.formDept.roles"/>
              </template>
              <template v-else-if="_value.props.formDept.type === 'GROUP'">
                <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.formDept.groups, 'group')"
                           size="small" type="primary" icon="plus" plain>选择用户组
                </el-button>
                <w-org-tags v-model="_value.props.formDept.groups"/>
              </template>
            </el-form-item>
          </template>

          <el-form-item label="选择表单人员字段" v-else-if="_value.props.ruleType === 'FORM_USER'">
            <el-select clearable value-key="id" v-model="_value.props.formUser" placeholder="选择表单人员字段">
              <el-option :label="user.name" :value="user" :key="user.id" v-for="user in userFields"/>
            </el-select>
          </el-form-item>

          <template v-else-if="_value.props.ruleType === 'ASSIGN_GROUP'">
            <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignGroup, 'group')" size="small"
                       type="primary" icon="plus" plain>选择用户组
            </el-button>
            <w-org-tags v-model="_value.props.assignGroup"/>
          </template>

          <template v-else-if="_value.props.ruleType === 'ASSIGN_ROLE'">
            <el-button style="margin-bottom: 5px" @click="showOrgPicker(_value.props.assignRole, 'role')" size="small"
                       type="primary" icon="plus" plain>选择系统角色
            </el-button>
            <w-org-tags v-model="_value.props.assignRole"/>
          </template>

          <template v-else-if="_value.props.ruleType === 'DYNAMIC'">
            <el-form-item label-position="left" label="解析类型:">
              <el-radio-group v-model="_value.props.dynamic.type">
                <el-radio label="EL表达式" value="EL"/>
                <el-radio label="脚本解析" value="JS"/>
                <el-radio label="HTTP请求" value="HTTP"/>
              </el-radio-group>
            </el-form-item>
            <el-input v-if="_value.props.dynamic?.type === 'EL'" clearable v-model="_value.props.dynamic.el" placeholder="请输入spring的EL表达式">
              <template #append>
                <el-button>校验</el-button>
              </template>
            </el-input>
            <w-code-editor style="height: 200px;" auto-theme lang="javascript" prefix="function doAction(ctx) {"
                           prefixTip="本函数在后端运行，不支持ES6语法</br>ctx 是上下文，ctx.xxx可取上下文变量xxx
                           </br>📢本函数需return一个解析到的人员ID数组"
                           v-else-if="_value.props.dynamic?.type === 'JS'" v-model="_value.props.dynamic.script"/>
            <w-http-config show-aft :var-options="fieldOptions" v-else-if="_value.props.dynamic?.type === 'HTTP'"
                           v-model="_value.props.dynamic.http">
              <template #after>
                <w-code-editor style="height: 200px;" v-model="_value.props.dynamic.http.aftJs" auto-theme
                               lang="javascript" prefix="function extract(rsp) {"
                               prefixTip="本函数在后端运行，不支持ES6语法</br> - rsp: 是response响应体
                               </br>📢本函数需return一个解析到的人员ID数组"/>
              </template>
            </w-http-config>
          </template>

          <el-form-item label="选择自定义规则" v-else-if="_value.props.ruleType === 'CUSTOM'">
            <el-select style="width: 250px; margin-right: 20px" v-model="_value.props.customRuleType"
                       placeholder="清选择人员匹配规则">
              <el-option v-for="user in []"></el-option>
            </el-select>
            <el-link type="primary" underline="hover">没有可选规则？去配置</el-link>
          </el-form-item>
        </div>
      </div>
      <el-form-item label="🤟节点任务分配模式">
        <el-radio-group v-model="_value.props.candidate">
          <el-radio :value="false" label="直接下发给匹配到的人员"></el-radio>
          <el-radio :value="true" label="匹配到的人员需要先认领任务，认领完成后由认领者处理"></el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="`👩‍👦‍👦节点存在多个${action}人时${action}方式`">
        <el-radio-group v-model="_value.props.taskMode.type">
          <el-radio value="NEXT"
                    :label="`顺序会签，按匹配顺序依次处理${isApproval ? '（需所有人同意）':'（每个人都要办理）'}`"></el-radio>
          <el-radio value="AND"
                    :label="`并行会签，可同时处理${isApproval ? '（需所有人同意）':'（每个人都要办理）'}`"></el-radio>
          <el-radio style="width: 100%;" value="OR"
                    :label="`或签${isApproval ? '（有一人同意即可）':'（有一个人处理即可）'}`"></el-radio>
          <el-radio value="CUSTOM" label="自定义完成比例 %"></el-radio>
          <el-input-number v-if="_value.props.taskMode.type === 'CUSTOM'" size="small" :precision="0"
                           v-model="_value.props.taskMode.percentage" :max="100" :min="1"/>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="`🤫当${action}人与发起人为同一人时`">
        <el-radio-group v-model="_value.props.sameRoot.type">
          <el-radio value="TO_SELF" :label="isApproval ? '自己审批':'自己办理'"></el-radio>
          <el-radio value="TO_LEADER" label="转给直属主管"></el-radio>
          <el-radio value="TO_SKIP" label="跳过任务"></el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="isApproval" :label="`✍ ${isApproval ? '审批同意':'办理'}时是否需要签字`">
        <el-radio-group v-model="_value.props.needSign">
          <el-radio :value="true" label="需要签字"></el-radio>
          <el-radio :value="false" label="无需签字"></el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="`👤当${action}人为空时`">
        <el-radio-group style="width: 100%;" v-model="_value.props.noUserHandler.type">
          <el-radio value="TO_NEXT" label="穿过节点"></el-radio>
      <!--<el-radio value="TO_REFUSE" v-if="isApproval" label="自动拒绝"></el-radio>-->
          <el-radio value="TO_ADMIN" label="转交管理员"></el-radio>
          <el-radio value="TO_USER" label="转交指定人员"></el-radio>
        </el-radio-group>
        <template v-if="_value.props.noUserHandler.type === 'TO_USER'">
          <el-button style="margin: 10px 0" @click="showOrgPicker(_value.props.noUserHandler.assigned, 'user')"
                     size="small" type="primary" icon="plus" plain>选择转交人员
          </el-button>
          <w-org-tags v-model="_value.props.noUserHandler.assigned"/>
        </template>
      </el-form-item>
      <el-form-item v-if="isApproval && _value.props.rejectRule" label="🚫当审批被拒绝时">
        <el-radio-group v-model="_value.props.rejectRule.type">
          <el-radio value="END" label="驳回并终止流程"></el-radio>
          <el-radio value="NEXT" label="继续流转"></el-radio>
          <el-radio value="SKIP" label="驳回到指定节点"></el-radio>
        </el-radio-group>
        <el-select placeholder="选择目标节点" v-if="_value.props.rejectRule.type === 'SKIP'"
                   v-model="_value.props.rejectRule.target">
          <el-option v-for="node in nodes" :key="node.id" :label="node.name" :value="node.id"/>
        </el-select>
      </el-form-item>
      <el-divider>扩展设置</el-divider>
      <el-form-item :label="`⏱ ${action}限时处理`">
        <div>
          <el-checkbox :label="`开启${action}限时处理`" v-model="_value.props.timeout.enable"/>
          <template v-if="_value.props.timeout.enable">
            <div style="margin: 10px 0">
              <el-text style="margin-right: 20px;">时长限制</el-text>
              <el-input style="width: 180px;" :min="1" type="number" v-model="_value.props.timeout.time">
                <template #append>
                  <el-select style="width: 75px;" v-model="_value.props.timeout.timeUnit">
                    <el-option value="M" label="分钟"/>
                    <el-option value="H" label="小时"/>
                    <el-option value="D" label="天"/>
                  </el-select>
                </template>
              </el-input>
            </div>
            <el-form-item label="超时后执行动作">
              <el-radio-group v-model="_value.props.timeout.type">
                <el-radio value="TO_PASS" :label="`${isApproval ? '自动同意' : '自动办理'}`"></el-radio>
                <el-radio value="TO_REFUSE" v-if="isApproval" label="自动拒绝"></el-radio>
                <el-radio value="NOTIFY" label="发催办提醒"></el-radio>
              </el-radio-group>
            </el-form-item>
          </template>
        </div>
      </el-form-item>
    </el-form>
    <w-org-picker ref="orgPicker" :type="orgPickerType" :selected="selectedOrg" multiple @ok="selectOk"/>
  </div>
</template>

<style lang="less" scoped>
:deep(.w-a-t-group) {
  display: flex;
  flex-wrap: wrap;

  .el-radio {
    width: 112px;
    margin-bottom: 10px;
  }
}

.w-node-rules {
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  margin-bottom: 20px;

  & > :first-child {
    display: inline-block;
    padding: 5px;
    width: 100%;
    background-color: var(--el-border-color);
  }

  & > :nth-child(2) {
    padding: 10px;
  }
}
</style>
