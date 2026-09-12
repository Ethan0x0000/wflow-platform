<template>
  <div class="w-code-editor">
    <el-text class="w-cd-prefix" v-if="prefix" tag="div" style="padding-bottom: 5px">
      {{ prefix }}
      <el-tooltip v-if="prefixTip" :content="prefixTip" placement="top">
        <template #content><span v-html="prefixTip"></span></template>
        <el-icon style="cursor: help"><QuestionFilled /></el-icon>
      </el-tooltip>
    </el-text>
    <slot class="w-cd-prefix" v-else name="prefix" style="padding-bottom: 5px"></slot>
    <v-ace-editor :style="{height: prefix ? 'calc(100% - 30px)': '100%'}" v-model:value="_value" :lang="lang"
                  :theme="_theme" :options="options" :readonly="readonly"/>
  </div>
</template>

<script setup>
import {computed, reactive} from 'vue'
const VAceEditor = defineAsyncComponent(() => import('vue3-ace-editor')
    .then(module => module.VAceEditor)
    .finally(() => import('./AceConfig.js')))
import {useDark} from "@vueuse/core";
const isDark = useDark()
const props = defineProps({
  lang: {
    type: String,
    default: 'vue'
  },
  theme: {
    type: String,
    default: 'chrome'
  },
  autoTheme: {
    type: Boolean,
    default: false
  },
  placeholder: String,
  modelValue: String,
  readonly: {
    type: Boolean,
    default: false
  },
  prefix: String,
  prefixTip: String
})

const _value = defineModel()

const _theme = computed(() => {
  if (props.autoTheme) {
    return isDark.value ? 'monokai' : 'chrome'
  } else {
    return props.theme
  }
})

const options = reactive({
  useWorker: true, // 启用语法检查,必须为true
  enableBasicAutocompletion: true, // 自动补全
  enableLiveAutocompletion: true, // 智能补全
  enableSnippets: true, // 启用代码段
  showPrintMargin: false, // 去掉灰色的线，printMarginColumn
  highlightActiveLine: false, // 高亮行
  highlightSelectedWord: true, // 高亮选中的字符
  tabSize: 2, // tab锁进字符
  fontSize: 14, // 设置字号
  wrap: false, // 是否换行
  readOnly: props.readonly, // 是否可编辑
  //minLines: 10, // 最小行数，minLines和maxLines同时设置之后，可以不用给editor再设置高度
  //maxLines: 50, // 最大行数
})

const emit = defineEmits(['change'])

</script>

<style lang="less">
.w-code-editor {
  width: 100%;
  border-radius: 5px;
  overflow: hidden;

  .w-cd-prefix {
    height: 25px;
    line-height: 25px;
    padding-left: 5px;
    background-color: var(--el-fill-color-darker);
  }
}
</style>
