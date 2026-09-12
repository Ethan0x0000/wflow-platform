<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {sanitizeHtml} from "@/utils/html.ts";

const props = defineProps({
  ...FormComponentMixin.props
})

const htmlDom = ref()
let iframeDoc

const code = computed(() => {
  if (props.config.props.code.trim() === ''){
    return '<div style="font-size: small; color: #9b9595">--请配置html代码--</div>'
  }else {
    return sanitizeHtml(props.config.props.code)
  }
})

watch(code, () => {
  if (props.config.props.render === 'iframe'){
    iframeDoc.open();
    iframeDoc.write(code.value);
    iframeDoc.close();
  }
})

watch(() => props.config.props.render, () => {
  if (props.config.props.render === 'iframe'){
    nextTick(() => createIframe())
  }
})

function createIframe(){
  // 创建 iframe 元素
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  //iframe.style.height = '500px'; // 根据需要调整高度
  iframe.style.border = 'none';
  // 将 iframe 添加到容器中
  htmlDom.value.appendChild(iframe);
  // 获取 iframe 的文档对象
  iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  // 写入 HTML 字符串
  iframeDoc.open();
  iframeDoc.write(code.value);
  iframeDoc.close();
}

onMounted(() => {
  if (props.config.props.render === 'iframe'){
    createIframe()
  }
})
</script>

<template>
  <div style="width: 100%;">
    <div v-if="config.props.render === 'iframe'" ref="htmlDom"
         :style="{width: '100%', height: config.props.height + 'px'}"></div>
    <div v-else v-html="code"></div>
  </div>

</template>

<style scoped>

</style>
