<script setup>
import {useWflowStore} from "@/stores/modules/wflow.js";
import WAvatar from "../common/WAvatar.vue";
import {useDark, useToggle} from '@vueuse/core'
import {useI18n} from "vue-i18n";
import WOrgPicker from "../common/WOrgPicker.vue";
import {login} from "@/api/auth.js";
import {confirmNotify, getUnreadNotify, testSend} from "@/api/notify.js";
import {ElMessage, ElMessageBox, ElNotification} from "element-plus";
import ProcessInstPreview from "./workspace/subs/ProcessInstPreview.vue";
import {EventSourcePolyfill} from 'event-source-polyfill';
import {addHeaders} from "@/utils/GlobalFunc.js";
import router from "@/router/index.js";
import {useRoute} from "vue-router";
import WDialog from "../common/WDialog.vue";

const title = import.meta.env.VITE_APP_TITLE || 'wflow'
const BASE_URL = import.meta.env.BASE_URL
const active = ref('/workspace/dashboard')
const isCollapse = ref(false)
const isDark = useDark()
const route = useRoute()
const toggleDark = useToggle(isDark)
const {locale} = useI18n()
const {loginUser, changeLang, setLoginUser} = useWflowStore()
const orgPicker = ref()
const instanceView = ref()
const userCenterDialog = ref(false)
let timer = null
let _eventSource = null

const notifyData = ref({
  records: [],
  pages: 0,
  total: 0
})
const notifyLoading = ref(false)
const notifyParams = reactive({
  pageNo: 1,
  pageSize: 10
})

const darkTheme = computed({
  get() {
    return isDark.value
  },
  set(val) {
    toggleDark(val)
  }
})

const _loginUser = computed(() => {
  return {
    id: loginUser.id,
    name: loginUser.name,
    type: 'user',
    avatar: loginUser.avatar
  }
})

//页面渲染完成移除加载效果
onMounted(() => window?.removeLoading())

function switchLang(lang) {
  locale.value = lang
  changeLang(lang)
}

watch(notifyParams, getNotifyList, {deep: true})

function getNotifyList() {
  notifyLoading.value = true
  getUnreadNotify(notifyParams).then(res => {
    notifyLoading.value = false
    notifyData.value = res.data
  }).catch(err => {
    notifyLoading.value = false
    ElMessage.error(err.msg)
  })
}

function sendTestMsg(msg) {
  testSend(msg).then(res => {
    ElMessage.success(res.data)
  })
}

function doLogin(users) {
  login(users[0].id).then(res => {
    const loginUser = res.data
    loginUser.type = loginUser.type || 'user'
    localStorage.loginUser = JSON.stringify(loginUser)
    setLoginUser(loginUser)
    localStorage.token = res.data.token
    location.reload()
  })
}

function readNotify(msg) {
  confirmNotify([msg.id]).then(res => {
    ElMessage.success(res.data)
    getNotifyList()
  })
}

function readPage() {
  ElMessageBox.confirm('确定要把当前页消息设置为已读吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    confirmNotify(notifyData.value.records.map(v => v.id)).then(res => {
      ElMessage.success(res.data)
      getNotifyList()
    })
  })
}

function readAll() {
  ElMessageBox.confirm('确定要把所有消息设置为已读吗？', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    confirmNotify().then(res => {
      ElMessage.success(res.data)
      getNotifyList()
    })
  })
}

function openNotify(msg) {
  instanceView.value.open(msg.instId)
}

onMounted(() => {
  if (timer) clearInterval(timer)
  active.value = BASE_URL === '/' ? location.pathname : location.pathname.split(BASE_URL)[1]
  //自动导航到首页
  if (active.value === '/workspace') active.value = '/workspace/dashboard'
  router.push(active.value + location.hash + location.search)
  getNotifyList()
  subscribeNotify()
});

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (_eventSource) {
    _eventSource.close()
  }
  timer = null
  _eventSource = null
})

function showUserCenter() {
  userCenterDialog.value = true
}

//订阅通知消息SSE
function subscribeNotify() {
  const url = import.meta.env.VITE_APP_BASE_API || '/api'
  const eventSource = new EventSourcePolyfill(`${url}/notify/subscribe`, {
    //设置头，并设置10分钟客户端超时重连
    headers: addHeaders({}),
    timeout: 3600000
  });
// 连接成功
  eventSource.onopen = (event) => {
    _eventSource = event.target
  };

  eventSource.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data)
      const type = String(msg.level || '').toLowerCase()
      if (msg.level) {
        ElNotification({
          title: msg.title,
          message: msg.content,
          type: type === 'danger' ? 'error' : type,
          offset: 50,
          duration: 5000
        })
        getNotifyList()
      }
    } catch (e) {}
  };
  //连接失败
  eventSource.onerror = err => {
  };
}

watch(() => route.path, (path) => {
  active.value = path
})
</script>

<template>
  <el-container>
    <el-aside class="w-aside-menu">
      <el-scrollbar>
        <el-menu router v-model="active" class="w-menu" :default-active="active" :collapse="isCollapse">
          <el-menu-item index="#" class="w-logo">
            <img src="/image/logo.png"/>
            <template #title>
              <el-badge value="next" :offset="[15, 20]">
                <b>{{ title }}</b>
              </el-badge>
            </template>
          </el-menu-item>
          <el-menu-item index="/workspace/dashboard">
            <el-icon>
              <List/>
            </el-icon>
            <template #title>{{ $t('menu.workspace') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/todo">
            <el-icon>
              <Stamp/>
            </el-icon>
            <template #title>{{ $t('menu.todo') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/ido">
            <el-icon>
              <Avatar/>
            </el-icon>
            <span slot="title">{{ $t('menu.ido') }}</span>
          </el-menu-item>
          <el-menu-item index="/workspace/submitted">
            <el-icon>
              <Checked/>
            </el-icon>
            <template #title>{{ $t('menu.submitted') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/cc">
            <el-icon>
              <Promotion/>
            </el-icon>
            <template #title>{{ $t('menu.ccMe') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/agent">
            <el-icon>
              <UserFilled/>
            </el-icon>
            <template #title>{{ $t('menu.agent') }}</template>
          </el-menu-item>
          <el-divider></el-divider>
          <el-menu-item index="/workspace/components">
            <el-icon>
              <ElementPlus/>
            </el-icon>
            <template #title>{{ $t('menu.cpMg') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/forms" v-if="false">
            <el-icon>
              <Tickets/>
            </el-icon>
            <template #title>{{ $t('menu.formMg') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/model">
            <el-icon>
              <Tools/>
            </el-icon>
            <template #title>{{ $t('menu.modelMg') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/instance">
            <el-icon>
              <PieChart/>
            </el-icon>
            <template #title>{{ $t('menu.dataMg') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/statistics">
            <el-icon>
              <DataLine/>
            </el-icon>
            <template #title>{{ $t('menu.dataCount') }}</template>
          </el-menu-item>
          <el-menu-item index="/workspace/handover">
            <el-icon>
              <Switch/>
            </el-icon>
            <template #title>工作交接</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>
    <el-container>
      <el-header class="w-frame-header" height="80px">
        <div class="w-switch-menu">
          <iconify style="font-size: 18px; cursor: pointer" @click="isCollapse = !isCollapse"
                   :icon="isCollapse ? 'line-md:menu-fold-right' : 'line-md:menu-fold-left'"/>
        </div>
        <div class="w-main-nav-menu">
          <el-switch class="w-theme-switch" v-model="darkTheme"
                     style="--el-switch-on-color: var(--el-switch-off-color);"
                     active-action-icon="Moon" inactive-action-icon="Sunny"/>
          <el-dropdown class="w-lang-switch">
            <div class="w-flex-col-ct">
              <iconify style="font-size: 20px" icon="ic:baseline-language"/>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="switchLang('zhCn')">
                  简体中文
                </el-dropdown-item>
                <el-dropdown-item @click="switchLang('en')">
                  English
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <div class="w-flex-col-ct w-notice">
            <el-popover placement="bottom-end" width="300" trigger="click">
              <el-empty :image-size="80" description="暂无消息 😁" v-if="notifyData.total === 0"></el-empty>
              <el-scrollbar v-else class="w-notify">
                <div v-for="msg in notifyData.records" :key="msg.id" class="w-notify-item">
                  <el-row>
                    <el-col :span="2">
                      <div class="w-notify-item-icon">
                        <el-icon v-if="msg.level === 'SUCCESS'" color="#02b068">
                          <SuccessFilled/>
                        </el-icon>
                        <el-icon v-else-if="msg.level === 'WARNING'" color="#f78f5f">
                          <WarningFilled/>
                        </el-icon>
                        <el-icon v-else-if="msg.level === 'DANGER'" color="#f25643">
                          <CircleCloseFilled/>
                        </el-icon>
                        <el-icon v-else color="#8c8c8c">
                          <InfoFilled/>
                        </el-icon>
                      </div>
                    </el-col>
                    <el-col :span="22">
                      <div class="w-notify-item-body">
                        <el-text link @click="openNotify(msg)">{{ msg.title }}</el-text>
                        <el-text tag="div" truncated size="small">{{ msg.content }}</el-text>
                        <el-text size="small">{{ msg.createTime.substring(5, 16) }}</el-text>
                        <el-tooltip content="已读消息并隐藏" placement="top">
                          <el-button style="position: absolute; right: 0;"
                                     size="small" text circle type="primary" icon="Hide"
                                     @click="readNotify(msg)"/>
                        </el-tooltip>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </el-scrollbar>
              <div class="w-notify-action" v-show="notifyData.total > 0">
                <el-button type="primary" link @click="readPage" :disabled="notifyData.records.length === 0">本页已读</el-button>
                <el-button type="primary" link icon="ArrowLeft" @click="--notifyParams.pageNo" :disabled="notifyParams.pageNo <= 1"/>
                <el-text>{{ notifyParams.pageNo }}/{{ notifyData.pages }}</el-text>
                <el-button type="primary" link @click="++notifyParams.pageNo" icon="ArrowRight"
                           :disabled="notifyData.total <= notifyParams.pageSize * notifyParams.pageNo"/>
                <el-button type="primary" link @click="readAll" :disabled="notifyData.total === 0">全部已读</el-button>
              </div>
              <template #reference>
                <el-badge :hidden="notifyData.total === 0" :value="notifyData.total">
                  <el-icon size="20">
                    <Bell/>
                  </el-icon>
                </el-badge>
              </template>
            </el-popover>
          </div>
        </div>
        <el-dropdown class="w-login-user">
          <div class="w-flex-col-ct">
            <w-avatar :src="loginUser.avatar" :name="loginUser.name"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
<!--              <el-dropdown-item>
                <el-icon>
                  <OfficeBuilding/>
                </el-icon>
                {{ $t('menu.switchTenant') }}
              </el-dropdown-item>-->
              <el-dropdown-item @click="orgPicker.open()">
                <el-icon>
                  <Sort/>
                </el-icon>
                {{ $t('menu.switchUser') }}
              </el-dropdown-item>
              <el-dropdown-item @click="showUserCenter">
                <el-icon>
                  <User/>
                </el-icon>
                {{ $t('menu.userCenter') }}
              </el-dropdown-item>
              <el-dropdown-item disabled>
                <el-icon>
                  <Close/>
                </el-icon>
                {{ $t('menu.logout') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="w-page">
        <el-scrollbar style="height: calc(100vh - 80px); width: 100%;">
          <router-view></router-view>
        </el-scrollbar>
      </el-main>
    </el-container>
    <w-org-picker title="请点下级按钮，进入组织架构内选人，部门下面有人" ref="orgPicker"
                  type="user" :selected="[_loginUser]" @ok="doLogin"/>
    <process-inst-preview ref="instanceView"/>
    <w-dialog width="600px" cancel-text="关闭" :show-ok="false" v-model="userCenterDialog" title="个人中心">
      <el-tabs tab-position="left">
        <el-tab-pane label="基本信息">
          <div style="width: 100%; min-height: 200px; display: flex; justify-content: center;">
            <w-avatar :size="80" show-y :name="loginUser.name" :src="loginUser.avatar"/>
          </div>
        </el-tab-pane>
        <el-tab-pane label="审批代理">
        </el-tab-pane>
      </el-tabs>
    </w-dialog>
  </el-container>
</template>

<style scoped lang="less">
@nav-height: 60px;

.w-page {
  padding: 10px;
  background: var(--el-bg-color-page);

  //提升下滚动条层级防止被页面遮挡
  :deep(.el-scrollbar__bar) {
    z-index: 2;
  }
}

.w-main-nav-menu {
  display: flex;
  flex: 1;
  justify-content: flex-end;
  margin-right: 30px;

  & > div {
    margin-left: 20px;
  }
}

.el-divider--horizontal {
  margin: 10px 0;
}

:deep(.w-aside-menu) {
  height: calc(100vh);
  width: auto;
  //border-right: 1px solid var(--el-menu-border-color);

  .el-menu--collapse {
    min-width: @nav-height;

    .el-menu-item {
      width: auto !important;
    }
  }

  .el-menu {
    margin: 0 10px;
    border-right: none;

    .is-active {
      color: var(--el-menu-active-color) !important;
      background: var(--el-color-primary-light-9);
    }

    .el-menu-item {
      height: 40px;
      width: 180px;
      line-height: 40px;
      margin: 5px 0;
      border-radius: 5px;
      color: var(--el-text-color-regular);
    }
  }

  .w-logo {
    margin: 15px 0 !important;

    img {
      width: 30px;
      height: 30px;
      background: var(--el-bg-color);
      padding: 5px;
      margin-right: 10px;
      border-radius: 12px;
      box-shadow: 0 0 8px 0 var(--el-border-color);
    }

  }
}

.w-switch-menu {
  height: 100%;
  display: flex;
  align-items: center;

  i {
    cursor: pointer;
    padding: 5px;
  }
}

:deep(.w-frame-header) {
  height: @nav-height;
  display: flex;
  align-items: center;

  .w-login-user {
    height: 100%;
    display: inline-flex;
  }

  .w-notice {
    height: 100%;
    cursor: pointer;
  }

  .w-lang-switch {
    height: 100%;
    cursor: pointer;
  }

  .w-theme-switch {
    height: 100%;
  }
}


.w-notify {
  max-height: 200px;
  background: var(--el-fill-color);
  overflow-y: auto;

  .w-notify-item:last-child {
    border-bottom: 2px solid var(--el-fill-color);
  }

  .w-notify-item {
    border-top: 2px solid var(--el-fill-color);
    padding: 5px;
    background: var(--el-bg-color-overlay);
    position: relative;
    border-radius: 5px;

    .w-notify-item-icon {
      margin-top: 2px;
    }
  }

  .w-notify-item-body {
    position: relative;

    & > :nth-child(1) {
      cursor: pointer;
      color: var(--el-text-color-primary)
    }

    & > :nth-child(2) {
      margin-top: 3px;
      color: var(--el-text-color-secondary)
    }

    & > :nth-child(3) {
      position: absolute;
      right: 0;
      top: 2px;
    }
  }
}

.w-notify-action {
  display: flex;
  padding-top: 5px;
  justify-content: space-between;
}

</style>
