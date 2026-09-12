<script setup>
import {useWflowStore} from "@/stores/modules/wflow.js";
import {loadOptions} from "@/utils/GlobalFunc.js";
import WOrgPicker from "./WOrgPicker.vue";
import ValueType from "../design/form/ValueType.js";
import WOrgTags from "./WOrgTags.vue";

const props = defineProps({
  valueType: {
    type: String
  },
  field: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const _value = defineModel()

const orgPicker = ref()
const pickerType = ref('org')

const options = ref([])

//加载option类型下拉框选项比较值
function loadOption(){
  if (options.value.length === 0){
    loadOptions(useWflowStore().dsVars, props.field.props).then(op => {
      options.value = op
    })
  }
}

function addOrg(type) {
  pickerType.value = type
  orgPicker.value.open()
}

function selectOk(orgs) {
  _value.value.compareVal = orgs
  orgPicker.value.close()
}

function isType(type) {
  return _value.value.fieldType === type || _value.value.type === type
}
</script>

<template>
  <template v-if="_value.type === 'variable'">
    <el-input style="width: 120px;" clearable v-model="_value.symbol" placeholder="输入变量名"/>
    <el-divider direction="vertical"/>
  </template>
  <!--每类条件选项-->
  <template v-if="valueType === ValueType.org">
    <w-org-tags :show-add="true" v-model="_value.compareVal" @add="addOrg('org')" add-text="人员/部门"/>
  </template>
  <template v-else-if="valueType === 'role'">
    <w-org-tags :show-add="true" v-model="_value.compareVal" @add="addOrg('role')" add-text="角色"/>
  </template>
  <template v-else-if="valueType === 'user'">
    <w-org-tags :show-add="true" v-model="_value.compareVal" @add="addOrg('user')" add-text="人员"/>
  </template>
  <template v-else-if="valueType === ValueType.bool">
    <el-radio-group  v-model="_value.compareVal[0]">
      <el-radio-button :value="true" label="真/true"/>
      <el-radio-button :value="false" label="假/false"/>
    </el-radio-group>
  </template>
  <template v-else-if="valueType === ValueType.orgArray">
    <w-org-tags v-if="isType('UserPicker')" :show-add="true"
                v-model="_value.compareVal" @add="addOrg('user')" add-text="人员"/>
    <w-org-tags v-else-if="isType('DeptPicker')" :show-add="true"
                v-model="_value.compareVal" @add="addOrg('dept')" add-text="部门"/>
  </template>
  <template v-else-if="valueType === 'dept'">
    <w-org-tags :show-add="true" v-model="_value.compareVal" @add="addOrg('dept')" add-text="部门"/>
  </template>
  <template v-else-if="valueType === ValueType.number">
    <template v-if="_value.compare === 'BT'">
      <el-input style="width: 45%;" type="number" v-model="_value.compareVal[0]" placeholder="左比较值"></el-input>
      ~
      <el-input style="width: 45%;" type="number" v-model="_value.compareVal[1]" placeholder="右比较值"></el-input>
    </template>
    <el-select v-else-if="_value.compare === 'IN'" multiple filterable
               v-model="_value.compareVal" placeholder="请输入选项">
      <el-option v-for="op in _value.compareVal" :key="op.symbol" :label="op.name" :value="op.name"/>
    </el-select>
    <el-input v-else type="number" v-model="_value.compareVal[0]" placeholder="比较值"/>
  </template>
  <template v-else-if="valueType === ValueType.string">
    <el-select v-if="_value.compare === 'IN'" multiple filterable allow-create
               v-model="_value.compareVal" placeholder="请输入选项">
      <el-option v-for="op in _value.compareVal" :key="op.symbol" :label="op.name" :value="op.name"/>
    </el-select>
    <el-input v-else v-model="_value.compareVal[0]" placeholder="输入比较值"/>
  </template>
  <template v-else-if="valueType === ValueType.array">
    <el-select multiple filterable allow-create default-first-option
               clearable v-model="_value.compareVal"></el-select>
  </template>
  <template v-else-if="valueType === ValueType.time">
    <el-time-picker clearable is-range arrow-control range-separator="~" value-format="HH:mm:ss"
                    v-model="_value.compareVal" start-placeholder="开始时间" end-placeholder="结束时间"
                    style="width: auto" v-if="_value.compare === 'CT' || _value.compare === 'NCT'"/>
    <el-time-picker type="datetime" value-format="HH:mm:ss" v-model="_value.compareVal[0]"
                    clearable placeholder="比较时间" style="width: 60%" v-else/>
  </template>
  <template v-else-if="valueType === ValueType.timeRange">
    <el-input type="number" :min="0" v-model="_value.compareVal[0]" placeholder="小时">
      <template #append>小时</template>
    </el-input>
  </template>
  <template v-else-if="valueType === ValueType.dateTime">
    <el-date-picker type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" v-model="_value.compareVal"
                    style="width: auto" start-placeholder="开始时间" end-placeholder="结束时间"
                    v-if="_value.compare === 'CT' || _value.compare === 'NCT'"/>
    <el-date-picker type="datetime" value-format="YYYY-MM-DD HH:mm:ss" v-model="_value.compareVal[0]"
                    placeholder="比较时间" style="width: 60%" v-else/>
  </template>
  <template v-else-if="valueType === ValueType.dateTimeRange">
    <el-input type="number" :min="0" v-model="_value.compareVal[0]" placeholder="天数">
      <template #append>天</template>
    </el-input>
  </template>
  <template v-else-if="valueType === ValueType.option">
    <el-select v-if="_value.compare === 'EQ' || _value.compare === 'NEQ'" placeholder="选择比较值"
               @visible-change="loadOption" v-model="_value.compareVal[0]" value-key="value">
      <el-option v-for="op in options" :label="op.label" :value="op"/>
    </el-select>
    <el-select v-else placeholder="选择可能的值" multiple v-model="_value.compareVal"
               value-key="value" @visible-change="loadOption">
      <el-option v-for="op in options" :label="op.label" :value="op"/>
    </el-select>
  </template>
  <template v-else-if="valueType === ValueType.options">
    <el-select placeholder="选择可能的值" multiple v-model="_value.compareVal"
               value-key="value" @visible-change="loadOption">
      <el-option v-for="op in options" :label="op.label" :value="op"/>
    </el-select>
  </template>
  <template v-else-if="valueType === 'result'">
    <el-radio-group v-model="_value.compareVal[0]">
      <el-radio label="同意" value="agree"/>
      <el-radio label="拒绝" value="reject"/>
    </el-radio-group>
  </template>
  <template v-else-if="valueType === 'all'">
    <template v-if="_value.compare === 'BT'">
      <el-input style="width: 90px;" type="number" v-model="_value.compareVal[0]" placeholder="左比较值"></el-input>
      ~
      <el-input style="width: 90px;" type="number" v-model="_value.compareVal[1]" placeholder="右比较值"></el-input>
    </template>
    <el-select v-else-if="_value.compare === 'IN'" multiple filterable
               v-model="_value.compareVal" placeholder="请输入选项">
      <el-option v-for="op in _value.compareVal" :key="op.symbol" :label="op.name" :value="op.name"/>
    </el-select>
    <el-input v-else style="width: 200px" v-model="_value.compareVal[0]" placeholder="比较值"/>
  </template>
  <w-org-picker :type="pickerType" multiple ref="orgPicker" :selected="_value.compareVal" @ok="selectOk"/>
</template>

<style scoped lang="less">
.w-auto-w {
  width: auto !important;
}
</style>
