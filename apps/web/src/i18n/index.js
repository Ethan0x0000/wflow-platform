import {createI18n} from 'vue-i18n';
import zhCn from './langs/zh_cn';
import en from './langs/en';

const i18n  = createI18n({
  legacy: false, // 设置为 false，启用 composition API 模式
  globalInjection: true,
  fallbackLocale: localStorage.lang || 'zhCn',
  locale: localStorage.lang || 'zhCn',
  messages: {
    zhCn,
    en,
  },
  //silentTranslationWarn: true, // 去除国际化警告
});

export default i18n;
