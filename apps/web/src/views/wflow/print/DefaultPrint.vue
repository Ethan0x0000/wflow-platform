<script setup>
import QRCode from "qrcode";
import FormField from "./component/FormField.vue";
import Print from "@/utils/Print.js";
import {getInstRecords} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {isEmpty} from "@/utils/GlobalFunc.js";
const {loginUser} = useWflowStore()
import {dayjs} from "element-plus";
import ValueType from "../design/form/ValueType.js";
import {getStatusText} from "../../../utils/ProcessUtil.js";

const props = defineProps({
  instance: {
    type: Object,
    default: () => {
      return {}
    }
  },
  formFields: {
    type: Array,
    default: () => {
      return []
    }
  },
  permConf: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const body = ref()
const qrCode = ref()
const records = ref([])
const loading = ref(false)

const qrUrl = computed(() => `${import.meta.env.VITE_MB_BASE_URL}/instance?instId=${props.instance.instId}`)

onMounted(() => {
  getRecords()
  QRCode.toCanvas(qrCode.value, qrUrl.value, {
    width: 90,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })
})

function doPrint() {
  Print(document.getElementById('default-print'))
}
function getRecords() {
  loading.value = true
  getInstRecords(props.instance.instId).then(res => {
    loading.value = false
    records.value = res.data
    records.value.forEach(node => {
      //如果实际处理人有评论意见，那么就拿出来合并进去
      const actuals = node.actualUsers.filter(v => !isEmptyComment(v.comment))
      //合并记录然后根据结束时间排序
      const recordItems = node.recordItems.concat(actuals)
      node.recordItems = recordItems.sort((a, b) => new Date(a.endTime) - new Date(b.endTime))
    })
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.message)
  })
}

function isEmptyComment(cmt) {
  return !cmt || (isEmpty(cmt.text) && cmt.files.length === 0 && cmt.images.length === 0)
}

function getTaskMode(mode) {
  if (!mode) return ''
  switch (mode.type) {
    case 'AND':
      return '会签';
    case 'OR':
      return '或签';
    case 'NEXT':
      return '顺序会签';
    case 'CUSTOM':
      return `按比例${mode.percentage}%通过`;
  }
}

defineExpose({open, doPrint})
</script>

<template>
  <div id="default-print" class="w-print" v-loading="loading">
    <div style="text-align: center">
      <h2 style="margin-bottom: 3px">{{instance.defineName}}</h2>
      <el-text>{{instance.title}}</el-text>
    </div>

    <div class="w-print-header">
      <div>审批流水号：{{ instance.instId }}</div>
      <div>提交时间：{{ instance.createTime }}</div>
    </div>
    <div class="qr-code">
      <div>扫码查流程</div>
      <canvas ref="qrCode"/>
    </div>
    <div class="w-print-content">
      <table border="0">
        <tbody>
        <tr v-if="instance.isAgent">
          <th>代提交人</th>
          <td>{{ instance.startUser?.name }}</td>
        </tr>
        <tr>
          <th>发起人</th>
          <td>{{ instance.initiator?.name }}</td>
        </tr>
        <tr>
          <th>所在部门</th>
          <td>{{ instance.startDept }}</td>
        </tr>
        <tr class="w-print-split">
          <th style="text-align: center" colspan="2">表单数据</th>
        </tr>
        <template v-for="field in formFields" :key="field.id">
          <tr v-if="permConf[field.key] !== 'H' && field.valueType !== ValueType.none">
            <th>{{ field.name }}</th>
            <td>
              <form-field :perm-conf="permConf" :config="field" :value="instance.formData[field.key]"/>
            </td>
          </tr>
        </template>
        <tr class="w-print-split">
          <th style="text-align: center" colspan="2">审批记录</th>
        </tr>
        <template v-for="node in records" :key="node.id">
          <tr>
            <th>{{node.nodeName}}</th>
            <td>
              <div v-for="(user, i) in node.actualUsers" :key="user.taskId" class="w-print-record">
                <div>
                  <el-text>
                    {{user.assignee?.name}}（{{getStatusText(user, instance?.isAgent, instance.initiator?.name)}}）
                  </el-text>
                  <el-text>{{(user.endTime || user.createTime || '').substring(5, 16)}}</el-text>
                </div>
                <div style="margin-left: 20px">
                  <el-text v-if="user.comment">
                    {{ user.comment.text }}
                  </el-text>
                </div>
              </div>
            </td>
          </tr>
        </template>

        </tbody>
      </table>
    </div>
    <div class="w-print-footer">
      <div>打印人：{{loginUser.name}}</div>
      <div>打印时间：{{dayjs().format('YYYY-MM-DD HH:mm:ss')}}</div>
    </div>
  </div>
</template>

<style scoped lang="less">

.w-print-split {
  //background: var(--el-fill-color-dark);
}

.w-print-record {
  padding: 5px 0;
  & > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.w-print {
  font-family: 宋体;
  position: relative;

  .qr-code {
    position: absolute;
    text-align: center;
    top: 0;
    right: 0;
  }
}

h2 {
  text-align: center;
}

.w-print-header {
  font-size: 16px;
  margin-bottom: 20px;

  div {
    padding: 5px 0;
  }
}

table {
  font-size: 16px;
  width: 100%;
  border-collapse: collapse;
  padding: 2px;

  th {
    width: 25%;
  }

  :deep(.w-rich-editor) {
    & > div:first-child {
      min-height: 0 !important;
      max-height: unset !important;
    }
  }
}

table tr th,
table tr td {
  text-align: left;
  border: 1px solid #464648;
  padding: 5px 10px;
}

.w-print-footer {
  font-size: 16px;
  margin-top: 20px;

  div {
    display: inline-block;
    width: 50%;
  }

  div:last-child {
    text-align: right;
  }
}

</style>
