import { createPinia } from 'pinia'

import router from './router'
import { createApp } from 'vue'
import App from './App.vue';

//wflow全局样式文件，可不要漏了我的好兄弟，也要注意重名class的冲突
import './assets/theme.css'
import './assets/global.css'

import {Icon} from '@iconify/vue'
import i18n from '@/i18n/index'

// 额外引入图标库
import * as ElIcons from '@element-plus/icons-vue'
import ElementPlus from "element-plus";
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

const app = createApp(App);
//开启vue性能调试
app.config.performance = true;

//注册element图标，一定要注册昂🤔
for (const [key, component] of Object.entries(ElIcons)) {
  app.component(key, component)
}
// 把iconify 图标库组件注册到全局，别忘了
app.component('iconify', Icon)

app.use(i18n)
app.use(ElementPlus);
app.use(createPinia())
app.use(router)
async function mount() {
  let response = localStorage.token ? await fetch('/api/auth/me', { headers: { wflowToken: localStorage.token } }) : await fetch('/api/auth/demo');
  if (response.status === 401) response = await fetch('/api/auth/demo');
  const session = await response.json();
  if (session.code !== 200) throw new Error(session.msg);
  if (session.data.token) localStorage.token = session.data.token;
  localStorage.loginUser = JSON.stringify(session.data);
  app.mount('#app');
}
mount().catch((error) => {
  window.removeLoading?.();
  document.getElementById('app').textContent = error.message;
});

//屏蔽警告信息，别问我为什么没输出warn
