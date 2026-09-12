<script setup>
import Nodes from "../../ProcessNodes.js";
const props = defineProps({
  icon: {
    type: String,
    default: 'Plus'
  },
  type: {
    type: String,
    default: 'primary'
  },
  disableAdd: Boolean
})
const nodeList = Object.keys(Nodes)
    .filter(v => Nodes[v].name).map(v => {
      return {
        type: v,
        ...Nodes[v]
      }
    })

const title = computed(() => {
  return '请选择流程节点'
})

const show = ref(false)

defineEmits(['insertNode', 'paste'])
</script>

<template>
  <el-popover @hide="show = false" width="455" :disabled="disableAdd" placement="right-start" trigger="click">
    <template #reference>
      <el-button @click="show = true" :type="type" :icon="icon" circle style="z-index: 1;" aria-label="添加流程节点" title="添加流程节点"></el-button>
    </template>
    <template v-if="show">
      <div class="w-node-options_header">
        <el-text size="large">{{title}}</el-text>
        <el-text type="primary" @click="$emit('paste')">
          粘贴节点/支路
        </el-text>
      </div>
      <div class="w-node-options">
        <div v-for="node in nodeList" :key="node.type" @click="$emit('insertNode', node.type)">
          <el-icon size="25" :style="{color: node.color}">
            <component :is="node.icon"/>
          </el-icon>
          {{node.name}}
        </div>
      </div>
    </template>

  </el-popover>
</template>

<style scoped>
.w-node-options_header {
  padding-bottom: 5px;
  display: flex;
  justify-content: space-between;

  &>:last-child {
    cursor: pointer;
  }
}

.w-node-options {
  display: flex;
  flex-wrap: wrap;

  i {
    padding: 3px;
    margin-right: 5px;
    border-radius: 10px;
    border: 1px solid var(--el-border-color);
  }

  & > div {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 8px 10px;
    border-radius: 15px;
    border: 1px solid var(--el-border-color-light);
    margin: 5px;
    width: 110px;

    &:hover {
      box-shadow: 0 0 5px 0 var(--el-border-color);
    }
  }
}
</style>
