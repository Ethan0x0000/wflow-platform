<script setup>
import ProcessRender from "../design/process/ProcessRender.vue";
import nodeType, {NodeComponentConfigs} from "../design/process/ProcessNodes.js";
import {ElMessage} from "element-plus";
import {exportText, forEachProcessNode, isNomalNode, reloadProcessId} from "@/utils/ProcessUtil.js";
import WCodeEditor from "../common/editor/WCodeEditor.vue";
import EventListenerConfig from "../design/process/config/common/EventListenerConfig.vue";
import {getBpmnXml} from "@/api/model.js";
import WDialog from "../common/WDialog.vue";
import WTip from "@/views/wflow/common/WTip.vue";
const WBpmnMap = defineAsyncComponent(() => import("../common/WBpmnMap.vue"));

const props = defineProps({
  active: {
    default: false
  },
  defineId: String,
  //表单字段列表
  formItems: {
    type: Array,
    default: () => {
      return []
    }
  },
  events: { //流程事件
    type: Object,
    default: () => {
      return {
        startup: [],
        pass: [],
        reject: [],
        revoked: []
      }
    }
  }
})

//加载的时候判断，赋默认值
onBeforeMount(() => {
  if (processData.value.length === 0) {
    processData.value = [...nodeType.Start.create()]
  }
})

const processData = defineModel({
  type: Array,
  default: () => {
    return []
  }
})

defineExpose({validate, loadNodeMap})
const emit = defineEmits(['update:events'])

const isDebug = ref(false)
//缩放比例
const zoom = ref(100)
//选中的节点
const activeNode = ref({})
const showInput = ref(false)
const nodeConfVisible = ref(false)
const bpmnMapVisible = ref(false)
const bpmnXml = ref('')
const jsonVisible = ref(false)
const listenerVisible = ref(false)
const processNodeMap = new Map()
const nodeList = ref([])
//流程图ref
const processRender = ref()
const designer = ref()
const fileInput = ref()
//是否按下ctrl
let ctrlPressed = false

provide('isDebug', isDebug)
provide('nodeList', nodeList)
//注入流程节点Map数据
provide('processNodeMap', processNodeMap)

//配置面板宽度
const configWidth = computed(() => {
  return ["Exclusive", "Inclusive", "Router"].includes(activeNode.value.type) ? 600 : 500
})

function getProcessJson () {
  return JSON.stringify(processData.value, null, 2)
}

function selectNode(node) {
  activeNode.value = node
  if (NodeComponentConfigs[activeNode.value.type]) {
    nodeConfVisible.value = true
  } else {
    ElMessage.warning('本节点无配置项')
  }
}

function doZoom(sc) {
  if ((zoom.value > 30 && zoom.value < 150)
      || (zoom.value <= 30 && sc > 0)
      || (zoom.value >= 150 && sc < 0)) {
    zoom.value += sc
  } else {
    ElMessage.warning("缩放已经到极限了😥")
  }
}

function keyDown(event) {
  if (event.ctrlKey) {
    ctrlPressed = true;
    document.addEventListener('wheel', mouseWheel, {passive: false});
  }
}

function showModelBpmn(){
  getBpmnXml(props.defineId).then(res => {
    bpmnXml.value = res.data
    bpmnMapVisible.value = true
  }).catch(err => {
    ElMessage.error(err.msg || err)
  })
}

function keyUp(event) {
  if (event.key === "Control") {
    ctrlPressed = false;
    document.removeEventListener('wheel', mouseWheel);
  }
}

function mouseWheel(event) {
  if (ctrlPressed && props.active) {
    // 阻止默认的缩放行为
    event.preventDefault();
    // 获取滚动方向，向上为正，向下为负
    const delta = Math.sign(event.deltaY);
    doZoom(delta * -5)
  }
}

onMounted(() => {
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  initDragPageMove()
  loadNodeMap()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyDown);
  document.removeEventListener('keyup', keyUp);
  document.removeEventListener('wheel', mouseWheel);
})

function validate() {
  return processRender.value.validate()
}

async function loadNodeMap(){
  nodeList.value.length = 0
  processNodeMap.clear()
  forEachProcessNode(processData.value, node => {
    processNodeMap.set(node.id, node)
    if (isNomalNode(node)) {
      nodeList.value.push({id: node.id, name: node.name})
    }
  })
}

function initDragPageMove() {}

function exportProcess() {
  exportText(JSON.stringify(processData.value), 'wflow-process.json')
}

function configOnload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      processData.value = jsonData
      fileInput.value.value = null
      ElMessage.success("导入流程设计成功")
    } catch (error) {
      ElMessage.warning("解析流程json文件失败")
    }
  };
  reader.readAsText(file);
}

//将结构变更重载函数注入到子组件内
provide('processChange', () => {
  reloadProcessId(processData.value)
  loadNodeMap()
})

function onMouseDown(e) {

}

</script>

<template>
  <div class="w-process-designer" ref="designer" @mousedown="onMouseDown">
    <div class="w-p-d-operation">
      <div class="w-p-d-operation-json">
        <input style="display: none" @change="configOnload" type="file" ref="fileInput" accept=".json">
        <el-dropdown placement="bottom">
          <el-button icon="More" circle/>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="jsonVisible = true">查看流程json</el-dropdown-item>
              <el-dropdown-item @click="isDebug = !isDebug">{{isDebug ? '关闭' : '开启' }}debug模式</el-dropdown-item>
              <el-dropdown-item @click="showModelBpmn">查看bpmn图</el-dropdown-item>
              <el-dropdown-item @click="fileInput.click()" divided>导入配置</el-dropdown-item>
              <el-dropdown-item @click="exportProcess">导出配置</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="w-p-d-operation-json">
        <el-tooltip effect="dark" content="流程事件监听" placement="top">
          <el-button icon="Service" @click="listenerVisible = true" circle/>
        </el-tooltip>
      </div>
      <div class="w-p-d-operation-zoom">
        <el-tooltip effect="dark" content="缩小" placement="top">
          <el-button icon="Minus" @click="doZoom(-5)" circle/>
        </el-tooltip>
        <span>{{ zoom }}%</span>
        <el-tooltip effect="dark" content="放大" placement="top">
          <el-button icon="Plus" @click="doZoom(5)" circle/>
        </el-tooltip>
      </div>
    </div>
    <div>
      <process-render ref="processRender" :style="`transform: scale(${zoom / 100})`" v-model="processData"
                      :readonly="false" @select="selectNode"/>
    </div>
    <el-drawer class="w-drawer" :size="configWidth" :title="activeNode.name" v-model="nodeConfVisible"
               @close="validate" destroy-on-close>
      <template #header>
        <div>
          <el-input autofocus v-model="activeNode.name" v-show="showInput" style="width: 300px"
                    @blur="showInput = false"></el-input>
          <el-link v-show="!showInput" @click="showInput = true" style="font-size: medium;">
            <el-icon style="margin-right: 10px">
              <edit/>
            </el-icon>
            {{ activeNode.name }}
          </el-link>
        </div>
      </template>
      <component v-model="activeNode" :formItems="formItems" :is="NodeComponentConfigs[activeNode.type]"/>
    </el-drawer>
    <el-drawer class="w-drawer" size="500px" title="流程json" v-model="jsonVisible">
      <w-code-editor style="height: 100%;" auto-theme lang="json" :model-value="getProcessJson()" readonly/>
    </el-drawer>
    <el-drawer class="w-drawer" size="550px" title="流程事件监听" v-model="listenerVisible">
      <el-row>
        <el-col :span="12">
          <el-text>
            执行规则
            <w-tip content="异步执行：执行失败不影响流程</br>同步执行：执行失败流程事务回滚"/>：
          </el-text>
          <el-checkbox label="异步执行" v-model="events.async"/>
        </el-col>
        <el-col :span="12" class="w-flex-col-ct">
          <el-text>
            异常重试
            <w-tip content="执行失败时进行重试的次数"/>：
          </el-text>
          <el-input-number :min="0" :max="5" :step="1" controls-position="right"
                           :precision="0" size="small" v-model="events.retry">
            <template #suffix>
              <el-text>次</el-text>
            </template>
          </el-input-number>
        </el-col>
      </el-row>
      <event-listener-config v-model="events.startup" label="🙂当流程启动成功时"/>
      <event-listener-config v-model="events.pass" label="😃当流程审批通过时"/>
      <event-listener-config v-model="events.reject" label="😢当流程被驳回时"/>
      <event-listener-config v-model="events.revoked" label="🤔当流程被撤销时"/>
    </el-drawer>
    <w-dialog close-free :show-footer="false" width="80%" :border="false" v-model="bpmnMapVisible" title="Bpmn流程图">
      <w-bpmn-map :xml="bpmnXml"/>
    </w-dialog>
  </div>
</template>

<style lang="less" scoped>
.w-process-designer {
  display: inline-block;
  min-width: 100%;
  position: relative;

  //TODO: 这里要根据自己集成情况设置定位
  .w-p-d-operation {
    position: fixed;
    top: 80px;
    right: 40px;
    z-index: 99;
    display: flex;

    .w-p-d-operation-zoom {
      display: flex;
      justify-content: space-between;
      align-items: center;

      span {
        padding: 0 5px;
        font-size: medium;
        color: var(--el-text-color-primary);
      }
    }

    .w-p-d-operation-json {
      margin-right: 15px;
    }
  }
}
</style>
