<script setup>
import WHttpConfig from "../../../../common/WHttpConfig.vue";
import WDialog from "../../../../common/WDialog.vue";
import ValueType from "../../ValueType.js";
import {deepCopy} from "@/utils/GlobalFunc.js";
import {storeToRefs} from "pinia";
import {useWflowStore} from "@/stores/modules/wflow.js";
const {formFields} = storeToRefs(useWflowStore());
//注入数据源选项
const dsOptions = inject('dsOptions', [])

const props = defineProps({
  valueRule: Boolean,
  modelValue: Object
})

const _value = defineModel()

let isAdd = false
let editIndex = null

const datasourceVisible = ref(false)
const tempSource = ref(getDsConfig())
const options = computed(() => {
  return [
    {
      value: 'form',
      label: '表单字段',
      disabled: formFields.value.length === 0,
      children: formFields.value
          .map(v => {
            return {
              label: v.parent ? `${v.parent.name}.${v.name}`:v.name,
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
function getDsConfig() {
  return {
    id: '',
    name: '',
    async: true,
    request: {
      url: null,
      method: 'GET',
      headers: [],
      params: [],
      bodyForms: [],
      data: 'return {}',
      isJson: true,
      preJs: null,
    },
    handler: []
  }
}

function editDs(i) {
  isAdd = false
  editIndex = i
  tempSource.value = deepCopy(_value.value[i])
  datasourceVisible.value = true
}

function confirmDs() {
  if (isAdd) _value.value.push(deepCopy(tempSource.value))
  else _value.value[editIndex] = deepCopy(tempSource.value)
  datasourceVisible.value = false
  emit('change')
}

function createDs() {
  isAdd = true
  datasourceVisible.value = true
  tempSource.value = getDsConfig()
  tempSource.value.id = Date.now().toString()
}

function addCollect() {
  tempSource.value.handler.push({
    name: null,
    valueType: ValueType.string,
    jsonPath: null,
    label: null,
    value: null
  })
}

const emit = defineEmits(['change'])
</script>

<template>
  <div>
    <div class="w-form-datasource" v-if="_value.length > 0">
      <div v-for="(ds, i) in _value" :key="i" @click="editDs(i)">
        <div>
          <el-text>
            {{ ds.name }}
            <el-tag size="small" :type="ds.async ? 'warning' : 'success'">{{ ds.async ? '异步' : '同步'}}</el-tag>
          </el-text>
          <el-button link icon="Delete" @click.stop="_value.splice(i, 1); $emit('change')"></el-button>
        </div>
        <div>
          <el-tag type="primary">{{ ds.request.method }}</el-tag>
          <el-text truncated size="small">{{ ds.request.url }}</el-text>
        </div>
      </div>
    </div>
    <el-empty style="padding-bottom: 10px" description="未添加数据源" v-else></el-empty>
    <div style="width: 100%; display: flex; justify-content: center">
      <el-button size="default" icon="Plus" type="primary" text
                 @click="createDs">新增数据源</el-button>
    </div>
    <w-dialog v-model="datasourceVisible" width="800px" closeFree border
              ok-text="确定" title="配置全局数据源" @ok="confirmDs" cancel-text="取消">
      <el-form>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数据源名称">
              <el-input v-model="tempSource.name" clearable placeholder="请输入数据源名称"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="异步执行">
              <el-switch v-model="tempSource.async" placeholder="请输入数据源名称"/>
              <el-text class="w-placeholder">关闭异步则下方数据源将被阻塞</el-text>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="数据源配置">
          <w-http-config v-model="tempSource.request" :var-options="options" style="width: 100%;">
            <template #after>
              <el-button @click="addCollect" style="display: block;" link type="primary" icon="Plus">新增变量</el-button>
              <el-space style="margin-top: 5px" v-for="(item, i) in tempSource.handler" :key="i">
                <el-input v-model="item.label" placeholder="变量名"></el-input>
                <el-input v-model="item.value" placeholder="标识符"></el-input>
                <el-select v-model="item.valueType" style="width: 130px" placeholder="类型">
                  <el-option label="字符串" :value="ValueType.string"/>
                  <el-option label="数字" :value="ValueType.number"/>
                  <el-option label="列表/多项" :value="ValueType.options"/>
                </el-select>
                <div style="display: inline-flex; width: 250px;">
                  <template v-if="item.valueType === ValueType.options">
                    <el-input style="margin-right: 5px" v-model="item.labelPath" placeholder="label的jsonPath"></el-input>
                    <el-input v-model="item.valuePath" placeholder="value的jsonPath"></el-input>
                  </template>
                  <el-input v-model="item.jsonPath" placeholder="取值表达式 jsonPath" v-else></el-input>
                </div>
                <el-button icon="Delete" text circle @click="tempSource.handler.splice(i, 1)"></el-button>
              </el-space>
            </template>
          </w-http-config>
        </el-form-item>
      </el-form>
    </w-dialog>
  </div>
</template>

<style scoped lang="less">

.w-form-datasource {
  & > div {
    padding: 10px;
    background: var(--el-bg-color);
    border-radius: 5px;
    cursor: pointer;
    margin-bottom: 10px;

    & > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    & > div:last-child {
      margin: 5px 5px 0 0;

      & > *:last-child {
        width: calc(100% - 50px);
        margin-left: 5px
      }
    }

    &:hover {
      background: var(--el-color-primary-light-8);
    }
  }
}

</style>
