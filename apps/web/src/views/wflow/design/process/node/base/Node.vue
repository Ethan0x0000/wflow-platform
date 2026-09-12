<script setup>
import InsertBtn from "./InsertBtn.vue";
import nodeMixin from "../../NodeMixin.js";
import { directive, Contextmenu, ContextmenuItem } from "v-contextmenu";
import "v-contextmenu/dist/themes/default.css";
import {ElMessage} from "element-plus";

const isDebug = inject('isDebug')
const props = defineProps({
  headerColor: String, //头部颜色
  headerIcon: String, //头部图标
  content: String, //节点内容
  readonly: Boolean, //是否禁用，不可编辑
  modelValue: Object, //节点对象,
  showError: Boolean, //是否显示错误状态
  errorInfo: String, //错误信息
  disableAdd: Boolean,
  showClose: {
    default: true
  },
  showBody: {
    default: true
  },
  placeholder: {
    default: '请设置'
  },
  insertBtnIcon: {
    type: String,
    default: 'Plus'
  },
  insertBtnType: {
    type: String,
    default: 'primary'
  },
  result: String,
  id: String
})

const enableEdit = ref(false)
const nodeNameInput = ref()
const menu = ref()
const emit = defineEmits([...nodeMixin.emits, 'paste', 'change'])
const _value = defineModel()
const records = inject('nodeRecords', {})
const nodeRd = computed(() => records?.value?.[_value?.value?.id])
const status = computed(() => {
  if (!_value?.value || !nodeRd.value) return null
  switch (nodeRd.value?.result) {
    case "startup":
    case "agree":
    case "complete":
      return {
        icon: 'SuccessFilled',
        type: 'success'
      }
    case "reject":
      return {
        icon: 'CircleCloseFilled',
        type: 'danger'
      }
    case "cancel":
      return {
        icon: 'CircleCloseFilled',
        type: 'info'
      }
    case "revoke":
      return {
        icon: 'WarningFilled',
        type: 'warning'
      }
    case "fallback":
      return {
        icon: 'Back',
        type: 'warning'
      }
    case "pass":
      return {
        icon: 'Bottom',
        type: 'success'
      }
    default:
      if (!nodeRd.value?.endTime) return {
        icon: 'Loading',
        type: 'primary'
      }
      return null
  }
})

defineOptions({
  directives: {
    'contextmenu': directive
  }
})

function copyNode() {
  sessionStorage.setItem('copyNode', JSON.stringify(_value.value))
  ElMessage.success('复制节点成功')
}

function blur() {
  enableEdit.value = false;
  emit('change')
}

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
    <contextmenu ref="menu" v-if="!readonly && _value?.type !== 'Start'">
      <contextmenu-item @click="copyNode">复制节点</contextmenu-item>
    </contextmenu>
    <el-tooltip v-if="showError" effect="dark" :content="errorInfo || '设置错误'" placement="top-start">
      <el-icon size="20" class="w-node-err-tip">
        <WarningFilled/>
      </el-icon>
    </el-tooltip>
    <div v-if="status" class="w-node-status w-flex-col-ct">
      <el-icon :class="{'is-loading': status.icon === 'Loading'}"
               size="20" :style="{color: `var(--el-color-${status?.type})`}">
        <component :is="status.icon"/>
      </el-icon>
      <el-text :type="status?.type">{{nodeRd.count + 1}}</el-text>
    </div>
    <div v-contextmenu:menu :class="{'w-p-node-body': true, 'w-node-err': showError}" v-if="showBody"
         :style="{'---shadowColor': headerColor}">
      <div class="w-p-node-header" :style="{'background-color': headerColor}">
        <div>
          <el-icon size="15" v-if="!enableEdit">
            <component :is="headerIcon"/>
          </el-icon>
          <input ref="nodeNameInput" v-if="enableEdit" autofocus @blur="blur" v-model="_value.name"/>
          <div class="w-row-text" v-else @click="() => {if(!readonly) enableEdit = true}">{{ _value.name }}</div>
        </div>
        <el-icon class="w-node-del" v-if="showClose && !readonly" @click="emit('delete')">
          <Close/>
        </el-icon>
      </div>
      <div class="w-p-node-content" @click="$emit('select')">
        <el-text line-clamp="4">
          <el-text style="position: absolute; top: 25px" size="small" v-if="isDebug && id" type="warning">{{id}}</el-text>
          {{ content || placeholder }}
        </el-text>
        <el-icon class="w-p-node-click">
          <ArrowRight/>
        </el-icon>
      </div>
    </div>
    <div class="w-p-node-add">
      <insert-btn :disable-add="disableAdd" v-if="!readonly" :icon="insertBtnIcon"
                  :type="insertBtnType" @insertNode="type => emit('insertNode', type)"
                  @paste="$emit('paste')"/>
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

  .w-node-status {
    padding: 2px;
    border-radius: 50%;
    color: var(--bgc);
    position: absolute;
    left: -40px;
    top: 30px;
  }

  .w-p-node-body {
    cursor: pointer;
    background: var(--el-bg-color);
    overflow: hidden;
    border-radius: 5px;
    box-shadow: 0 0 5px 0 var(--el-border-color);

    .w-p-node-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      color: white;
      height: 25px;
      font-size: 13px;

      .w-row-text {
        min-width: 50px;
        min-height: 20px;

        &:hover {
          text-decoration: underline;
        }
      }

      .w-node-del {
        display: none;
      }

      & > div {
        display: flex;
        align-items: center;

        & > div {
          margin-left: 3px;
          width: calc(var(--w-node-width) - 50px);
        }
      }

      input {
        width: calc(var(--w-node-width) - 50px);
        border: none;
        border-radius: 5px;

        &:focus {
          outline: none;
        }
      }
    }

    .w-p-node-content {
      padding: 5px 5px 5px 15px;
      min-height: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      color: #656363;
      word-break: break-all;

      & > span {
        width: 92%;
        word-wrap: break-word;
        word-break: break-all;
      }
    }

    &:hover {
      box-shadow: 0 0 5px 0 var(---shadowColor);

      .w-node-del {
        display: inline;
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
      width: var(--w-node-line-width);
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
