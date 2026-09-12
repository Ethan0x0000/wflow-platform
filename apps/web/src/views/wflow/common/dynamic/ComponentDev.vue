<template>
  <el-row style="height: calc(100% - 30px)">
    <el-col :span="14" style="border-right: 1px solid var(--el-border-color)">
      <div class="w-item-name">
        <el-text tag="div">{{ titleCode }}</el-text>
        <el-radio-group v-model="pcMode" size="small" v-if="showMobile">
          <el-radio-button :value="true">
            <div class="w-flex-col-ct">
              <el-icon><Monitor/></el-icon>
               &nbspPC端
            </div>
          </el-radio-button>
          <el-radio-button :value="false">
            <div class="w-flex-col-ct">
              <el-icon><Cellphone/></el-icon>
              &nbsp移动端
            </div>
          </el-radio-button>
        </el-radio-group>
      </div>
      <w-code-editor auto-theme style="height: 100%" v-model="_value"/>
    </el-col>
    <el-col :span="10">
      <div class="w-item-name">
        <el-text tag="div">{{pcMode ? 'PC端' : '移动端'}}-{{ titlePreview }}</el-text>
        <el-button type="primary" size="small" link icon="Refresh" @click="reloadVueInst">强制刷新</el-button>
      </div>
      <el-scrollbar class="w-cp-render" v-if="update">
        <template v-if="errInfo">
          <el-text tag="p" style="margin-bottom: 10px" type="danger">组件语法解析异常，请检查😢：</el-text>
          <el-text tag="pre" type="danger">{{errInfo}}</el-text>
        </template>
        <div v-if="pcMode" style="padding: 10px;" id="sandbox" ref="sandbox"></div>
        <div class="w-fd-mb_preview" v-else>
          <div>
            <iframe :src="mbCpPreviewUrl" id="sandbox" ref="sandbox"></iframe>
          </div>
        </div>
        <!--        <component-render style="padding: 10px" v-model="cpValue" ref="render" :sfc="_value"/>-->
      </el-scrollbar>
    </el-col>
  </el-row>

</template>

<script setup>
import WCodeEditor from "../editor/WCodeEditor.vue";
import {$debounce, isEmpty} from "@/utils/GlobalFunc.js";
const ComponentRender = defineAsyncComponent(() => import("./ComponentRender.vue"));
// 额外引入图标库
import * as ElIcons from '@element-plus/icons-vue'
import ElementPlus from "element-plus";

const props = defineProps({
  modelValue: String,
  titleCode: {
    type: String,
    default: '在此处编写Vue SFC 代码'
  },
  titlePreview: {
    type: String,
    default: '效果预览'
  },
  showMobile: {
    type: Boolean,
    default: true
  },
  defaultCode: String
})

const render = ref()
const sandbox = ref()
const cpValue = ref()
const errInfo = ref(null)
const _renderRef = ref()
let instance = null
const update = ref(true)

const _value = defineModel()
//模式切换
const pcMode = defineModel('mode', {type: Boolean, default: true})
const mbCpPreviewUrl = import.meta.env.VITE_MB_BASE_URL + '/cpPreview'

const emit = defineEmits(['change', 'render'])

onMounted(() => {
  loadDefault()
  reloadVueInst()
  window.addEventListener('message', syncMbCode)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', syncMbCode)
  if (instance && instance.unmount) {
    instance.unmount()
  }
})

function loadDefault() {
  if (isEmpty(_value.value)) {
    _value.value = props.defaultCode ? props.defaultCode : "<script setup>\n import { ref } from 'vue'\n const msg = ref(\'我是组件\')\n<" +
        "/script>\n<template>\n<div>{{ msg }}</div>\n</template>\n\n<style scoped>\n</style>"
  }
}

function validate() {
  //reloadVueInst()
  return (errInfo.value || '') === ''
}

function reloadVueInst() {
  if (!pcMode.value) return
  if (instance && instance.unmount) {
    instance.unmount()
  }
  instance = createApp(ComponentRender, {
    sfc: _value.value,
    modelValue: cpValue.value,
    //跨实例透传ref
    cpRef: _ref => _renderRef.value = _ref
  })
  errInfo.value = null
  instance.config.errorHandler = (err, instance, info) => {
    // 处理错误，例如：报告给一个服务
    errInfo.value = err.message
  }
  instance.config.warnHandler = () => null;
  instance.use(ElementPlus)
  //注册element图标
  for (const [key, component] of Object.entries(ElIcons)) {
    instance.component(key, component)
  }
  instance.mount(sandbox.value)
}

//移动端加载完成
function syncMbCode(event) {
  if ((event && event.data.event === 'onload') || !event)
    sandbox.value?.contentWindow.postMessage({sfcCode: _value.value}, '*')
}

const reload = $debounce(reloadVueInst, 1200)

function getRef() {
  return _renderRef.value
}

defineExpose({getRef, validate})

watch(_value, () => {
  try {
    if (pcMode.value) reload()
    else syncMbCode()
  } catch (e) {}
})
watch(_renderRef, () => emit('render'))
watch(pcMode, loadDefault)
</script>

<style lang="less" scoped>

.w-fd-mb_preview {
  display: flex;
  justify-content: center;
  transform: scale(0.9);

  &>div {
    padding: 20px 10px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }

  iframe {
    border: 1px solid var(--el-border-color-light);
    width: 375px;
    height: 667px;
    display: block;
  }
}

.w-item-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 30px;
  background: var(--el-fill-color-dark);
}

.w-cp-render {
  height: calc(100vh - 125px);
  background: var(--el-bg-color);
}
</style>
