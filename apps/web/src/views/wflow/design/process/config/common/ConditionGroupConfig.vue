<script setup>

import {storeToRefs} from 'pinia'
import ConditionItemConfig from "./ConditionItemConfig.vue";
import WDialog from "../../../../common/WDialog.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {ElMessage} from "element-plus";
import ValueType from "../../../form/ValueType.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {validateEl} from "@/api/model.js";
import WCodeEditor from "@/views/wflow/common/editor/WCodeEditor.vue";
import WHttpConfig from "@/views/wflow/common/WHttpConfig.vue";
import {SYS_SYMBOLS} from "@/views/wflow/common/config/CommonData.js";

const props = defineProps({
  name: String,
  modelValue: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const _value = defineModel()
defineEmits(['delete'])
const {formFields} = storeToRefs(useWflowStore())
//构建总选项
const cdOptions = computed(() => {
  //提取表单字段，过滤不支持的选项
  return formFields.value.filter(v => v.valueType !== ValueType.none)
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

const fields = computed(() => {
  const obj = {}
  formFields.value.forEach(v => {obj[v.key] = v})
  return obj
})

const addCdVisible = ref(false)
const baseCd = ref({})
function addCondition() {
  addCdVisible.value = true
  baseCd.value = {
    group: null,
    type: null,
    symbol: null,
    name: [],
    valueType: null
  }
}

function addConditionConfirm() {
  const gt = baseCd.value.group
  if ((baseCd.value.valueType && baseCd.value.symbol) ||
      (baseCd.value.type && (gt === 'CONTEXT' || gt === 'DEV'))) {
    addCdVisible.value = false
    _value.value.conditions.push({
      ...baseCd.value,
      compare: baseCd.value?.compare ? baseCd.value.compare : null, //比较关系
      compareVal: [] //比较值集合
    })
  } else {
    ElMessage.warning('请选择条件类别')
  }
}

function loadFormCd(field) {
  baseCd.value.type = field.type;
  baseCd.value.name[1] = field.name;
  baseCd.value.valueType = field.valueType
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

</script>

<template>
  <div class="w-condition-group">
    <div>
      <el-text>{{ name }}</el-text>
      <div>
        <el-text style="margin-right: 10px">组内条件关系:</el-text>
        <el-switch v-model="_value.logic" active-text="且" inactive-text="或"></el-switch>
      </div>
      <div>
        <el-button link icon="Plus" type="primary" @click="addCondition">添加条件</el-button>
        <el-button link icon="Delete" type="danger" @click="$emit('delete')">删除</el-button>
      </div>
    </div>
    <div>
      <div class="w-cd-group-tip" v-if="_value.conditions.length === 0">
        <el-text>请点击上方 + 添加条件选项</el-text>
      </div>
      <el-form label-position="top" label-width="100" class="w-cd-group-item">
        <el-form-item v-for="(cd, i) in _value.conditions" :key="cd.id">
          <template #label>
            <el-text truncated>{{ (cd.name || []).join('-') }}</el-text>
          </template>
          <div v-if="cd.group === 'DEV'" style="width: calc(100% - 20px)">
            <el-input clearable v-if="cd.type === 'EL'"
                      v-model="cd.compareVal[0]" placeholder="输入一个true/false 值的EL表达式">
              <template #append>
                <el-button @click="elValid(cd.compareVal[0])">校验</el-button>
              </template>
            </el-input>
            <w-code-editor v-else-if="cd.type === 'JS'"
                           style="height: 200px;" auto-theme lang="javascript"
                           v-model="cd.compareVal[0]" prefix="function compare(ctx) {"
                           prefixTip="ctx 是上下文，ctx.xxx可取上下文变量xxx
                           </br>需要 return 一个true/false 代表条件是否满足"/>
            <w-http-config v-else :var-options="fieldOptions" v-model="cd.compareVal[0]">
              <template #after>
                <w-code-editor style="height: 200px;" auto-theme lang="javascript"
                               v-model="cd.compareVal[0].aftJs" prefix="function compare(ctx, res) {"
                               prefixTip="ctx 是上下文，ctx.xxx可取上下文变量xxx
                               </br> res 是请求的响应结果
                               </br>需要 return 一个true/false 代表条件是否满足"/>
              </template>
            </w-http-config>
          </div>
          <condition-item-config v-else v-model="_value.conditions[i]" :value-type="cd.valueType"
                                 :field="fields[cd.symbol]" style="width: calc(100% - 20px)"/>
          <el-icon class="w-cd-del" @click="_value.conditions.splice(i, 1)">
            <Delete/>
          </el-icon>
        </el-form-item>
      </el-form>
    </div>
    <w-dialog :border="false" title="选择条件类别" width="500" v-model="addCdVisible" @ok="addConditionConfirm">
      <el-select style="width: 45%;" v-model="baseCd.group" @change="baseCd.symbol = null; baseCd.valueType = null">
        <el-option label="发起人" value="INITIATOR" @click="baseCd.name[0] = '发起人'"/>
        <el-option label="表单字段" value="FORM" @click="baseCd.name[0] = '表单'"></el-option>
        <el-option label="流程数据" value="CONTEXT" @click="baseCd.name[0] = '流程数据'"/>
        <el-option label="🧑‍💻开发者模式" value="DEV" @click="baseCd.name[0] = '开发者模式'"/>
      </el-select>
      <el-text style="margin: 0 10px">的</el-text>
      <el-select style="width: 45%;" v-model="baseCd.type" @change="v => baseCd.symbol = v" v-if="baseCd.group === 'INITIATOR'">
        <el-option label="本人" value="user" @click="baseCd.name[1] = '本人'; baseCd.valueType = 'user'"/>
        <el-option label="所在部门" value="dept" @click="baseCd.name[1] = '所在部门'; baseCd.valueType = 'dept'"/>
        <el-option label="角色" value="role" @click="baseCd.name[1] = '角色'; baseCd.valueType = 'role'"/>
        <!-- TODO 可以扩展岗位，等等发起人的一些属性 -->
      </el-select>
      <el-select style="width: 45%;" v-model="baseCd.symbol" v-else-if="baseCd.group === 'FORM'">
        <el-option v-for="item in cdOptions" :label="item.name" :value="item.key" :key="item.key" @click="loadFormCd(item)"/>
      </el-select>
      <el-select style="width: 45%;" v-model="baseCd.type" v-else-if="baseCd.group === 'CONTEXT'">
        <el-option label="审批意见" value="result" @click="baseCd.name[1] = '审批意见'; baseCd.valueType = 'result'; baseCd.symbol = 'PRE_HANDLER_RESULT'"/>
        <el-option label="流程变量" value="variable" @click="baseCd.name[1] = '流程变量'; baseCd.valueType = 'all'"/>
      </el-select>
      <el-select style="width: 45%;" v-model="baseCd.type" v-else-if="baseCd.group === 'DEV'"
                 @change="(v) => {baseCd.symbol = v; baseCd.compare = 'OTHER'}">
        <el-option label="EL表达式判断" value="EL" @click="baseCd.name[1] = 'EL表达式判断'"/>
        <el-option label="JS脚本判断" value="JS" @click="baseCd.name[1] = 'JS脚本判断'"/>
        <el-option label="HTTP请求判断" value="HTTP" @click="baseCd.name[1] = 'HTTP请求判断'"/>
      </el-select>
      <el-text type="warning" v-else>👀请选择左侧类别</el-text>
    </w-dialog>
  </div>
</template>

<style scoped lang="less">
.w-condition-group {
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  margin-bottom: 20px;

  .w-cd-group-tip {
    text-align: center;
    padding: 10px 0;
  }

  & > :first-child {
    padding: 0 5px;
    display: flex;
    align-items: center;
    background-color: var(--el-fill-color-darker);

    & > :first-child {
      flex: 1;
    }

    & > :nth-child(2) {
      display: flex;
      align-items: center;
      margin-right: 100px;
    }
  }

  & > :nth-child(2) {
    padding: 10px;
  }
}

:deep(.w-cd-group-item) {
  .w-cd-del {
    color: var(--el-color-danger);
    padding: 3px;
    cursor: pointer;
  }

  .el-form-item__label {
    margin-bottom: 0 !important;
  }
}
</style>
