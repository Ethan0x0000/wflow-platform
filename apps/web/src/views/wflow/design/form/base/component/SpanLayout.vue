<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {VueDraggable} from "vue-draggable-plus";
import FormComponent from "./FormComponent.vue";

const props = defineProps({
  ...FormComponentMixin.props,
})

const emit = defineEmits([...FormComponentMixin.emits])
const _active = computed(FormComponentMixin.computed._active(props, emit))
const _value = defineModel({
  type: Object,
  default: () => {
    return {}
  }
})

const freeMode = computed(() => props.mode === 'D')
const permConf = inject('permConf', {})

function reloadSpan() {
  //初始化分栏数据值
  const spanProps = props.config.props
  if (spanProps.number > spanProps.columns.length) {
    for (let i = 0; i < spanProps.number; i++) {
      if (!spanProps.columns[i]) {
        spanProps.columns.push([])
      }
    }
  } else {
    spanProps.columns.length = spanProps.number
  }
}

onBeforeMount(reloadSpan)
watch(() => props.config.props.number, reloadSpan)
</script>

<template>
  <el-row :gutter="parseInt(config.props.gutter)">
    <el-col v-for="(cols, i) in config.props.columns" :span="config.props.span / config.props.number" :key="`col_${i}`">
      <vue-draggable v-model="config.props.columns[i]" :animation="150" group="FormDesign" :disabled="!freeMode" :swapThreshold="0.2"
                     :ghostClass="freeMode ? 'w-f-cp-select':''" :class="{'w-f-cp-ct':freeMode}" handle=".w-cp-move">
        <template :key="item.id" v-for="(item, idx) in cols">
          <template v-if="permConf[item.key] !== 'H'">
            <el-form-item :label="item.name" :prop="item.key" v-if="!item.props.isContainer" @click.stop="_active = item"
                          :class="{'w-form-d-item': freeMode, 'w-form-cp-active': _active?.id === item.id && freeMode,
                         'w-form-cp-nlb':item.props.hideLabel, 'w-form-item-ep': item.props.allowPut}">
              <form-component :index="idx" :parents="cols" :config="item" :mode="permConf[item.key] || mode"
                              v-model:active="_active" v-model="_value[item.key]" :type="item.type"/>
            </el-form-item>
            <form-component v-else :config="item" :mode="permConf[item.key] || mode" v-model:active="_active" :type="item.type"
                            @click.stop="_active = item" v-model="_value" :index="idx" :parents="cols"
                            :class="{'w-form-cp-active': _active?.id === item.id && freeMode}"/>
          </template>

        </template>
      </vue-draggable>
    </el-col>
  </el-row>
</template>

<style lang="less" scoped>
:deep(.w-f-cp-ct) {
  width: 100%;
  min-height: 50px;
  background-color: var(--el-fill-color-lighter);
}

.w-f-cp-select {
  border-radius: 2px;
  border: 1px dashed var(--el-color-primary) !important;
}
</style>
