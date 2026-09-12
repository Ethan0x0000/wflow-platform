// ace配置，使用动态加载来避免第一次加载开销
import ace from 'ace-builds'

// 导入不同的主题模块，并设置对应 URL
import themeGithubUrl from 'ace-builds/src-noconflict/theme-tomorrow_night_eighties?url'
ace.config.setModuleUrl('ace/theme/tomorrow_night_eighties', themeGithubUrl)

import themeChromeUrl from 'ace-builds/src-noconflict/theme-chrome?url'
ace.config.setModuleUrl('ace/theme/chrome', themeChromeUrl)

import themeMonokaiUrl from 'ace-builds/src-noconflict/theme-monokai?url'
ace.config.setModuleUrl('ace/theme/monokai', themeMonokaiUrl)
//tomorrow_night_eighties

// 导入不同语言的语法模式模块，并设置对应 URL (所有支持的主题和模式：node_modules/ace-builds/src-noconflict)
import modeJsonUrl from 'ace-builds/src-noconflict/mode-json?url'
ace.config.setModuleUrl('ace/mode/json', modeJsonUrl)

import modeJavascriptUrl from 'ace-builds/src-noconflict/mode-javascript?url'
ace.config.setModuleUrl('ace/mode/javascript', modeJavascriptUrl)

import modeVueUrl from 'ace-builds/src-noconflict/mode-vue?url'
ace.config.setModuleUrl('ace/mode/vue', modeVueUrl)

import modeHtmlUrl from 'ace-builds/src-noconflict/mode-html?url'
ace.config.setModuleUrl('ace/mode/html', modeHtmlUrl)

// 用于完成语法检查、代码提示、自动补全等代码编辑功能，必须注册模块 ace/mode/lang _ worker，并设置选项 useWorker: true
import workerBaseUrl from 'ace-builds/src-noconflict/worker-base?url'
ace.config.setModuleUrl('ace/mode/base', workerBaseUrl)

import workerJsonUrl from 'ace-builds/src-noconflict/worker-json?url' // for vite
ace.config.setModuleUrl('ace/mode/json_worker', workerJsonUrl)

import workerJavascriptUrl from 'ace-builds/src-noconflict/worker-javascript?url'
ace.config.setModuleUrl('ace/mode/javascript_worker', workerJavascriptUrl)

import workerHtmlUrl from 'ace-builds/src-noconflict/worker-html?url'
ace.config.setModuleUrl('ace/mode/html_worker', workerHtmlUrl)

// 导入不同语言的代码片段，提供代码自动补全和代码块功能
import snippetsJsonUrl from 'ace-builds/src-noconflict/snippets/json?url'
ace.config.setModuleUrl('ace/snippets/json', snippetsJsonUrl)

import snippetsJsUrl from 'ace-builds/src-noconflict/snippets/javascript?url'
ace.config.setModuleUrl('ace/snippets/javascript', snippetsJsUrl)

import snippetsHtmlUrl from 'ace-builds/src-noconflict/snippets/html?url'
ace.config.setModuleUrl('ace/snippets/html', snippetsHtmlUrl)

import snippetsVueUrl from 'ace-builds/src-noconflict/snippets/vue?url'
ace.config.setModuleUrl('ace/snippets/vue', snippetsVueUrl)

// 启用自动补全等高级编辑支持，
import extSearchboxUrl from 'ace-builds/src-noconflict/ext-searchbox?url'
ace.config.setModuleUrl('ace/ext/searchbox', extSearchboxUrl)

// 启用自动补全等高级编辑支持
import 'ace-builds/src-noconflict/ext-language_tools'
ace.require('ace/ext/language_tools')

// 启用自动补全等高级编辑支持
import { addCompleter } from 'ace-builds/src-noconflict/ext-language_tools';
import {useFormItem} from "element-plus";
//定义语法提示关键字
const keywords = {
  vue3: [
    "ref()",
    "reactive()",
    "computed()",
    "watch()",
    "watchEffect()",
    "onMounted()",
    "onBeforeMount()",
    "onBeforeUnmount()",
    "defineModel()",
    "defineExpose()",
    "defineComponent()",
    "defineProps({})",
    "defineEmits([])",
    "inject()",
    "v-if",
    "v-for",
    "v-model",
    "v-bind",
    "v-on"
  ],
  base: [
    "function",
    "const",
    "default"
  ],
  wflow: {
    formData: '表单值可用',
    request: '系统axios请求',
    useFormItem: 'EL表单hook',
    useFormCpInit: '初始化组件值',
    useFormCpDefaultValue: '设置组件默认值'
  }
}

const _keywords = getKeywords()

//转换关键字
function getKeywords() {
  const completions = [];
  for (const category in keywords) {
    const items = keywords[category];
    if (Array.isArray(items)) {
      // 处理数组形式的关键词（无描述）
      items.forEach((keyword) => {
        completions.push({
          caption: keyword,
          value: keyword,
          meta: category,
        });
      });
    } else if (typeof items === "object") {
      // 处理对象形式的关键词（有描述）
      for (const [keyword, description] of Object.entries(items)) {
        completions.push({
          caption: keyword,
          value: keyword,
          meta: `${category}-${description}`,
        });
      }
    }
  }
  return completions;
}
//注册自动补全
addCompleter({
  getCompletions: function (editor, session, pos, prefix, callback) {
    if (prefix.length === 0) return callback(null, []);
    callback(null, _keywords);
  },
});
