<script setup>
import WCodeEditor from "../../../../common/editor/WCodeEditor.vue";
import WDialog from "../../../../common/WDialog.vue";
import SubmitValidConf from "./SubmitValidConf.vue";
import {deepCopy} from "@/utils/GlobalFunc.js";
import ShowHideConf from "./ShowHideConf.vue";
import MountedConf from "./MountedConf.vue";
import DataLinkageConf from "./DataLinkageConf.vue";

const _config = defineModel('config', {type: Object})

const validVisible = ref(false)
const showVisible = ref(false)
const actionVisible = ref(false)
const logicVisible = ref(false)
const mountVisible = ref(false)

const tempConfig = reactive({
  onLoad: {},
  validRule: {},
  showRule: {},
  actionRule: {},
  logicRule: {}
})

function confirmValid() {
  validVisible.value = false
  _config.value.valid = tempConfig.validRule
}

function confirmOnLoad() {
  mountVisible.value = false
  _config.value.onLoad = tempConfig.onLoad
}

function showValidRule() {
  validVisible.value = true
  tempConfig.validRule = deepCopy(_config.value.valid)
}

function showMountRule() {
  mountVisible.value = true
  tempConfig.onLoad = deepCopy(_config.value.onLoad)
}

function confirmView() {
  showVisible.value = false
  _config.value.showHide = tempConfig.showRule
}

function showViewRule() {
  showVisible.value = true
  tempConfig.showRule = deepCopy(_config.value.showHide)
}

function showDataActionRule() {
  actionVisible.value = true
  tempConfig.actionRule = deepCopy(_config.value.actionRule)
}

function showLogicActionRule() {
  actionVisible.value = true
  tempConfig.actionRule = deepCopy(_config.value.actionRule)
}

function confirmAction() {
  actionVisible.value = false
  _config.value.actionRule = tempConfig.actionRule
}
</script>

<template>
  <el-form-item label="标签位置">
    <el-radio-group v-model="_config.labelPosition">
      <el-radio-button label="上面" value="top"/>
      <el-radio-button label="靠左" value="left"/>
      <el-radio-button label="靠右" value="right"/>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="标签宽度">
    <el-input type="number" v-model="_config.labelWidth"></el-input>
  </el-form-item>
  <el-form-item label="组件尺寸">
    <el-radio-group v-model="_config.size">
      <el-radio-button label="大" value="large"/>
      <el-radio-button label="中" value="default"/>
      <el-radio-button label="小" value="small"/>
    </el-radio-group>
  </el-form-item>
  <el-divider class="w-driver">移动端设置</el-divider>
  <el-form-item label="标签位置">
    <el-radio-group v-model="_config._labelPosition">
      <el-radio-button label="上面" value="top"/>
      <el-radio-button label="靠左" value="left"/>
      <el-radio-button label="靠右" value="right"/>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="标签宽度">
    <el-input type="number" v-model="_config._labelWidth"></el-input>
  </el-form-item>
  <el-divider class="w-driver">逻辑设置</el-divider>
  <el-form-item label="加载完毕">
    <el-button icon="Loading" @click="showMountRule">表单加载完毕钩子</el-button>
  </el-form-item>
  <el-form-item label="提交校验">
    <el-button icon="Finished" @click="showValidRule">设置校验规则</el-button>
  </el-form-item>
  <el-form-item label="显隐规则">
    <el-button icon="View" @click="showViewRule">设置表单显隐规则</el-button>
  </el-form-item>
  <el-form-item label="数据联动">
    <el-button icon="Histogram" @click="showDataActionRule">设置数据联动规则</el-button>
  </el-form-item>
<!--  <el-form-item label="逻辑联动">
    <el-button disabled icon="SwitchFilled" @click="showLogicActionRule">设置逻辑联动规则</el-button>
  </el-form-item>-->

  <w-dialog v-model="mountVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmOnLoad" cancel-text="取消">
    <template #title>
      <span style="margin-right: 20px">表单加载钩子 </span>
      <el-radio-group v-model="tempConfig.onLoad.type">
        <el-radio label="普通模式" value="SIMPLE"/>
        <el-radio label="高级模式" value="JS"/>
      </el-radio-group>
    </template>
    <w-code-editor v-if="tempConfig.onLoad.type === 'JS'" style="height: 300px;"
                   lang="javascript" v-model="tempConfig.onLoad.js" auto-theme
                   prefix="(dsVars, formData, formMap) => { "
                   prefix-tip="当表单渲染完毕时，会调用本函数</br>- dsVars：数据源变量</br> - formData：表单值
                   </br>- formMap： 表单Map<字段key -> 字段json配置>"/>
    <mounted-conf v-else v-model="tempConfig.onLoad.actions" />
  </w-dialog>
  <w-dialog v-model="validVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmValid" cancel-text="取消">
    <template #title>
      <span style="margin-right: 20px">表单提交校验 </span>
      <el-radio-group v-model="tempConfig.validRule.type">
        <el-radio label="普通模式" value="SIMPLE"/>
        <el-radio label="高级模式" value="JS"/>
      </el-radio-group>
    </template>
    <w-code-editor v-if="tempConfig.validRule.type === 'JS'" style="height: 300px;"
                   lang="javascript" v-model="tempConfig.validRule.js" auto-theme
                   prefix="(resolve, reject, ctx) => { "
                   prefix-tip="当表单值出现变化时，会调用本函数</br> - resolve()：调用本函数则代表校验通过
                   </br>- reject('错误信息')：调用本函数代表校验失败</br>- ctx：表单及变量数据，ctx.字段key 可取字段值</br>"/>
    <submit-valid-conf v-else v-model="tempConfig.validRule.rules" />
  </w-dialog>
  <w-dialog v-model="showVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmView" cancel-text="取消">
    <template #title>
      <span style="margin-right: 20px">表单显隐规则 </span>
      <el-radio-group v-model="tempConfig.showRule.type">
        <el-radio label="普通模式" value="SIMPLE"/>
        <el-radio label="高级模式" value="JS"/>
      </el-radio-group>
    </template>
    <w-code-editor v-if="tempConfig.showRule.type === 'JS'" style="height: 300px;"
                   lang="javascript" v-model="tempConfig.showRule.js" auto-theme
                   prefix="(ctx, formMap, show, hide) => { "
                   prefix-tip="表单值出现变化时，会调用本函数</br>- ctx：表单及变量数据，ctx.字段key 可取字段值
                   </br>- formMap：formMap.get('字段key') 可取字段json配置</br>- show：调用 show('字段key') 可显示字段
                   </br>- show：调用 hide('字段key') 可隐藏字段"/>
    <show-hide-conf v-else v-model="tempConfig.showRule.rules" />
  </w-dialog>

  <w-dialog v-model="actionVisible" width="800px" closeFree border
            ok-text="确定" @ok="confirmAction" cancel-text="取消">
    <template #title>
      <span style="margin-right: 20px">数据联动规则 </span>
      <el-radio-group v-model="tempConfig.actionRule.type">
        <el-radio label="普通模式" value="SIMPLE"/>
        <el-radio label="高级模式" value="JS"/>
      </el-radio-group>
    </template>
    <w-code-editor v-if="tempConfig.actionRule.type === 'JS'" style="height: 300px;"
                   lang="javascript" v-model="tempConfig.actionRule.js" auto-theme
                   prefix="(watch:函数, optionLoad:对象) => {"
                   prefix-tip="使用参数watch函数，注册表单字段值监听
                   </br>optionLoad：选项重载，optionLoad.选项组件key() 可以重载组件选项
                   </br>watch监听：watch([监听的字段key集合], 回调函数callback)
                   </br>callback(formData, dsVars, fields, request)
                   </br>- formData：表单数据，formData.字段key 可取字段值
                   </br>- dsVars：全局变量数据，dsVars.变量名 可取变量值
                   </br>- fields：表单字段json配置，fields.字段key可取字段json配置
                   </br>- request：系统请求函数，复用系统axios请求"/>
    <data-linkage-conf v-else v-model="tempConfig.actionRule.rules"/>
  </w-dialog>
</template>

<style scoped lang="less">
.w-driver {
  :deep(.el-divider__text) {
    background-color: var(--el-bg-color-page);
  }
}

</style>
