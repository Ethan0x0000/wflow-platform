<script setup>
import Editor, {EditorMode, ElementType} from '@hufe921/canvas-editor'
import {dayjs, ElMessage} from "element-plus";
import ValueType from "@/views/wflow/design/form/ValueType.js";
import {deepCopy, getRes, isEmpty} from "@/utils/GlobalFunc.js";
import QRCode from "qrcode";
import {getInstRecords} from "@/api/instance.js";
import {getStatusText} from "@/utils/ProcessUtil.js";

const props = defineProps({
  readonly: Boolean,
  permConf: {
    type: Object,
    default: () => {
      return {}
    }
  },
  formFields: {
    type: Object,
    default: () => {
      return {}
    }
  },
  //打印配置
  config: {
    type: Object,
    default: () => {
      return {
        data: {
          header: [],
          main: [],
          footer: []
        },
        version: '0.9.104',
        options: {}
      }
    }
  },
  instance: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const WPrinter = ref()
const loading = ref(true)
const recordNodes = ref([])
const records = ref([])
let editor = null

const html = ref('')
const fieldsObj = computed(() => {
  const obj = {}
  for (const field of props.formFields) {
    obj[field.key] = field
  }
  return obj
})

const qrUrl = computed(() => `${import.meta.env.VITE_MB_BASE_URL}/instance?instId=${props.instance.instId}`)
const instContext = computed(() => {
  const formData = props.instance.formData
  const baseInfo = {
    instId: props.instance.instId,
    instUserName: props.instance.startUser?.name,
    instDeptName: props.instance.startDept,
    instName: props.instance.defineName,
    instTitle: props.instance.title,
    instCode: props.instance.code,
    instCreateTime: props.instance.createTime,
    instEndTime: props.instance.endTime,
    instStatusName: props.instance.status,
    instVer: props.instance.version,
    instPrintTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  return {...formData, ...baseInfo, ...recordNodes.value, nodeRecords: records.value}
})

onMounted(() => {
  let config = deepCopy(toRaw(props.config))
  const doFillData = () => {
    try {
      handlerDomData(config.data.main, instContext.value, fieldsObj.value)
      handlerDomData(config.data.header, instContext.value, fieldsObj.value)
      handlerDomData(config.data.footer, instContext.value, fieldsObj.value)
      editor = new Editor(WPrinter.value, deepCopy(config.data), config.options)
      editor.command.executeMode(EditorMode.PRINT)
      window.editor = editor
      emit('render-ok')
      loading.value = false
    } catch (e) {
      loading.value = false
      console.error(e)
      ElMessage.error('初始化打印编辑器失败')
    }
  }
  //从接口取流转记录
  getInstRecords(props.instance.instId).then(res => {
    //处理流转记录
    const obj = {}
    res.data.forEach(node => {
      obj[node.id] = node.actualUsers.map(v => {
        const val = {
          nodeName: node.nodeName,
          nodeAssignee: v.assignee.name,
          nodeComment: v.comment ? v.comment.text : '',
          nodeEndTime: v.endTime,
          nodeSignature: v.signature ? getRes(v.signature) : '',
          nodeResult: getStatusText(v, props.instance.isAgent, props.instance.initiator?.name),
        }
        records.value.push(val)
        return val
      })
    })
    recordNodes.value = obj
    //进行填充数据
    doFillData()
  }).catch(err => {
    loading.value = false
    console.error(err)
    ElMessage.error(err.msg || err)
  })
})

onBeforeUnmount(() => editor?.destroy())
function doPrint() {
  editor.command.executePrint()
}

function handlerDomData(doms, ctx, fields) {
  processDynamicArray(doms, (el, handler) => {
    switch (el?.type) {
      case ElementType.CONTROL:
        const val = ctx[el.control?.conceptId]
        if (val){
          el.control.value = [{value: getFieldTextVal(val, fields[el.control?.conceptId])}]
        }
        break
      case ElementType.TABLE:
        //处理拖拽表单的表格类型，这个id已经被设置过了
        if (el._type === 'TableList' || el._type === 'FormList') {
          //是组件化表格，需要进行替换，提取表格的配置及数据
          const columns = {}
          const data = ctx[el._key]
          const trList = []
          fields[el._key]?.props.columns.forEach(col => columns[col.key] = col)
          if (el.trList.length > 1) {
            //提取用来替换的哪一行
            data?.forEach(rowData => {
              const row = deepCopy(el.trList[el.trList.length - 1])
              row.tdList.forEach((cell, i) => {
                //遍历单元格中的值
                handlerDomData(cell.value, rowData, columns)
              })
              trList.push(row)
            })
            el.trList = [el.trList[0], ...trList]
          }
        } else if (el._type === 'NodeRecords'){
          //流程记录表格
          const data = ctx['nodeRecords']
          const trList = []
          if (el.trList.length > 1) {
            //提取用来替换的哪一行
            data?.forEach(rowData => {
              const row = deepCopy(el.trList[el.trList.length - 1])
              row.tdList.forEach((cell, i) => {
                //遍历单元格，对内部的值进行替换
                handlerDomData(cell.value, rowData, fields)
              })
              trList.push(row)
            })
            el.trList = [el.trList[0], ...trList]
          }
        } else if (el._type === 'Node'){
          //TODO 单个节点

        } else {
          // 普通表格，遍历所有单元格内的每个元素
          el.trList.forEach((tr) => {
            tr.tdList.forEach((cell) => {
              //遍历单元格，对内部的值进行替换
              handlerDomData(cell.value, ctx, fields)
            })
          })
        }
        break
      case ElementType.IMAGE:
        const valImg = ctx[el._key]
        if (el.id === "instIdQrCode") {
          QRCode.toDataURL(qrUrl.value, (err, url) => {
            if (!err) el.value = url
          })
        } else if (el._type === ValueType.image) {
          if (isEmpty(valImg)) handler.delete()
          else el.value = getRes(valImg)
        } else if (el._type === ValueType.imageArray) {
          if (isEmpty(valImg)) {
            handler.delete()
            break
          }
          //替换第一个元素，再插入多个图像
          el.value = getRes(valImg[0]?.url)
          const imgs = valImg.filter((v, j) => j > 0).map(v => {
            const clone = deepCopy(el)
            clone.value = getRes(v.url)
            return clone
          })
          imgs.forEach(v => handler.insertAfter(v))
        }
        break
    }
  })
}

function processDynamicArray(data, callback) {
  const initialElements = data.slice(); // 元素快照
  const initialLength = initialElements.length;
  for (let i = 0; i < initialLength; i++) {
    const el = initialElements[i];
    const currentIndex = data.indexOf(el);
    // 如果元素已被删除则跳过
    if (currentIndex === -1) continue;
    // 回调处理逻辑
    callback(el, {
      delete: () => data.splice(currentIndex, 1),
      insertAfter: (newEl) => data.splice(currentIndex + 1, 0, newEl),
      //根据条件跳转到某个元素位置
      toNextEl: (compareFunc, callback) => {
        for (let len = i; len < initialLength; len++) {
          if (compareFunc(initialElements[len])) {
            callback?.(initialElements.slice(i, len))
            i = len
            return
          }
        }
      }
    }, currentIndex);
  }
}

function getFieldTextVal(val, field) {
  if (!field) return val
  switch (field?.valueType) {
    case ValueType.option:
      return val?.label
    case ValueType.options:
      return (val || []).map(v => v.label).join('、')
    case ValueType.timeRange:
    case ValueType.dateTimeRange:
      return Array.isArray(val) ? `${val[0]} ~ ${val[1]}` : ''
    case ValueType.orgArray:
      return (val || []).map(v => v.name).join('、')
    case ValueType.org:
      return val?.name
    case ValueType.array:
      return Array.isArray(val) ? val.join('、') : (val || '')
    case ValueType.user:
      return val?.name
    case ValueType.fileArray:
      return (val || []).map(v => v.name).join('、')
    case ValueType.object:
      switch (field.type) {
        case 'PhoneNumber':
          return `+${val?.prefix} ${val?.number}`
      }
      return JSON.stringify(val)
    default:
      return val
  }
}

defineExpose({doPrint})
const emit = defineEmits(['render-ok'])
</script>

<template>
  <div v-loading="loading" ref="WPrinter" class="w-print-pages" style="width: 100%"></div>
</template>

<style lang="less">
.ce-image-previewer {
  z-index: 99999;
}
</style>
