<template>
  <div>
    <el-form-item label="选项源">
      <el-radio-group v-model="config.optionType" @change="config.defaultValue = null">
        <el-radio-button label="静态" value="static"></el-radio-button>
        <el-radio-button label="接口" value="http"></el-radio-button>
        <el-radio-button label="数据源" value="datasource"></el-radio-button>
        <!--      <el-radio-button label="字典" value="dict"></el-radio-button>-->
      </el-radio-group>
    </el-form-item>
    <el-form-item label="选项设置">
      <template v-if="config.optionType === 'static'">
        <el-button style="margin: 7px" link type="primary" icon="plus" @click="addOption">添加选项</el-button>
        <vue-draggable class="w-fd-options" v-model="config.static" :animation="150" handle=".w-pm-drag">
          <template v-for="(op, i) in config.static" :key="i">
            <div class="w-flex-col-ct" style="margin-bottom: 5px">
              <iconify class="w-pm-drag" icon="ci:drag-vertical"/>
              <el-input style="margin: 2px 0" clearable @update:modelValue="v => changeOption(i, v)" :model-value="config.static[i].value">
                <template #append>
                  <el-button icon="Delete" @click="config.static.splice(i, 1)"/>
                </template>
              </el-input>
            </div>
          </template>
        </vue-draggable>
      </template>
      <template v-else-if="config.optionType === 'http'">
        <el-button icon="Coin" @click="configHttp">配置http数据源</el-button>
        <el-text truncated v-if="config.http.url">
          <el-tag style="margin-right: 5px" size="small" type="primary">{{config.http.method}}</el-tag>
          {{config.http.url}}
        </el-text>
        <w-dialog title="配置http数据源" close-free v-model="httpVisible" @ok="configHttpOk">
          <w-http-config ref="httpRef" v-model="tempHttp" :var-options="fieldOptions">
            <template #after>
              <el-form label-width="100px">
                <el-form-item label="指定数组对象" prop="dataPath">
                  <el-input v-model="tempHttp.dataPath" clearable placeholder="选项取值的JsonPath，例如: data.items"/>
                </el-form-item>
                <el-form-item label="label取值" prop="label">
                  <el-input v-model="tempHttp.label" clearable placeholder="选项显示名称字段的JsonPath"/>
                </el-form-item>
                <el-form-item label="value取值" prop="value">
                  <el-input v-model="tempHttp.value" clearable placeholder="选项绑定值字段的JsonPath"/>
                </el-form-item>
              </el-form>
            </template>
          </w-http-config>
        </w-dialog>
      </template>
      <template v-else-if="config.optionType === 'datasource'">
        <el-cascader clearable :show-all-levels="false" :props="{emitPath: false}"
                     :options="options" v-model="config.datasource" placeholder="选择全局数据源"/>
      </template>
      <template v-else-if="config.optionType === 'dict'">
        <el-select v-model="config.dictKey" placeholder="选择字典数据源"></el-select>
      </template>
    </el-form-item>
  </div>
</template>

<script setup>

import {VueDraggable} from "vue-draggable-plus";
import WHttpConfig from "../../../../../common/WHttpConfig.vue";
import WDialog from "../../../../../common/WDialog.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";
import ValueType from "../../../ValueType.js";
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
const {formFields} = storeToRefs(useWflowStore())


const config = defineModel()
const httpVisible = ref(false)
const httpRef = ref()
const tempHttp = ref({})
//注入数据源选项
const dsOptions = inject('dsOptions', [])

const fieldOptions = computed(() => {
  return [
    {
      value: 'form',
      label: '表单字段',
      disabled: formFields.value.length === 0,
      children: formFields.value
          .filter(v => v.valueType !== 'none' && !v.parent)
          .map(v => {
            return {
              label: v.name,
              value: v.key,
              valueType: v.valueType,
              type: 'FORM'
            }
          })
    },
    {
      value: 'datasource',
      label: '数据源',
      disabled: dsOptions.value.length === 0,
      children: dsOptions.value
    }
  ]
})

//过滤出选项类型的数据源
const options = computed(() => {
  const op = dsOptions.value.map(items => {
    items.children = items.children.filter(v => v.valueType === ValueType.options)
    return items
  })
  return op.filter(ds => ds.children && ds.children.length > 0)
})

function addOption() {
  const option = `选项${config.value.static.length + 1}`
  config.value.static.push({label: option, value: option})
}

function configHttp(){
  httpVisible.value = true;
  tempHttp.value = deepCopy(config.value.http)
}

function configHttpOk() {
  if (httpRef.value.validate()){
    config.value.http = deepCopy(tempHttp.value);
    httpVisible.value = false
  }
}

function changeOption(i, v) {
  config.value.static[i].label = v
  config.value.static[i].value = v
}
</script>

<style scoped lang="less">
.w-pm-drag {
  cursor: grab;
  font-size: large;
}
</style>
