<script setup>
import {getFormComponent} from '@/utils/form-components';

const options = defineProps({ sfc: String, cpRef: Function, index: Number, mode: String, permConf: Object, props: Object });
const value = defineModel();
const customCp = ref();
const component = computed(() => getFormComponent(options.sfc || ''));
watchEffect(() => { if (customCp.value) options.cpRef?.(customCp.value); });
</script>

<template>
  <component v-if="component" :is="component" ref="customCp" v-bind="props" v-model="value"
             :index="index" :mode="mode" :perm-conf="permConf"/>
  <el-alert v-else title="此表单组件尚未注册" type="error" :closable="false"/>
</template>
