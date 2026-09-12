<script setup>
import InsertBtn from "./InsertBtn.vue";
import nodeMixin from "../../NodeMixin.js";
import { directive, Contextmenu, ContextmenuItem } from "v-contextmenu";
import "v-contextmenu/dist/themes/default.css";

const isDebug = inject('isDebug')
const props = defineProps({
  moveLn: Boolean,
  moveRn: Boolean,
  type: String, //节点类型
  color: String, //节点主题颜色
  headerIcon: String, //头部图标
  content: String, //节点内容
  readonly: Boolean, //是否禁用，不可编辑
  modelValue: Object, //节点名称
  showError: Boolean, //是否显示错误状态
  errorInfo: String, //错误信息
  isDefault: Boolean, //是否为默认节点
  placeholder: {
    default: '请设置'
  },
  id: String,
  desc: String //描述
})
const enableEdit = ref(false)
const nodeNameInput = ref()
const menu = ref()
const emit = defineEmits([...nodeMixin.emits, 'copy', 'moveL', 'moveR', 'copy-node', 'copy-branch'])
const _value = defineModel()

defineOptions({
  directives: {
    'contextmenu': directive
  }
})

watch(enableEdit, () => {
  if (enableEdit.value) {
    nextTick(() => {
      nodeNameInput.value.focus()
    })
  }
})
</script>

<template>
  <div class="w-p-node">
    <contextmenu ref="menu" v-if="!readonly">
      <contextmenu-item @click="emit('copy-node')">复制节点</contextmenu-item>
      <contextmenu-item @click="emit('copy-branch')">复制支路</contextmenu-item>
    </contextmenu>
    <el-tooltip v-if="showError" effect="dark" :content="errorInfo || '设置错误'" placement="top-start">
      <el-icon size="20" class="w-node-err-tip">
        <WarningFilled/>
      </el-icon>
    </el-tooltip>
    <div v-contextmenu:menu :class="{'w-p-node-body': true, 'w-node-err': showError}" :style="{'---shadowColor': color}">
      <div class="w-p-node-move" @click="emit('moveL')">
        <el-icon v-show="!readonly && moveLn && !isDefault">
          <ArrowLeft/>
        </el-icon>
      </div>
      <div style="flex: 1">
        <div class="w-p-node-header">
          <div :style="{'color': isDefault ? '#898989' : color}">
            <el-icon size="15" v-if="!enableEdit">
              <component :is="headerIcon"/>
            </el-icon>
            <input ref="nodeNameInput" v-if="enableEdit" autofocus @blur="enableEdit = false" v-model="_value.name"/>
            <div class="w-row-text" v-else @click="() => {if(!readonly) enableEdit = true}">{{ _value.name }}</div>
          </div>
          <div class="w-node-action" v-if="!readonly && !isDefault">
            <el-icon @click="emit('copy')">
              <CopyDocument/>
            </el-icon>
            <el-icon @click="emit('delete')">
              <Close/>
            </el-icon>
          </div>
          <el-text class="w-node-desc" type="info" size="small">{{ desc }}</el-text>
        </div>
        <div class="w-p-node-content" @click="$emit('select')">
          <el-text line-clamp="4">
            <el-text style="position: absolute; top: 25px" size="small" v-if="isDebug && id" type="warning">{{id}}</el-text>
            {{ content || placeholder }}
          </el-text>
        </div>
      </div>
      <div class="w-p-node-move" @click="emit('moveR')">
        <el-icon v-show="!readonly && moveRn && !isDefault">
          <ArrowRight/>
        </el-icon>
      </div>
    </div>
    <div class="w-p-node-add">
      <insert-btn v-if="!readonly" @insertNode="nd => emit('insertNode', nd)" @paste="$emit('paste')"/>
    </div>
  </div>
</template>

<style scoped lang="less">

.w-p-node {
  width: var(--w-node-width);
  margin-bottom: 8px;
  position: relative;

  .w-node-err-tip {
    position: absolute;
    right: -30px;
    color: var(--el-color-danger)
  }

  .w-p-node-body {
    cursor: pointer;
    background: var(--el-bg-color);
    overflow: hidden;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 0 5px 0 var(--el-border-color);

    .w-p-node-move {
      width: 15px;

      &:hover {
        background: #F5F6F6;
      }
    }

    &:hover {
      box-shadow: 0 0 5px 0 var(---shadowColor);
    }

    & > div:first-child, & > div:last-child {
      height: 100%;

      &:hover {
        background: var(--el-fill-color-darker);
      }
    }

    .w-p-node-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 25px;
      font-size: 13px;

      .w-node-action {
        color: #767676;
        display: none;

        & > * {
          margin: 2px;
        }
      }

      .w-node-desc {
        position: absolute;
        right: 8px;
      }

      .w-row-text {
        min-width: 50px;
        min-height: 20px;

        &:hover {
          text-decoration: underline;
        }
      }

      & > div {
        display: flex;
        align-items: center;

        & > div {
          margin-left: 3px;
          width: calc(var(--w-node-width) - 85px);
        }
      }

      input {
        width: calc(var(--w-node-width) - 85px);
        border: 1px solid var(--el-input-border-color);
        border-radius: 5px;

        &:focus {
          outline: none;
        }
      }
    }

    .w-p-node-content {
      padding: 5px;
      min-height: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      color: #656363;
      word-break: break-all;

      & > div {
        word-wrap: break-word;
      }
    }

    &:hover {
      .w-node-action {
        display: inline;
      }

      .w-node-desc {
        display: none;
      }
    }
  }

  .w-p-node-add {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--w-node-line-len);

    &:before {
      position: absolute;
      content: '';
      width: 2px;
      height: var(--w-node-line-len);
      background: var(--el-border-color-darker);
    }

    &:after {
      content: '';
      position: absolute;
      top: var(--w-node-line-len);
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      border-style: solid;
      border-width: 8px 6px 4px;
      border-color: var(--el-border-color-darker) transparent transparent;
    }
  }
}
</style>
