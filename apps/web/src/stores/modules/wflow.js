import {defineStore} from "pinia";

export const useWflowStore = defineStore('wflow', {
  state: () => ({
    loginUser: JSON.parse(localStorage.loginUser || JSON.stringify({
      id: 'u-employee', name: '申请人 · 王小明', avatar: '', type: 'user', deptId: 'dept-hr', deptName: '人事部'
    })),
    //语言模式
    lang: localStorage.lang || 'zhCn',
    //表单字段，用于共享表单字段清单数据
    formFields: [],
    //判断地图组件是否初始化标记，防止多次初始化
    mapIsInit: false,
    //数据源中提取的变量对象，用于给流程设计条件设置，提供选项
    dsVars: {},
    //流程详情drawer宽度设置
    instDrawerW: localStorage.instDrawerW || 800
  }),
  getters: {},
  actions: {
    setLoginUser(info) {
      this.loginUser = info
    },
    setInstDrawerW(width) {
      this.instDrawerW = width
      localStorage.instDrawerW = width
    },
    setFormFields(fields) {
      this.formFields = fields
    },
    setDsVars(vars) {
      this.dsVars = vars
    },
    setTheme(theme) {
      this.themeDark = theme === 'dark'
    },
    changeLang(lang){
      this.lang = lang
      localStorage.lang = lang

    }
  },
})
