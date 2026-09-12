<script setup>
import {getProcModelByUser} from "@/api/model.js";
import {useRouter} from "vue-router";
import {getInstCount} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import {getUnreadNotify} from '@/api/notify.js';

const loading = ref(false)
const countLoading = ref(false)
const today = ref(new Date())
const appList = ref()
const modelGroupList = ref([])
const notifications = ref([])
const countData = ref({
  todo: 0,
  mySubmit: 0,
  ccMe: 0
})
const router = useRouter();

onMounted(() => {
  getCount()
  getModelGroupList()
  getUnreadNotify({pageNo: 1, pageSize: 10}).then(res => notifications.value = res.data.records)
})

function getModelGroupList() {
  loading.value = true
  getProcModelByUser().then(res => {
    loading.value = false
    modelGroupList.value = res.data.filter(g => g.items.length > 0)
        .map(group => {
          group.items.forEach(v => v.logo = JSON.parse(v.logo))
          return group
        })
    if (modelGroupList.value.length > 0)
      router.push(`#g${modelGroupList.value[0].id}`)
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function getCount(){
  countLoading.value = true
  getInstCount().then(res => {
    countLoading.value = false
    countData.value = res.data
  }).catch(err => {
    ElMessage.error(err.msg)
    loading.value = false
  })
}

function navTo(path) {
  router.push(`/workspace/${path}`)
}

function startProcess(app) {
  router.push('/workspace/startProc?code=' + app.code)
}
</script>

<template>
  <div style="overflow: hidden">
    <el-row :gutter="10">
      <el-col :span="18">
        <el-row v-loading="countLoading" :gutter="10">
          <el-col :span="8">
            <div class="w-card w-card-count">
              <el-statistic :value="countData.todo" @click="navTo('todo')">
                <template #title>
                  <el-text>{{ $t('menu.todo') }}</el-text>
                </template>
              </el-statistic>
              <img src="/image/pending.png"/>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="w-card w-card-count">
              <el-statistic :value="countData.mySubmit" @click="navTo('submitted')">
                <template #title>
                  <el-text>{{ $t('menu.submitted') }}</el-text>
                </template>
              </el-statistic>
              <img src="/image/ido.png"/>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="w-card w-card-count">
              <el-statistic :value="countData.ccMe" @click="navTo('cc')">
                <template #title>
                  <el-text>{{ $t('menu.ccMe') }}</el-text>
                </template>
              </el-statistic>
              <img src="/image/cc.png"/>
            </div>
          </el-col>
        </el-row>
        <el-row :gutter="10" class="w-card w-app-list" v-loading="loading">
          <template v-if="modelGroupList.length > 0">
            <el-col :span="4">
              <el-scrollbar class="w-app-list-group">
                <el-anchor :offset="10" :container="appList" direction="vertical" type="default">
                  <el-anchor-link :href="`#g${group.id}`" :title="group.name" v-for="group in modelGroupList">
                  </el-anchor-link>
                </el-anchor>
              </el-scrollbar>
            </el-col>
            <el-col :span="20">
              <div class="w-app-list-app w-scroll" ref="appList">
                <div :id="`g${group.id}`" class="w-app-group" :key="group.id" v-for="group in modelGroupList">
                  <el-text size="large" class="w-app-group-title">{{ group.name }}</el-text>
                  <div class="w-app-group-apps">
                    <div :key="app.id" v-for="app in group.items" @click="startProcess(app)">
                      <iconify class="w-process-icon" color="#ffffff" :style="{background: app.logo.bgc}"
                               :icon="app.logo.name"></iconify>
                      <div class="w-app-info">
                        <el-text tag="div" truncated>{{ app.procName }}</el-text>
                        <el-text tag="div" v-show="app.remark" truncated size="small">{{ app.remark }}</el-text>
                      </div>
                    </div>
                    <!--占位元素-->
                    <div v-for="i in 3" style="height: 0; border: none; padding: 0;"></div>
                  </div>
                </div>
              </div>
            </el-col>
          </template>
          <div v-else style="text-align: center; width: 100%;">
            <el-empty description="没有可发起的流程"/>
          </div>
        </el-row>
      </el-col>
      <el-col :span="6">
        <div class="w-card w-dsb-calendar">
          <el-calendar v-model="today"/>
        </div>
        <div class="w-card w-dsb-notice">
          <div>{{ $t('dash.active') }}</div>
          <el-scrollbar>
            <div v-for="notification in notifications" :key="notification.id" style="margin-bottom: 8px">
              <el-link @click="navTo('todo')">{{notification.content}}</el-link>
            </div>
            <el-empty v-if="!notifications.length" description="暂无动态" :image-size="45"/>
          </el-scrollbar>
        </div>
      </el-col>
    </el-row>

  </div>

</template>

<style scoped lang="less">
.el-statistic {
  cursor: pointer;
}

.w-card {
  overflow: hidden;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.w-app-list {
  margin-top: 10px;

  .w-app-list-group, .w-app-list-app {
    height: calc(100vh - 225px);
    overflow-y: auto;
  }

  :deep(.w-app-list-group) {
    border-right: 1px solid var(--el-border-color);
    padding-right: 5px;

    .el-anchor {
      background-color: var(--el-bg-color);
    }

    .el-anchor__list {
      padding-left: 0;

      .el-anchor__link {
        padding-left: 10px;
        border-radius: 5px;
      }

      .is-active {
        background-color: var(--el-color-primary-light-9);
      }
    }
  }

  .w-app-group-title {
    padding: 10px 0;
  }

  .w-app-group-apps {
    gap: 10px; /* 元素之间的间距 */
    padding: 10px; /* 你可以根据需要调整这个值 */
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;

    & > div {
      width: calc(25% - 10px); /* 每行 4 个，计算减去间距 */
      display: flex;
      cursor: pointer;
      padding: 10px;
      border-radius: 5px;
      border: 1px solid var(--el-border-color);
      box-sizing: border-box;

      .w-app-info {
        align-items: center;
        margin-left: 10px;
        max-width: calc(100% - 47px);

        & > * {
          display: block;
        }

        & > :last-child {
          color: var(--el-text-color-placeholder);
        }
      }

      &:hover {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
      }
    }
  }
}

.w-card-count {
  display: flex;
  justify-content: space-between;
  border-right: 1px solid var(--el-bg-color-page);

  img {
    width: 50px;
    height: 50px;
  }
}

.w-dsb-notice {
  padding: 0;
  margin-top: 10px;

  & > div {
    padding: 12px 20px;
  }

  & > :first-child {
    border-bottom: 1px solid var(--el-border-color);
  }

  & > :last-child {
  }
}

:deep(.w-dsb-calendar) {
  padding: 0;

  .el-calendar-table {
    font-size: small;
  }

  .el-calendar-day {
    height: auto;
  }
}
</style>
