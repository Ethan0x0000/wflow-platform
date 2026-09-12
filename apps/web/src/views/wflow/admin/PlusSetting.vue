<script setup>
import {VueDraggable} from "vue-draggable-plus";
import WDialog from "../common/WDialog.vue";
import WTip from "../common/WTip.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {storeToRefs} from "pinia";
import WCodeEditor from "../common/editor/WCodeEditor.vue";
import {copyValue, deepCopy, isEmpty} from "@/utils/GlobalFunc.js";
import {validateEl} from "@/api/model.js";
import {ElMessage} from "element-plus";
import {SYS_SYMBOLS} from "../common/config/CommonData.js";
const CustomPrintDesigner = defineAsyncComponent(() => import("../print/CustomPrintDesigner.vue"));

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => {
      return {}
    }
  },
  //流程json
  process: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const printDialog = ref(false)
const syncDialog = ref(false)
const customPrint = ref()
const tempPrintTp = ref({})
const tempFormSync = ref({})
const {formFields} = storeToRefs(useWflowStore())

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

const _rules = computed({
  get() {
    return _value.value?.setting?.code?.rules || []
  },
  set(val) {
    _value.value.setting.code.rules = val
  }
})

const _value = defineModel()

defineExpose({validate})

function validate() {
  return new Promise((resolve, reject) => {
    const errs = []
    const codeRule = _value.value.setting.code
    //检查自定义流水号设置
    if (codeRule.type === 'CUSTOM') {
      if (codeRule.rules.length === 0){
        errs.push('自定义流水号规则未设置')
      } else {
        let hasVar = false
        for (let i = 0; i < codeRule.rules.length; i++) {
          if (isEmpty(codeRule.rules[i])) {
            errs.push('自定义流水号固定值未填写')
            break
          }
          if (!hasVar && codeRule.rules[i].includes('${')) hasVar = true
        }
        if (!hasVar) errs.push('自定义流水号不能仅为固定值')
      }
    }
    //检查数据同步规则
    const syncRule = _value.value.setting.formSync
    if (syncRule.enable) {
      if (syncRule.events.length === 0) {
        errs.push('数据同步规则未选择同步时机')
      } else {
        switch (syncRule.type) {
          case "DB":
            if (isEmpty(syncRule.tbName)) errs.push('数据同步规则，未设置目标表名')
            break
          case "API":
            if (isEmpty(syncRule.apiUrl)) errs.push('数据同步规则，未设置目标URL')
            break
          case "EL":
            if (isEmpty(syncRule.el)) errs.push('数据同步规则，未设置EL表达式')
            break
        }
      }
    }
    if (errs.length > 0) reject(errs)
    else resolve()
  })
}

function designPrintTemplate() {
  if (_value.value.setting?.print?.template) {
    tempPrintTp.value = JSON.parse(_value.value.setting.print.template)
  } else {
    tempPrintTp.value = {
      data: {
        header: [],
        main: [],
        footer: []
      },
      version: '0.9.104',
      options: {}
    }
  }
  printDialog.value = true
}

function confirmPrint() {
  _value.value.setting.print.template = JSON.stringify(customPrint.value.getValue())
  printDialog.value = false
}

function configSync() {
  tempFormSync.value = deepCopy(_value.value.setting.formSync)
  syncDialog.value = true
}

function confirmSyncConfig() {
  _value.value.setting.formSync = deepCopy(tempFormSync.value)
  syncDialog.value = false
}

function addFieldMapping() {
  tempFormSync.value.fieldMapping.push({
    source: null,
    type: null,
    target: null
  })
}

function elValid(el) {
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

function copyKey(key) {
  copyValue(key, () => {
    ElMessage.success(`复制 ${key} 成功`)
  })
}

</script>

<template>
  <el-main class="w-designer-base">
    <el-form label-width="150">
      <el-form-item>
        <template #label>
          <el-text tag="b">流程流水号设置：</el-text>
        </template>
        <div class="w-setup-group">
          <el-radio-group v-model="_value.setting.code.type" class="w-layout-y">
            <el-radio value="DEFAULT">
              <span>默认流水号 </span>
              <el-text>默认格式为"WF" + "日期时间"</el-text>
            </el-radio>
            <el-radio value="CUSTOM">
              <span>自定义流水号 </span>
              <el-text>自定义流水号生成规则，可拖拽排序</el-text>
            </el-radio>
          </el-radio-group>
          <div v-if="_value.setting.code.type === 'CUSTOM'">
            <vue-draggable v-model="_rules" :animation="100" filter=".w-rule-add">
              <template v-for="(rule, i) in _rules">
                <el-tag closable style="margin: 5px; cursor: grab" v-if="rule.includes('${')"
                        @close="() => {if(rule.includes('${')) {_rules.splice(i, 1)}}">
                  {{ rule.substring(2, rule.length - 1) }}
                </el-tag>
                <el-input clearable @clear="_rules.splice(i, 1)" v-else
                          style="width: 100px; margin: 5px" size="small" v-model="_rules[i]"
                          placeholder="输入固定字符"/>
              </template>
              <el-dropdown v-if="_value.setting.code.type === 'CUSTOM'" class="w-rule-add">
                <el-button icon="plus" size="small" style="margin: 5px">规则</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="_rules.push('')">固定字符</el-dropdown-item>
                    <el-dropdown-item @click="_rules.push('${dateTime}')" divided>日期时间时分秒</el-dropdown-item>
                    <el-dropdown-item @click="_rules.push('${randNumber}')">随机4位数字</el-dropdown-item>
                    <el-dropdown-item @click="_rules.push('${dayAdd}')" divided>4位自增数字（每日清零）</el-dropdown-item>
                    <el-dropdown-item @click="_rules.push('${monthAdd}')">6位自增数字（每月清零）</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </vue-draggable>
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">流程功能设置：</el-text>
        </template>
        <div class="w-setup-group">
          <div>
            <el-checkbox label="非流程相关人员禁止查看流程" v-model="_value.setting.accessPerm"/>
            <el-text tag="div">是否仅限流程内参与人(含被抄送)人员可查看流程信息</el-text>
          </div>
          <div>
            <div>
              <el-checkbox label="开启流程讨论组" v-model="_value.setting.discuss.enable"/>
              <el-checkbox v-if="_value.setting.discuss.enable" label="流程结束后也允许讨论"
                           v-model="_value.setting.discuss.endEnable"/>
            </div>
            <el-text tag="div">允许流程在讨论组内进行交流</el-text>
          </div>
          <div>
            <div>
              <el-checkbox label="允许评论流程" v-model="_value.setting.comment.enable"/>
              <el-checkbox v-if="_value.setting.comment.enable" label="流程结束后也允许评论"
                           v-model="_value.setting.comment.endEnable"/>
            </div>
            <el-text tag="div">允许任何人对流程添加评论</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.enableCancel" label="允许发起人撤销进行中的流程" value=""/>
            <el-text tag="div">发起人随时可以撤销进行中的流程</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.cancel.enable">
              允许发起人撤销
              <el-input v-model="_value.setting.cancel.timeout" type="number" size="small"
                        :disabled="!_value.setting.cancel.enable" style="width: 60px;"
                        :min="0" controls-position="right"/>
              天内结束的流程
            </el-checkbox>
            <el-text tag="div">发起人随时可以撤销指定时间内结束的流程</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.revise.enable">
              允许发起人修改
              <el-input :disabled="!_value.setting.revise.enable" v-model="_value.setting.revise.timeout"
                        type="number" size="small" style="width: 60px;" :min="0" controls-position="right"/>
              天内结束的流程
            </el-checkbox>
            <el-text tag="div">发起人可以修改已经通过的流程表单数据，修改后将通知流程中所有相关人员</el-text>
          </div>
          <div>
            <el-checkbox label="允许代他人提交" v-model="_value.setting.enableAgent"/>
            <el-text tag="div">提交人和被代理人都应当有本流程的可发起权限</el-text>
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">审批/办理人设置：</el-text>
        </template>
        <div class="w-setup-group">
          <div>
            <el-checkbox v-model="_value.setting.enableUrging" label="允许被催办"/>
            <el-text tag="div">给待办的人员发送消息进行催办</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.enableRevoke" label="允许审批人撤回操作"/>
            <el-text tag="div">在下一步人员未处理前，审批人可撤回操作</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.agreeSign" label="审批人同意时必须签字"/>
            <el-text tag="div">此处设置了以后，所有审批节点同意时必须签字</el-text>
          </div>
          <div>
            <el-checkbox v-model="_value.setting.reloadUser" label="不缓存节点参与人"/>
            <el-text tag="div">当节点重复经过时，不使用之前的而是每次都重新解析参与人</el-text>
          </div>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">审批人去重设置：</el-text>
        </template>
        <div>
          <el-text tag="div">当同一个流程中审批人重复出现时</el-text>
          <el-radio-group v-model="_value.setting.deduplication.type" class="w-layout-y">
            <el-radio label="每次都需要审批" value="NONE"/>
            <el-radio label="只需要审批一次，其余自动处理" value="ONCE"/>
            <el-radio label="仅相邻审批节点自动处理" value="NEXT"/>
          </el-radio-group>
          <template v-if="_value.setting.deduplication.type !== 'NONE'">
            <el-text tag="div" style="margin-top: 10px">自动处理方式为</el-text>
            <el-radio-group v-model="_value.setting.deduplication.isSkip">
              <el-radio label="审批人自动同意" :value="false"/>
              <el-radio label="跳过该任务" :value="true"/>
            </el-radio-group>
          </template>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">流程退回设置：</el-text>
        </template>
        <div>
          <el-text tag="div">当流程被退回某个节点，处理后再次流转时</el-text>
          <el-radio-group v-model="_value.setting.returnSkip">
            <el-radio label="从退回的位置继续" :value="true"/>
            <el-radio label="重新走所有步骤" :value="false"/>
          </el-radio-group>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">业务数据同步设置：</el-text>
        </template>
        <div>
          <el-checkbox label="开启流程表单数据同步到业务表" v-model="_value.setting.formSync.enable"/>
          <template v-if="_value.setting.formSync?.enable">
            <div style="display:flex;">
              <el-text>同步时机：</el-text>
              <el-checkbox-group v-model="_value.setting.formSync.events">
                <el-checkbox label="新增" value="create"/>
                <el-checkbox label="修改" value="update"/>
                <el-checkbox label="撤销" value="revoke"/>
                <el-checkbox label="驳回" value="reject"/>
                <el-checkbox label="删除" value="delete"/>
                <el-checkbox label="通过" value="pass"/>
              </el-checkbox-group>
            </div>
            <div>
              <el-button size="small" icon="Switch" @click="configSync">配置同步规则</el-button>
            </div>
          </template>
          <w-dialog v-model="syncDialog" width="700px" title="配置数据同步规则" @ok="confirmSyncConfig">
            <el-form>
              <el-form-item label="同步方式">
                <div>
                  <el-radio-group v-model="tempFormSync.type">
                    <el-radio value="DB">
                      物理表
                      <w-tip content="数据自动同步物理表，需要提前建好表"/>
                    </el-radio>
                    <el-radio value="EL">
                      EL表达式
                      <w-tip content="数据将会作为一个Map，传入该表达式，您可以实现一个java函数用来接收</br>
                      例如：@handlerService.handler(#ctx, #event)
                      </br>ctx是一个上下文Map<String, Object>对象
                      </br>event是事件类型 create、update、revoke、delete、pass"/>
                    </el-radio>
                    <el-radio value="API">
                      Api接口
                      <w-tip content="默认推送数据到该接口</br>-请求路径为 POST：url + event
                      </br>-event: 触发的事件 create、update、revoke、delete、pass
                      </br>-请求参数：所有上下文数据，类型application/json"/>
                    </el-radio>
                  </el-radio-group>
                  <div>
                    <el-input clearable v-if="tempFormSync.type === 'DB'"
                              v-model="tempFormSync.tbName" placeholder="请设置要同步的表名"/>
                    <el-input clearable v-else-if="tempFormSync.type === 'EL'"
                              v-model="tempFormSync.el" placeholder="请输入要调用的EL表达式">
                      <template #append>
                        <el-button @click="elValid(tempFormSync.el)">校验</el-button>
                      </template>
                    </el-input>
                    <el-input style="width: 500px;" v-else clearable placeholder="请输入http接口地址" v-model="tempFormSync.apiUrl">
                      <template #prepend>
                        <el-text>POST</el-text>
                      </template>
                      <template #append>
                        <el-text>/{event}</el-text>
                      </template>
                    </el-input>
                  </div>
                </div>
              </el-form-item>
              <el-form-item label="前置处理">
                <el-switch v-model="tempFormSync.preCover"></el-switch>
                <el-text tag="div" class="w-placeholder">数据转换，返回一个自定义包含数据字段的js对象</el-text>
                <w-code-editor v-if="tempFormSync.preCover" style="height: 250px;"
                               auto-theme lang="javascript" v-model="tempFormSync.preJs"
                               prefix="function (ctx) {  😥注意不支持ES6语法" prefix-tip="对推送数据进行前置转换处理</br>
                                 - ctx：上下文数据</br>需要返回 return 一个转换后的对象值"/>
              </el-form-item>
              <el-form-item label="同步范围" v-if="tempFormSync.type === 'DB'">
                <el-radio-group v-model="tempFormSync.range">
                  <el-radio label="已映射的" :value="false"/>
                  <el-radio label="全部字段" :value="true"/>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="字段映射" v-if="tempFormSync.type === 'DB'">
                <div>
                  <el-button icon="Plus" type="primary" link @click="addFieldMapping">添加字段映射</el-button>
                  <el-scrollbar max-height="200px">
                    <div class="w-field-mapping" v-for="(field, i) in tempFormSync.fieldMapping">
                      <el-cascader clearable placeholder="选择字段"
                                   v-model="field.source" :show-all-levels="true"
                                   :props="{emitPath: false}" :options="fieldOptions"/>
                      <el-text style="padding: 0 10px">映射为</el-text>
                      <el-input style="width: 280px" clearable v-model="field.target" :placeholder="`表字段名，默认值 ${field.source}`">
                        <template #append>
                          <el-tooltip placement="left" :content="`复制默认值 ${field.source}`">
                            <el-button icon="CopyDocument" @click="copyKey(field.source)"></el-button>
                          </el-tooltip>
                        </template>
                      </el-input>
                      <el-button icon="Delete" text circle
                                 @click="tempFormSync.fieldMapping.splice(i, 1)"></el-button>
                    </div>
                  </el-scrollbar>
                </div>
              </el-form-item>
            </el-form>
          </w-dialog>
        </div>
      </el-form-item>
      <el-form-item>
        <template #label>
          <el-text tag="b">打印模板设置：</el-text>
        </template>
        <el-radio-group v-model="_value.setting.print.type" class="w-layout-y">
          <el-radio value="DEFAULT">
            <span>默认打印模板</span>
          </el-radio>
          <el-radio value="CUSTOM">
            自定义打印模板
            <el-button v-if="_value.setting.print.type === 'CUSTOM'" icon="Tickets"
                       style="margin-left: 10px" size="small" @click="designPrintTemplate">去设计模板
            </el-button>
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <w-dialog fullscreen close-free border v-model="printDialog" title="wflow-打印模板设计器" @ok="confirmPrint">
      <custom-print-designer :config="tempPrintTp" ref="customPrint" :process="process"/>
    </w-dialog>
  </el-main>
</template>

<style lang="less" scoped>
.w-designer-base {
  margin: 0 auto;
  border-radius: 5px;
  background-color: var(--el-bg-color);
  width: 800px;
  min-height: calc(100vh - 100px);
}

.w-text-point {
  color: var(--el-text-color-secondary);
}

.w-field-mapping {
  display: flex;
  margin-bottom: 5px;
  padding-right: 20px;
}

:deep(.w-setup-group) {
  & > div {
    margin-bottom: 10px;
  }

  .el-text {
    margin-left: 20px;
  }
}
</style>
