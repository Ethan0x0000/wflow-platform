import {createRouter, createWebHistory} from 'vue-router'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/workspace',
    },
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/views/wflow/pages/MenuFrame.vue'),
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/wflow/pages/workspace/Dashboard.vue'),
          meta: {title: '工作区'},
        },
        {
          path: 'todo',
          name: 'todo',
          component: () => import('@/views/wflow/pages/workspace/TodoPage.vue'),
          meta: {title: '待处理的'},
        },
        {
          path: 'ido',
          name: 'ido',
          component: () => import('@/views/wflow/pages/workspace/IdoPage.vue'),
          meta: {title: '已处理的'},
        },
        {
          path: 'submitted',
          name: 'submitted',
          component: () => import('@/views/wflow/pages/workspace/SubmittedPage.vue'),
          meta: {title: '我发起的'},
        },
        {
          path: 'cc',
          name: 'cc',
          component: () => import('@/views/wflow/pages/workspace/CcPage.vue'),
          meta: {title: '抄送我的'},
        },
        {
          path: 'agent',
          name: 'agent',
          component: () => import('@/views/wflow/pages/workspace/ProcAgentPage.vue'),
          meta: {title: '流程代理'},
        },
        {
          path: 'model',
          name: 'model',
          component: () => import('@/views/wflow/pages/admin/ModelManager.vue'),
          meta: {title: '模型管理'},
        },
        {
          path: 'components',
          name: 'components',
          component: () => import('@/views/wflow/pages/admin/CustomFormComponentManager.vue'),
          meta: {title: '组件管理'},
        },
        {
          path: 'forms',
          name: 'forms',
          component: () => import('@/views/wflow/pages/admin/FormModelManager.vue'),
          meta: {title: '表单管理'},
        },
        {
          path: 'instance',
          name: 'instance',
          component: () => import('@/views/wflow/pages/admin/InstanceManager.vue'),
          meta: {title: '数据管理'},
        },
        {
          path: 'handover',
          name: 'handover',
          component: () => import('@/views/wflow/pages/admin/WorkHandover.vue'),
          meta: {title: '工作交接'},
        },
        {
          path: 'statistics',
          name: 'statistics',
          component: () => import('@/views/wflow/pages/admin/InstanceFormDataManager.vue'),
          meta: {title: '数据统计'},
        },
        {
          path: 'startProc',
          name: 'startProc',
          component: () => import('@/views/wflow/pages/workspace/subs/InitiateProcess.vue'),
          meta: {title: '发起流程'},
        }
      ]
    },
    {
      path: '/designer',
      name: 'designer',
      component: () => import('@/views/wflow/pages/admin/ModelDesigner.vue'),
      meta: {title: '流程表单设计'},
    },
    {
      path: '/urlTestForm',
      name: 'urlTestForm',
      component: () => import('@/views/demo/form/UrlTestForm.vue'),
      meta: {title: '演示URL引用表单'},
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${import.meta.env.VITE_APP_TITLE} | ${to.meta.title}`
  }
  next()
})

export default router
