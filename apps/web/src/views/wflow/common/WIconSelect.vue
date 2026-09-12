<script setup>
import {$debounce, isEmpty} from "@/utils/GlobalFunc.js";

const _value = defineModel({type: String})

//预选好的图标
const fixedIcon = [
  'bi:people-fill',
  'gridicons:multiple-users',
  'icon-park-solid:appointment',
  'icon-park-solid:people',
  'fluent:people-add-24-filled',
  'material-symbols:person-cancel-rounded',
  'ph:coffee-fill',
  'ph:sneaker-move-fill',
  'solar:money-bag-bold',
  'healthicons:money-bag',
  'solar:wallet-money-bold',
  'f7:money-yen-circle-fill',
  'entypo:aircraft',
  'entypo:aircraft-take-off',
  'mingcute:bus-2-fill',
  'mingcute:car-fill',
  'mingcute:train-fill',
  'fluent:handshake-20-filled',
  'icon-park-solid:buy',
  'mingcute:hand-card-fill',
  'icon-park-solid:time',
  'mdi:gift',
  'bxs:map',
  'ph:fingerprint-fill',
  'mdi:customer-service',
  'icon-park-solid:general-branch',
  'bx:bxs-purchase-tag',
  'mdi:notebook-edit',
  'simple-icons:opsgenie',
  'streamline:business-user-curriculum-solid',
  'fa6-solid:business-time',
  'mdi:google-my-business',
  'mdi:qqchat',
  'mdi:wechat',
  'bxs:message-square-detail',
  'mingcute:send-plane-fill',
  'tabler:mail-filled',
  'material-symbols:folder-open',
  'icon-park-solid:computer',
  'material-symbols:laptop-mac-outline',
  'fluent:phone-vibrate-20-filled',
  'fluent:form-28-filled',
  'file-icons:omnigraffle',
  'material-symbols:assignment-turned-in',
  'mingcute:card-refund-fill',
  'mingcute:wechat-miniprogram-fill',
  'whh:phonebookalt',
  'ri:database-2-fill',
  'ph:bank-fill',
  'material-symbols:school',
  'iconamoon:smiling-face-fill',
  'solar:sad-circle-bold',
  'ri:hearts-fill',
  'mdi:qrcode-scan',
  'fluent:calendar-cancel-16-filled',
  'ion:videocam',
  'material-symbols:play-circle',
  'jam:unsplash',
  'ph:film-reel-fill',
  'icon-park-solid:noodles',
  'dashicons:food',
  'fluent:food-cake-16-filled',
  'mdi:food',
  'material-symbols:delete',
  'material-symbols:edit-document',
  'material-symbols:chart-data',
  'ph:chart-pie-slice-fill'
]

const search = ref(null)
const _icons = ref([])
const loading = ref(false)
let doSearch = $debounce(searchIcons, 800)

const iconList = computed(() => {
  if (!isEmpty(search.value)){
    return _icons.value
  }
  return fixedIcon
})

async function searchIcons() {
  loading.value = true
  const response = await fetch(
      `https://api.iconify.design/search?query=${search.value}&limit=200`
  );
  const {icons} = await response.json();
  _icons.value = icons;
  loading.value = false
}

watch(search, () => {
  doSearch()
})
</script>

<template>
  <div style="width: 100%;">
    <el-input style="width: 100%;" v-model="search" clearable placeholder="使用 英文 关键字搜索海量在线图标"/>
    <div v-if="iconList.length < 1">
      <el-empty description="未找到相关图标😥"></el-empty>
    </div>
    <div v-else v-loading="loading" class="w-icons">
      <iconify class="w-icons-ico" @click.native="_value = ico"
               :icon="ico" :width="25" :height="25" v-for="ico in iconList" :key="ico"/>
      <div style="width: 31px; height: 0;" v-for="i in 12"></div>
    </div>
  </div>

</template>

<style scoped lang="less">
.w-icons{
  overflow: auto;
  max-height: 400px;
  padding: 2px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  .w-icons-ico{
    padding: 3px;
    cursor: pointer;
    border-radius: 2px;
    &:hover {
      box-shadow: 0 0 3px 0 #9b9595;
    }
  }
}
</style>
