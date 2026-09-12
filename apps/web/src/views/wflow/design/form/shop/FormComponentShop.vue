<script setup>

const search = ref(null)
const installed = ref([
  {name: '资源预约', key: 'make-an-appointment', icon: 'streamline:waiting-appointments-calendar', hasNewVersion: true, desc: '预约会议、预约资产，票务之类的场景，可以配置时间段进行预约', version: 1, updateTime: '2024-08-10'}
])
const components = ref([
  {name: '演示组件', key: 'demo1', icon: 'ep:coin', desc: '这是一个演示组件效果，不能只是演示样式，不可用哦', version: 1, updateTime: '2024-10-10'}
])
</script>

<template>
  <div class="w-cp-shopping">
    <div>
      <el-input clearable v-model="search" style="width: 60%;"
                size="large" :placeholder="`搜索组件，库内共2000+个组件`" prefix-icon="Search"/>
      <div style="font-size: small; color: var(--el-text-color-secondary)">选择需要的组件进行安装，增强您的表单功能</div>
    </div>
    <el-tabs>
      <el-tab-pane v-if="installed.length > 0">
        <template #label>
          <el-icon style="margin-right: 5px"><TakeawayBox/> </el-icon>
          已安装的
        </template>
        <div class="w-shop-cps" v-if="installed.length > 0">
          <div v-for="cp in installed" :key="cp.key">
            <div>
              <iconify :icon="cp.icon"/>
              <div>
                <el-text truncated size="large">{{cp.name}}</el-text>
                <div size="small">更新于: {{cp.updateTime}}</div>
              </div>
            </div>
            <div>
              <el-text :line-clamp="3" size="small">{{cp.desc}}</el-text>
            </div>
            <div :style="{padding: cp.hasNewVersion ? 0 : '0 20px'}">
              <el-button size="small" link type="primary" icon="View">预览</el-button>
              <el-button size="small" link type="primary" icon="Refresh" v-if="cp.hasNewVersion">更新</el-button>
              <el-button size="small" link type="danger" icon="Delete">卸载</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else></el-empty>
      </el-tab-pane>
      <el-tab-pane label="行政办公">
        <div class="w-shop-cps" v-if="components.length > 0">
          <div v-for="cp in components" :key="cp.key">
            <div>
              <iconify :icon="cp.icon"/>
              <div>
                <el-text truncated size="large">{{cp.name}}</el-text>
                <div size="small">{{cp.updateTime}} 更新</div>
              </div>
            </div>
            <div>
              <el-text :line-clamp="3" size="small">{{cp.desc}}</el-text>
            </div>
            <div>
              <el-button link type="primary" icon="View">预览</el-button>
              <el-button link type="primary" icon="TakeawayBox">安装</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else></el-empty>
      </el-tab-pane>
      <el-tab-pane label="政务公文">
        <el-empty></el-empty>
      </el-tab-pane>
      <el-tab-pane label="数据填报">
        <el-empty></el-empty>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="less">
.w-cp-shopping {
  padding: 0 20px;

  & > div:first-child {
    padding-bottom: 20px;
    width: 100%;
    text-align: center;
    :deep(.el-input__wrapper) {
      border-radius: 20px
    }
  }
}

.w-shop-cps {
  & > div {
    width: 160px;
    padding: 10px;
    cursor: pointer;
    border-radius: 10px;
    border: 1px solid var(--el-border-color);
    &:hover {

    }
    & > div:first-child {
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      svg {
        margin-right: 5px;
        font-size: 25px;
        padding: 5px;
        border-radius: 10px;
        background: var(--el-color-primary);
        color: white;
        //border: 1px solid var(--el-border-color-darker);
      }
      &> div {
        font-size: 11px;
        color: var(--el-text-color-secondary);
      }
    }
    & > div:nth-child(2) {
      height: 40px;
    }
    & > div:last-child {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding: 0 10px;
    }
  }
}
</style>
