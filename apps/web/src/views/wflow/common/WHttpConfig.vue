<script setup>
import {getJsonBody, isEmpty} from "@/utils/GlobalFunc.js";
import {ElMessage} from "element-plus";
import WCodeEditor from "../common/editor/WCodeEditor.vue";

const props = defineProps({
  showPre: Boolean,
  showAft: Boolean,
  showCatch: Boolean,
  enableTest: Boolean,
  serverMode: {
    type: Boolean,
    default: false
  },
  varOptions: {
    type: Array,
    default: () => []
  }
})

const _value = defineModel()

const urlReg = /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/i;

onBeforeMount(() => {
  if (!_value.value || !_value.value.method) {
    _value.value = {
      url: null,
      method: 'GET',
      headers: [],
      params: [],
      bodyForms: [],
      data: 'return {}',
      isJson: true,
      preJs: null,
      catchJs: null
    }
  }
})

function addOption(items) {
  if (items.findIndex(v => isEmpty(v.name) || isEmpty(v.value)) > -1) {
    ElMessage.warning("请完成之前的项")
  } else {
    items.push({name: null, value: null, dynamic: null})
  }
}

function validate() {
  if (isEmpty(_value.value.url) || !urlReg.test(_value.value.url)) {
    ElMessage.warning("请设置正确的URL")
    return false
  } else if (_value.value.isJson) {
    try {
      getJsonBody(_value.value.data, {})
    } catch (e) {
      ElMessage.warning("JSON请求参数格式不正确")
      return false
    }
  }
  return true
}

defineExpose({validate})
</script>

<template>
  <div v-if="_value">
    <el-input v-model="_value.url" placeholder="请输入URL请求地址" clearable>
      <template #prepend>
        <el-select style="width: 100px;" v-model="_value.method">
          <el-option label="GET" value="GET"/>
          <el-option label="POST" value="POST"/>
          <el-option label="PUT" value="PUT"/>
          <el-option label="DELETE" value="DELETE"/>
        </el-select>
      </template>
      <template #append v-if="enableTest">
        <el-button icon="Promotion">测试</el-button>
      </template>
    </el-input>
    <el-tabs v-if="_value?.method">
      <el-tab-pane label="header头">
        <el-button icon="Plus" link style="margin-bottom: 10px" type="primary" @click="addOption(_value.headers)">
          添加请求头
        </el-button>
        <div v-for="(option, i) in _value.headers" :key="i" class="w-http-item">
          <div>
            <el-input placeholder="name" clearable v-model="_value.headers[i].name"/>
            <el-checkbox style="padding: 0 10px" v-model="_value.headers[i].isDynamic" @change="_value.headers[i].value = null">动态值</el-checkbox>
            <el-input v-if="!option.isDynamic" placeholder="value" clearable v-model="_value.headers[i].value"/>
            <el-cascader style="width: 100%;" v-model="_value.headers[i].value" :show-all-levels="true"
                         :props="{emitPath: false}" :options="varOptions" v-else/>
          </div>
          <el-button link style="margin-left: 5px" icon="Delete" @click="_value.headers.splice(i, 1)"></el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane label="url参数">
        <el-button icon="Plus" link style="margin-bottom: 10px" type="primary" @click="addOption(_value.params)">
          添加url参数
        </el-button>
        <div v-for="(option, i) in _value.params" :key="i" class="w-http-item">
          <div>
            <el-input placeholder="name" clearable v-model="_value.params[i].name"/>
            <el-checkbox style="padding: 0 10px" v-model="_value.params[i].isDynamic" @change="_value.params[i].value = null">动态值</el-checkbox>
            <el-input v-if="!option.isDynamic" placeholder="value" clearable v-model="_value.params[i].value"/>
            <el-cascader style="width: 100%;" v-model="_value.params[i].value" :show-all-levels="true"
                         :props="{emitPath: false}" :options="varOptions" v-else/>
          </div>
          <el-button link style="margin-left: 5px" icon="Delete" @click="_value.params.splice(i, 1)"></el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane label="body参数" v-if="_value.method !== 'GET'">
        <el-radio-group v-model="_value.isJson">
          <el-radio label="x-www-form" :value="false"></el-radio>
          <el-radio label="application/json" :value="true"></el-radio>
        </el-radio-group>
        <template v-if="!_value.isJson">
          <el-button icon="Plus" link style="display: block; margin: 10px 0" type="primary"
                     @click="addOption(_value.bodyForms)">添加请求body参数
          </el-button>
          <div v-for="(option, i) in _value.bodyForms" :key="i" class="w-http-item">
            <div>
              <el-input placeholder="name" clearable v-model="_value.bodyForms[i].name"/>
              <el-checkbox style="padding: 0 10px" v-model="_value.bodyForms[i].isDynamic" @change="_value.bodyForms[i].value = null">动态值</el-checkbox>
              <el-input v-if="!option.isDynamic" placeholder="value" clearable v-model="_value.bodyForms[i].value"/>
              <el-cascader style="width: 100%;" v-model="_value.bodyForms[i].value" :show-all-levels="true"
                           :props="{emitPath: false}" :options="varOptions" v-else/>
            </div>
            <el-button link style="margin-left: 5px" icon="Delete" @click="_value.bodyForms.splice(i, 1)"></el-button>
          </div>
        </template>
        <w-code-editor style="height: 200px;" lang="javascript" auto-theme v-else v-model="_value.data"
                       prefix="(ctx) => {" prefix-tip="构造并返回一个js对象</br> ctx：表单及数据源数据对象"/>
      </el-tab-pane>
      <el-tab-pane label="前置处理">
        <w-code-editor style="height: 200px;" lang="javascript" auto-theme v-model="_value.preJs"
                       prefix="(request, ctx) => { " prefix-tip="发起请求前进行处理，可以修改请求信息</br>
                        request：请求信息配置，具体字段请查看<a href='#'>文档说明</a></br>ctx：上下文变量数据"/>
      </el-tab-pane>
      <el-tab-pane label="后置处理" v-if="$slots.after">
        <slot name="after"></slot>
      </el-tab-pane>
      <el-tab-pane v-if="showCatch" label="异常处理">
        <slot v-if="$slots.catch" name="catch"></slot>
        <w-code-editor v-else v-model="_value.catchJs" auto-theme lang="javascript"/>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="less">
.w-http-item {
  display: flex;
  justify-content: space-between;

  & > div:first-child {
    width: 100%;
    display: flex;
    flex: 1;
    justify-content: space-between;
  }
}
</style>
