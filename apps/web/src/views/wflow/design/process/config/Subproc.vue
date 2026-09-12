<script setup>
import nodeMixin from "../NodeMixin.js";
import FormPermConf from "../../../admin/config/FormPermConf.vue";
import WBrightBlock from "../../../common/WBrightBlock.vue";
import WOrgTags from "../../../common/WOrgTags.vue";
import WOrgPicker from "../../../common/WOrgPicker.vue";
import {getUserDeptList} from "@/api/org.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {getModelFormInfo, getProcGroupItemsList} from "@/api/model.js";
import WTip from "../../../common/WTip.vue";
import {isEmpty} from "@/utils/GlobalFunc.js";
import {resolveFormJson} from "@/utils/ProcessUtil.js";
import {SYS_SYMBOLS} from "../../../common/config/CommonData.js";
import DefaultValue from "../../form/base/config/common/DefaultValue.vue";
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
import ValueType from "../../../design/form/ValueType.js";


const props = defineProps({
  ...nodeMixin.props
})
const emit = defineEmits(nodeMixin.emits)
const _value = defineModel()
const {formFields} = storeToRefs(useWflowStore())
const noMainForm = inject('noMainForm', ref(false))
const orgPicker = ref()
const userDepts = ref([])
const subprocFormInfo= ref({})
const fixedUser = computed({
  get() {
    const user = _value.value.props.fixedUser
    return user ? [user] : []
  },
  set(val) {
    _value.value.props.fixedUser = val[0]
  }
})
const groupItems = ref([])
const subprocFieldOptions = computed(() => {
  return subprocFormInfo.value.formFields?.map(v => {
    return {
      ...v,
      label: v.name,
      value: v.key
    }
  })
})
const subFormFields = computed(() => {
  const fields = {}
  subprocFormInfo.value?.formFields.forEach(v => {
    fields[v.key] = v
  })
  return fields
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
      children: formFields.value
          .filter(v => v.valueType !== ValueType.none)
          .map(v => {
            return {
              label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
              value: v.key,
              valueType: v.valueType
            }
      })
    }
  ]
})

onMounted(() => {
  const _props = _value.value.props
  getModels()
  if (_props.initiatorType === "FIXED" && _props.fixedUser) {
    loadUserDept(_value.value.props.fixedUser.id)
  }
  //加载选中的子流程模型
  if (!isEmpty(_props.code)) {
    loadSubprocModel(true)
  }
})

function getModels() {
  getProcGroupItemsList().then(res => {
    groupItems.value = res.data.filter(g => g.items.length > 0).map(group => {
      return {
        value: group.id,
        label: group.name,
        children: group.items.map(it => {
          return {
            value: it.code,
            label: it.procName,
            version: it.version,
            defineId: it.defineId
          }
        })
      }
    })
  })
}

function loadSubprocModel(isInit = false) {
  if (!isInit) _value.value.props.contextMap.length = 0
  const _props = _value.value.props
  getModelFormInfo(_props.code, _props.isBindVer ?  _props.version : null).then(res => {
    subprocFormInfo.value = res.data
    if (subprocFormInfo.value.formType === 0) {
      //低代码模式拖拽表单，提取转换字段信息
      subprocFormInfo.value.formFields = resolveFormJson(JSON.parse(res.data.formJson)?.components || [])
    }
  }).catch(err => {
    ElMessage.error(err.msg || err)
  })
}

function selectOk(orgs) {
  orgPicker.value.close()
  _value.value.props.fixedUser = orgs[0]
  loadUserDept(orgs[0].id)
}

function confirm(data) {
  if ((data.children || []).length > 0) return
  _value.value.props.name = data.label
  _value.value.props.version = data.version
  _value.value.props.defineId = data.defineId
}

function loadUserDept(userId) {
  getUserDeptList(userId).then(res => {
    userDepts.value = res.data || []
    if (userDepts.value?.length === 0) {
      ElMessageBox.alert("该用户未设置所在部门，请检查", "提示", {
        confirmButtonText: "确定",
        type: "warning",
      })
    } else {
      _value.value.props.fixedDept = userDepts.value[0].id
    }
  })
}

function addMapping() {
  _value.value.props.contextMap.push({
    isFixed: false, //是否为固定值
    source: null, //源数据
    isVar: false, //是否是流程变量
    sync: false, //是否双向同步
    target: null
  })
}

function delMapping(i) {
  _value.value.props.contextMap.splice(i, 1)
}
</script>

<template>
  <el-tabs>
    <el-tab-pane lazy label="子流程设置">
     <el-form label-position="top">
       <el-form-item label="🛠️选择子流程">
        <el-cascader clearable :show-all-levels="false" :options="groupItems" @change="loadSubprocModel"
                     :props="{emitPath: false}" placeholder="选择子流程" v-model="_value.props.code">
          <template #default="{ node, data }">
            <div @click="confirm(data)">{{ data.label }}</div>
          </template>
        </el-cascader>
       </el-form-item>
       <el-form-item label="🧑‍💼设置发起人">
         <el-radio-group v-model="_value.props.initiatorType" @change="_value.props.fixedDept = null">
           <el-radio label="同主流程" value="PARENT"/>
           <el-radio label="指定人员" value="FIXED"/>
         </el-radio-group>
         <div style="margin-left: 10px" v-if="_value.props.initiatorType === 'FIXED'">
           <w-org-tags show-add @add="orgPicker.open()" @change="fixedUser = []" v-model="fixedUser"/>
           <w-org-picker ref="orgPicker" type="user" :selected="fixedUser" @ok="selectOk"/>
         </div>
       </el-form-item>
       <el-form-item label="选发起部门" v-if="_value.props.initiatorType === 'FIXED' && userDepts.length > 1">
         <el-radio-group v-model="_value.props.fixedDept">
           <el-radio :label="dept.name" :value="dept.id" v-for="dept in userDepts"/>
         </el-radio-group>
       </el-form-item>
       <el-form-item label="✨多版本选择">
         <el-radio-group v-model="_value.props.isBindVer" @change="loadSubprocModel">
           <el-radio :value="false">按最新版发起</el-radio>
           <el-radio :value="true">按绑定版本发起</el-radio>
         </el-radio-group>
       </el-form-item>
       <el-form-item label="⚙️可选配置">
<!--         <el-checkbox v-model="_value.props.isSyncAllVar">主子变量全量同步</el-checkbox>
         <el-checkbox v-model="_value.props.isSyncBizKey">业务BizKey同步</el-checkbox>-->
         <el-checkbox v-model="_value.props.formAutoMapping">
           表单自动映射
           <w-tip content="父流程表单数据将会自动映射到子流程对应key的字段上"/>
         </el-checkbox>
         <el-checkbox v-model="_value.props.isAsync">
           异步发起子流程
           <w-tip content="主流程不等待子流程结束，直接往下执行"/>
         </el-checkbox>
       </el-form-item>
       <el-form-item label="🔗状态同步" v-if="false">
         <w-bright-block type="warning" content="开启后，若子流程驳回、撤销、手动删除，也会关联到主流程状态"/>
         <el-checkbox v-model="_value.props.statusSync">子→主 流程状态同步</el-checkbox>
       </el-form-item>
       <el-form-item>
         <template #label>
           ⛓️‍💥父→子流程表单传递
           <w-tip content="选择性给子流程表单字段设置值"/>
           <el-button style="margin-left: 10px" type="primary" icon="Plus" link @click="addMapping">添加规则</el-button>
         </template>
         <w-bright-block style="margin-bottom: 5px" show-icon type="warning"
                         content="动态值父子映射必须要保证值类型一致"/>
         <div v-for="(ctx, i) in _value.props.contextMap" :key="i">
           <el-select style="width: 85px; margin-right: 5px" @change="ctx.source = null"
                      v-model="ctx.isFixed" placeholder="值类型">
             <el-option label="固定" :value="true"/>
             <el-option label="动态" :value="false"/>
           </el-select>
           <template v-if="ctx.isFixed">
              <!-- 拖拽模式表单，设置值渲染成对应组件 -->
             <template v-if="subprocFormInfo.formType === 0">
               <el-popover popper-class="w-proper" title="设置要传给子流程表单字段的值" trigger="click" :disabled="isEmpty(ctx.target)" placement="left-start">
                 <template #reference>
                   <el-button :disabled="isEmpty(ctx.target)" style="width: 150px;">
                     <span style="margin-right: 5px">设置要传递的值</span>
                     <el-icon v-if="isEmpty(ctx.source)" style="color: var(--el-color-warning)">
                       <Warning />
                     </el-icon>
                     <el-icon v-else style="color: var(--el-color-success)">
                       <CircleCheck/>
                     </el-icon>
                   </el-button>
                 </template>
                 <default-value :config="subFormFields[ctx.target]" v-model="ctx.source" placeholder="要设置的值"/>
               </el-popover>
             </template>
             <el-input v-else style="width: 150px;" placeholder="输入固定值，#变量名 可引用变量" v-model="ctx.source"/>

           </template>

           <el-cascader clearable placeholder="主流程字段" style="width: 150px;"
                        v-model="ctx.source" :show-all-levels="false" v-else
                        :props="{emitPath: false}" :options="fieldOptions">
             <template #default="{ node, data }">
               <div class="w-flex-col-ct" @click="ctx.valueType = data.valueType || 'string'">
                 <span style="margin-right: 10px">{{ data.label }}</span>
                 <el-tag size="small" type="primary" v-if="(data.children || []).length === 0">
                   {{data.valueType || 'string'}}
                 </el-tag>
               </div>
             </template>
           </el-cascader>
           →
           <el-cascader clearable placeholder="子流程字段" style="width: 150px;"
                        v-model="ctx.target" :show-all-levels="false"
                        @change="() => { if (ctx.isFixed) ctx.source = null}"
                        :props="{emitPath: false}" :options="subprocFieldOptions">
             <template #default="{ node, data }">
               <div class="w-flex-col-ct" @click="ctx.valueType = data.valueType || 'string'">
                 <span style="margin-right: 10px">{{ data.label }}</span>
                 <el-tag size="small" type="primary">{{data.valueType}}</el-tag>
               </div>
             </template>
           </el-cascader>
           <el-button style="margin-left: 10px" size="small" @click="delMapping(i)"
                      type="danger" icon="Delete" circle text/>
         </div>
       </el-form-item>
     </el-form>
    </el-tab-pane>
    <el-tab-pane lazy label="主表单权限" v-if="!noMainForm">
      <w-bright-block style="margin-bottom: 10px" type="warning"
                      content="提示：📢子流程有自己的表单，也可以看到主流程表单"/>
      <form-perm-conf :show-e="false" default-perm="R" :formItems="formItems" v-model="_value.props.formPerms"/>
    </el-tab-pane>
  </el-tabs>

</template>

<style scoped>

</style>
