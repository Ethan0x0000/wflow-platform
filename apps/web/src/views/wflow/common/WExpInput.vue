<template>
  <div class="editor-wrapper">
    <div ref="editorRef" class="formula-editor" contenteditable="true"
         @input="handleInput" @keydown="handleKeyDown" @click="handleEditorClick"></div>

    <div v-if="showVariables" ref="panelRef" class="variable-panel" :style="panelPosition">
      <el-text v-for="(varItem, index) in variables" :key="index" class="variable-item" @mousedown.prevent="insertVariable(varItem)">
        {{ varItem.label }}
      </el-text>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const editorRef = ref(null)
const panelRef = ref(null)
const variables = ref([
  {label: '姓名', value: 'name'},
  {label: '年龄', value: 'age'},
  {label: '性别', value: 'sex'},
])
const showVariables = ref(false)
const triggerPosition = ref({ x: 0, y: 0 })
const panelPosition = ref({ left: '0px', top: '0px' })

// 光标位置追踪
const updatePanelPosition = () => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  panelPosition.value = {
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.bottom + window.scrollY + 2}px`
  }
}

// 输入处理
const handleInput = () => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const node = selection.anchorNode
  const text = node.textContent || ''
  const offset = selection.anchorOffset

  // 检测是否输入了触发符号
  if (text[offset - 1] === '/') {
    showVariables.value = true
    updatePanelPosition()
  }
}

// 点击编辑器时更新面板位置
const handleEditorClick = () => {
  if (showVariables.value) {
    updatePanelPosition()
  }
}

// 插入变量
const insertVariable = (item) => {
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  // 删除触发符号 /
  const range = selection.getRangeAt(0)
  range.setStart(selection.anchorNode, selection.anchorOffset - 1)
  range.deleteContents()

  // 创建变量标签
  const tag = document.createElement('span')
  tag.className = 'variable-tag'
  tag.contentEditable = false
  tag.textContent = item.label

  // 插入标签并添加空格
  range.insertNode(tag)
  range.insertNode(document.createTextNode('\u200B')) // 零宽空格

  // 移动光标到标签后
  const newRange = document.createRange()
  newRange.setStartAfter(tag)
  newRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(newRange)

  closePanel()
}

// 关闭面板
const closePanel = () => {
  showVariables.value = false
}

// 全局点击检测
const handleClickOutside = (event) => {
  if (
      !editorRef.value.contains(event.target) &&
      (!panelRef.value || !panelRef.value.contains(event.target))
  ) {
    closePanel()
  }
}

// 键盘事件处理
const handleKeyDown = (e) => {
  // 空格键关闭面板
  if (e.key === ' ' && showVariables.value) {
    closePanel()
    e.preventDefault()
  }

  // 方向键保持面板打开
  if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault()
  }
}

// 事件监听管理
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.formula-editor {
  min-height: 40px;
  border: 1px solid #dcdfe6;
  padding: 8px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
}

.variable-panel {
  display: flex;
  flex-direction: column;
  position: absolute;
  border-radius: 5px;
  border: 1px solid #ebeef5;
  background: white;
  box-shadow: 0 2px 12px rgba(0,0,0,.1);
  z-index: 1000;
}

.variable-item {
  padding: 8px 16px;
  cursor: pointer;
  &:hover {
    background: #f5f7fa;
  }
}

:deep(.variable-tag) {
  display: inline-block;
  background: #409eff;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0 2px;
  border: 1px solid #3070ff;
  font-family: monospace;
}
</style>
