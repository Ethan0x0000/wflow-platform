<script setup>
import nodeType, {NodeComponents} from "./ProcessNodes.js";
import {ElMessage} from "element-plus";
import {reloadNodeId} from "@/utils/ProcessUtil.js";

const props = defineProps({
  readonly: { //流程图只读模式
    default: false
  },
  modelValue: {
    required: true,
    type: Object,
    default: () => {
      return []
    }
  },
  //流转记录状态
  records: {
    default: () => {
      return {}
    }
  }
})
const processChange = inject('processChange')
const _records = computed(() => props.records?.nodeRecords)
provide('nodeRecords', _records)

defineEmits(['select'])
defineExpose({validate})

const node = ref([])

function nodeChange() {
  if (processChange) {
    processChange()
  }
}

/**
 * 删除某个元素
 * @param branch 要删除的元素所在支路
 * @param i 删除的元素在该支路内索引位置
 */
function deleteNode(branch, i) {
  branch.splice(i, 1)
  nodeChange()
}

/**
 * 插入节点
 * @param branch 该节点要插入的支路（节点数组）
 * @param i 插入哪个元素后面的索引，实际插入位置为i+1
 * @param type 要插入的节点类型
 */
function insertNode(branch, i, type) {
  if (nodeType[type]) {
    branch.splice(i + 1, 0, ...nodeType[type].create(type))
    nodeChange()
  } else {
    ElMessage.warning('请在ProcessNodes.js内配置该节点')
  }
}

function validate() {
  return new Promise((resolve, reject) => {
    const errs = []
    if (Array.isArray(node.value)) {
      node.value.forEach(ref => {
        if (ref.validate) {
          ref.validate(errs)
        }
      })
    } else if (node.value && node.value.validate){
      node.value.validate(errs)
    }
    if (errs.length === 0) {
      resolve()
    } else {
      reject(errs)
    }
  })
}

function setChildRef (el) {
  if (el) node.value.push(el)
}

function pasteNode(nodes, i) {
  const node = sessionStorage.getItem('copyNode')
  if (node) {
    const _node = JSON.parse(node)
    if (_node.id) {
      _node.name = `${_node.name}-copy`
      reloadNodeId(_node)
      nodes.splice(i + 1, 0, _node)
      if (_node.type === 'Gateway') {
        //如果是网关，就额外加一个汇聚点
        nodes.splice(i + 2, 0, {
          id: _node.id.replace(/_fork/g, "_join"),
          type: 'Join',
          name: '网关聚合',
          parentId: null,
          childId: null,
          props: {
            type: _node.props.type
          }
        })
      }
      nodeChange()
    } else {
      ElMessage.warning('当前已复制内容非节点格式')
    }
  } else {
    ElMessage.warning('没有复制的节点内容')
  }
  sessionStorage.removeItem('copyNode')
}

onBeforeUpdate(() => node.value.length = 0)

</script>

<template>
  <div class="w-process">
    <template v-for="(node, i) in modelValue || []" :key="node.id + node.type">
      <component :readonly="readonly" v-model="modelValue[i]" :branch="modelValue" :index="i"
                 @select="nd => $emit('select', nd)" :ref="setChildRef" @paste="pasteNode(modelValue, i)"
                 :is="NodeComponents[node.type]" @delete="deleteNode" @insertNode="insertNode"/>
    </template>
    <div class="w-process-end" v-if="!records.instStatus">流程结束</div>
    <div class="w-process-end" v-else>
      {{records.instStatusName}}
    </div>
  </div>
</template>

<style lang="less" scoped>
.w-process {
  margin: 0 auto;
  width: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--el-bg-color-page);

  .w-process-node {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .w-process-end {
    padding: 10px;
    border-radius: 5px;
    background: var(--el-fill-color-darker);
  }
}
</style>
