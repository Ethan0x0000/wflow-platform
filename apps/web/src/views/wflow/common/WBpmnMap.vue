<script setup>
import BpmnViewer from 'bpmn-js/lib/Viewer';
import {ElMessage} from "element-plus";
import MoveCanvas from "diagram-js/lib/navigation/movecanvas";
import ZoomScroll from "diagram-js/lib/navigation/zoomscroll";

const props = defineProps({
  xml: String
})

let bpmnViewer = null;
const bpmnContainer = ref();

onMounted(() => {
  bpmnViewer = new BpmnViewer({
    container: bpmnContainer.value,
    additionalModules: [MoveCanvas, ZoomScroll], // 启用拖拽和缩放模块
  });
  // 加载BPMN 2.0图
  bpmnViewer.importXML(props.xml).catch(err => {
    ElMessage.error("加载流程图失败:", err)
  });
})

onBeforeUnmount(() => {
  if (bpmnViewer) bpmnViewer.destroy()
})
</script>

<template>
  <div ref="bpmnContainer" style="height: 600px;"></div>
</template>

<style scoped lang="less">

</style>
