<script setup>

import {zhCn, en} from "element-plus/es/locale/index";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {useDark, useToggle} from "@vueuse/core";
import {useI18n} from "vue-i18n";

const isDark = useDark()
useToggle(isDark)
const wflow = useWflowStore()

const { locale } = useI18n()
locale.value = wflow.lang
const env = import.meta.env.MODE

const langs = {
  zhCn,
  en,
}

</script>

<template>
  <div class="app">
    <el-config-provider :locale="langs[wflow.lang]">
      <router-view v-slot="{ Component }" v-if="!$route.meta.keepAlive">
        <transition name="router-fade" mode="out-in">
          <el-watermark :font="{color : isDark ? '#FFFFFF11': '#00000019'}"
                        :content="['wflow-pro-next', '工作流']" :gap="[250, 250]">
            <component :is="Component"></component>
          </el-watermark>
        </transition>
      </router-view>
    </el-config-provider>
  </div>
</template>

<style scoped>

</style>
