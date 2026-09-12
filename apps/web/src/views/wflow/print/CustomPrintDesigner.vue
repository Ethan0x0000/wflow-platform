<script setup>
import Editor, {
  AreaMode,
  ControlType,
  ElementType,
  ImageDisplay,
  ListStyle,
  ListType, LocationPosition,
  PaperDirection,
  splitText
} from '@hufe921/canvas-editor'
import floatingToolbarPlugin from '@hufe921/canvas-editor-plugin-floating-toolbar'
import barcode1DPlugin from "@hufe921/canvas-editor-plugin-barcode1d"
import barcode2DPlugin from "@hufe921/canvas-editor-plugin-barcode2d"
import codeblockPlugin from "@hufe921/canvas-editor-plugin-codeblock"
import docxPlugin from '@hufe921/canvas-editor-plugin-docx'
import diagramPlugin from '@hufe921/canvas-editor-plugin-diagram'
import IconBtn from "./component/IconBtn.vue";
import {ElMessage, ElMessageBox} from "element-plus";
import WDialog from "../common/WDialog.vue";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {storeToRefs} from "pinia";
import ValueType from "../design/form/ValueType.js";
import {forEachProcessNode, isUserNode} from "@/utils/ProcessUtil.js";
import {deepCopy} from "@/utils/GlobalFunc.js";


const props = defineProps({
  readonly: Boolean,
  showTools: {
    type: Boolean,
    default: true
  },
  config: {
    type: Object,
    default: () => {
      return {
        version: '0.9.104',
        data: {},
        options: {}
      }
    }
  },
  //流程json
  process: {
    type: Object,
    default: () => {
      return {}
    }
  }
})

const emit = defineEmits(['update:modelValue'])
defineExpose({getValue})
const {formFields} = storeToRefs(useWflowStore())
const WPrinter = ref()
const fileInput = ref()

let editor = null

const options = {
  mode: props.readonly ? 'print' : 'edit',
}
const fontColorRef = ref()
const fontBgColorRef = ref()
const formRef = ref()

const watermarkDialog = ref(false)
const linkDialog = ref(false)
const scale = ref(1)
let defaultData = {
  header: [],
  main: [],
  footer: []
}
const fontSizes = [
  {label: '初号', value: 56},
  {label: '小初', value: 48},
  {label: '一号', value: 34},
  {label: '小一', value: 32},
  {label: '二号', value: 29},
  {label: '小二', value: 24},
  {label: '三号', value: 21},
  {label: '小三', value: 20},
  {label: '四号', value: 18},
  {label: '小四', value: 16},
  {label: '五号', value: 14},
  {label: '小五', value: 12},
  {label: '六号', value: 10},
  {label: '七号', value: 7},
  {label: '八号', value: 6},
]
const fontTypes = [
  {label: '微软雅黑', value: 'Microsoft YaHei'},
  {label: '华文宋体', value: '华文宋体'},
  {label: '华文仿宋', value: '华文仿宋'},
  {label: '华文黑体', value: '华文黑体'},
  {label: '华文楷体', value: '华文楷体'},
  {label: '华文隶书', value: '华文隶书'},
  {label: '华文新魏', value: '华文新魏'},
  {label: '华文行楷', value: '华文行楷'},
  {label: '华文中宋', value: '华文中宋'},
  {label: 'Arial', value: 'Arial'},
  {label: 'Segoe UI', value: 'Segoe UI'},
]
const fontTitles = [
  {label: '正文', value: null},
  {label: '标题1', value: 'first'},
  {label: '标题2', value: 'second'},
  {label: '标题3', value: 'third'},
  {label: '标题4', value: 'fourth'},
  {label: '标题5', value: 'fifth'},
  {label: '标题6', value: 'sixth'}
]
const pageSizes = [
  {label: 'A4', value: [794, 1123]},
  {label: 'A2', value: [1593, 2251]},
  {label: 'A3', value: [1125, 1593]},
  {label: 'A5', value: [565, 796]},
  {label: '5号信封', value: [412, 488]},
  {label: '6号信封', value: [450, 866]},
  {label: '7号信封', value: [609, 862]},
  {label: '9号信封', value: [862, 1221]},
  {label: '法律用纸', value: [813, 1266]},
  {label: '信纸', value: [813, 1054]}
]
const lineMgs = [1, 1.25, 1.5, 1.75, 2, 2.5, 3]
const pagePadding = [
  {label: '无边距', size: [0, 0, 0, 0]},
  {label: '窄', size: [48, 48, 48, 48]},
  {label: '常规', size: [96, 72, 96, 72]},
  {label: '中等', size: [96, 120, 96, 120]},
  {label: '宽', size: [96, 192, 96, 192]},
  // {label: '自定义', size: [0, 0, 0, 0]}
]
//水印设置
const watermark = reactive({
  data: null,
  color: '#000000',
  size: 50,
  font: fontTypes[0].value,
  repeat: false
})
const link = reactive({
  label: '',
  url: '',
})

const config = reactive({
  fontColor: '#000000',
})

const tdBgc = '#E6E6E6'

//提取所有人员节点
const nodeList = computed(() => {
  const list = []
  forEachProcessNode(props.process, node => {
    if (isUserNode(node)) {
      list.push({id: node.id, name: node.name})
    }
  })
  return list
})

const html = ref('')
const pos = ref({x: 0, y: 0})
const wordCount = ref(0)
//选中的区域元素样式
const selected = ref({
  bold: false,
  color: null,
  dashArray: [],
  font: "Microsoft YaHei",
  fontSize: null,
  fontType: null,
  extension: null,
  fillStyle: null,
  groupIds: null,
  highlight: null,
  italic: false,
  level: null,
  listStyle: null,
  listType: null,
  painter: false,
  redo: false,
  rowFlex: null,
  rowMargin: 1,
  size: 16,
  strikeout: false,
  textDecoration: null,
  type: "text",
  underline: false,
  undo: true
})

onMounted(() => {
  let config = toRaw(props.config)
  if (!config || !config?.data) {
    config = {
      version: '0.9.104',
      data: defaultData,
      options: {
        placeholder: '请输入内容或从左侧拖拽字段过来以构造模板'
      }
    }
  }
  try {
    editor = new Editor(WPrinter.value, config.data, config.options)
    editor.use(floatingToolbarPlugin)
    editor.use(barcode1DPlugin)
    editor.use(barcode2DPlugin)
    editor.use(codeblockPlugin)
    editor.use(docxPlugin)
    editor.use(diagramPlugin)
    //初始化事件监听
    eventInit()
    window.editor = editor
  } catch (e) {
  }
})

onBeforeUnmount(() => editor?.destroy())

const fields = computed(() => {
  return [
    {
      name: '系统字段',
      fields: [
        {name: '流水号', type: 'text', valueType: ValueType.string, symbol: 'instId'},
        {name: '发起人', type: 'text', valueType: ValueType.string, symbol: 'instUserName'},
        {name: '发起部门', type: 'text', valueType: ValueType.string, symbol: 'instDeptName'},
        {name: '流程名称', type: 'text', valueType: ValueType.string, symbol: 'instName'},
        {name: '流程标题', type: 'text', valueType: ValueType.string, symbol: 'instTitle'},
        {name: '流程编号', type: 'text', valueType: ValueType.string, symbol: 'instCode'},
        {name: '发起时间', type: 'text', valueType: ValueType.string, symbol: 'instCreateTime'},
        {name: '结束时间', type: 'text', valueType: ValueType.string, symbol: 'instEndTime'},
        {name: '流程状态描述', type: 'text', valueType: ValueType.string, symbol: 'instStatusName'},
        {name: '流程版本', type: 'text', valueType: ValueType.string, symbol: 'instVer'},
        {name: '流程二维码', type: 'instQr', valueType: ValueType.image, symbol: 'instIdQrCode'},
        {name: '打印时间', type: 'text', valueType: ValueType.string, symbol: 'instPrintTime'},
      ]
    },
    {
      name: '表单字段',
      fields: formFields.value
          .filter(v => v.valueType !== ValueType.none && !v.parent)
          .map(v => {
            return {
              name: v.name,
              type: v.type,
              valueType: v.valueType,
              symbol: v.key,
              columns: v.props?.columns
            }
          })
    },
    {
      name: '流转记录',
      fields: [{
        name: '全部记录',
        type: 'NodeRecords',
        valueType: ValueType.objArray,
        symbol: 'nodeRecords'
      }]
    },
    //TODO：预留后续使用
   /* {
      name: '节点记录',
      fields: nodeList.value.map(v => {
        return {
          name: v.name,
          type: 'Node',
          valueType: ValueType.objArray,
          symbol: v.id
        }
      })
    }*/
  ]
})

const fontType = computed(() => {
  const i = fontTypes.findIndex(v => v.value === selected.value.font)
  return i > -1 ? fontTypes[i].label : '?'
})

const fontSize = computed(() => {
  const i = fontSizes.findIndex(v => v.value === selected.value.size)
  return i > -1 ? fontSizes[i].label : '?'
})

const fontTitle = computed(() => {
  const i = fontTitles.findIndex(v => v.value === selected.value.level)
  return i > -1 ? fontTitles[i].label : '?'
})

const nodeRecordCols = [
  {name: '节点名称', key: 'nodeName'},
  {name: '处理人', key: 'nodeAssignee'},
  {name: '处理结果', key: 'nodeResult'},
  {name: '评论意见', key: 'nodeComment'},
  {name: '处理时间', key: 'nodeEndTime'}
]

async function eventInit() {
  wordCount.value = await editor.command.getWordCount()
  editor.listener.contentChange = async () => {
    wordCount.value = await editor.command.getWordCount()
  }
  editor.listener.zoneChange = (data) => {
  }
  editor.listener.saved = (val) => {
    html.value = editor.command.getHTML().main
  }
  editor.listener.rangeStyleChange = (payload) => {
    selected.value = payload
  }
}

function cmd(fuc, args) {
  editor.command[fuc](args)
}

function insertImgCode(isQr) {
  const type = isQr ? '二维码' : '条形码'
  ElMessageBox.prompt(`请输入要生成${type}的内容`, `生成${type}`, {
    confirmButtonText: '生成并插入',
    cancelButtonText: '取消',
    inputPattern: isQr ? /^[\s\S]{2,100}$/ : /^[a-z0-9]{2,40}/i,
    inputPlaceholder: `请输入${type}信息`,
    inputErrorMessage: '请正确输入内容',
  }).then(({value}) => {
    if (isQr) {
      editor.command.executeInsertBarcode2D(value, 120, 120)
    } else {
      editor.command.executeInsertBarcode1D(value, 200, 100)
    }
  })
}

function insertWatermark() {
  watermarkDialog.value = false
  const _watermark = Object.assign({}, watermark)
  editor.command.executeAddWatermark(_watermark)
}

function importDoc() {
  const file = fileInput.value.files[0]; // Get the selected file
  if (!file) {
    ElMessage.warning('未选择文件')
    return;
  }
  const reader = new FileReader();
  reader.onload = function (event) {
    editor.command.executeImportDocx({arrayBuffer: event.target.result})
  };
  reader.readAsArrayBuffer(file);
}

function getValue() {
  //新版本移除了默认导出id字段，需要显式定义保留
  return editor.command.getValue({extraPickAttrs: ['id', '_type', '_key']})
}

function getColumn(col) {
  const isImgs = col.valueType === ValueType.imageArray
  if (col.valueType === ValueType.image || isImgs) {
    //表格内嵌图片数据
    return [{
      _key: col.key,
      _type: col.valueType,
      width: 80,
      height: isImgs ? 80 : 40,
      type: ElementType.IMAGE,
      value: `/image/${isImgs ? 'img-occupy' : 'sign-occupy'}.png`,
      imgDisplay: ImageDisplay.BLOCK
    }]
  } else {
    return [{
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: col.key,
        type: ControlType.TEXT,
        value: '',
        placeholder: col.name
      }
    }]
  }
}

async function dragField(field, event) {
  switch (field.type) {
    case 'NodeRecords':
      insertNodeRecords(field)
      break;
    case 'Node': //插入节点审批信息，名字、签名、评论
      insertRecordNode(field)
      break;
    case 'instQr':
      editor.command.executeImage({
        id: field.symbol,
        _key: field.symbol,
        _type: ValueType.image,
        width: 100,
        height: 100,
        value: '/image/code.png',
        imgDisplay: ImageDisplay.BLOCK
      })
      break
    case 'Signature':
      editor.command.executeInsertElementList([{
        id: field.symbol,
        _key: field.symbol,
        _type: field.valueType,
        width: 120,
        height: 60,
        type: ElementType.IMAGE,
        value: '/image/sign-occupy.png',
        imgDisplay: ImageDisplay.BLOCK
      }])
      break;
    case 'FormList':
    case 'TableList': //针对表格做处理
      const option = editor.command.getOptions()
      const colWidth = (option.width - 2 * option.margins[1]) / field.columns.length
        const aa = [{
          type: ElementType.TABLE,
          value: '',
          id: field.symbol,
          _key: field.symbol,
          _type: field.type,
          disabled: true,
          colgroup: field.columns.map(() => {
            return {width: colWidth}
          }),
          trList: [
            {
              height: 30,
              tdList: field.columns.map(col => {
                return {
                  backgroundColor: tdBgc,
                  colspan: 1,
                  rowspan: 1,
                  value: [{value: col.name, size: 16}]
                }
              })
            },
            {
              height: 30,
              tdList: field.columns.map(col => {
                return {
                  colspan: 1,
                  rowspan: 1,
                  value: getColumn(col)
                }
              })
            },
          ]
        }]
      editor.command.executeInsertElementList(aa)
      break
    default:
      switch (field.valueType) {
          //单张/多张图片
        case ValueType.image:
        case ValueType.imageArray:
          editor.command.executeInsertElementList([{
            id: field.symbol,
            _key: field.symbol,
            _type: field.valueType,
            width: 100,
            height: 100,
            value: '/image/img-occupy.png',
            imgDisplay: ImageDisplay.BLOCK,
            type: ElementType.IMAGE
          }])
          break;
          //其他情况
        default:
          editor.command.executeInsertElementList([{
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: field.symbol,
              type: ControlType.TEXT,
              value: '',
              placeholder: field.name
            }
          }])
          break;
      }
      break;
  }
}

function insertNodeRecords(field) {
  const options = editor.command.getOptions()
  const colWidths = (options.width - 2 * options.margins[1]) / nodeRecordCols.length
  editor.command.executeInsertElementList([{
    type: ElementType.TABLE,
    value: '',
    id: field.symbol,
    _key: field.symbol,
    _type: field.type,
    conceptId: field.type,
    disabled: true,
    colgroup: nodeRecordCols.map(col => {
      return {width: colWidths}
    }),
    trList: [
      {
        height: 30,
        tdList: nodeRecordCols.map(col => {
          return {
            colspan: 1,
            rowspan: 1,
            backgroundColor: tdBgc,
            value: [{value: col.name}]
          }
        })
      },
      {
        height: 30,
        tdList: nodeRecordCols.map(col => {
          const td = [{
            type: ElementType.CONTROL,
            control: {
              conceptId: col.key,
              type: ControlType.TEXT,
              value: '',
              placeholder: col.name
            }
          }]
          if (col.key === 'nodeResult') {
            td.push({
              _key: 'nodeSignature',
              _type: ValueType.image,
              width: 50,
              height: 25,
              type: ElementType.IMAGE,
              value: '/image/sign.png',
              imgDisplay: ImageDisplay.BLOCK
            })
          }
          return {
            colspan: 1,
            rowspan: 1,
            value: td
          }
        })
      },
    ]
  }])
}

function insertRecordNode(field) {
  editor.command.executeInsertElementList([
    {conceptId: '$node_begin', value: '[[', type: ElementType.TEXT},
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '$node_user',
        type: ControlType.TEXT,
        value: '',
        placeholder: `${field.name}`
      }
    },
    {value: '：', type: ElementType.TEXT},
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '$node_result',
        type: ControlType.TEXT,
        value: '',
        placeholder: '处理结果'
      }
    },
    {value: '  ', type: ElementType.TEXT},
    {
      _key: '$node_sign',
      width: 50,
      height: 25,
      type: ElementType.IMAGE,
      value: '/image/sign.png',
      imgDisplay: ImageDisplay.BLOCK
    },
    {value: '  ', type: ElementType.TEXT},
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '$node_comment',
        type: ControlType.TEXT,
        value: '',
        placeholder: '评论意见'
      }
    },
    {value: '  ', type: ElementType.TEXT},
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '$node_time',
        type: ControlType.TEXT,
        value: '',
        placeholder: '完成时间'
      }
    },
    {conceptId: '$node_end', value: ']]', type: ElementType.TEXT},
    {value: '\n', type: ElementType.TEXT}
  ])
}

function insertLink() {
  linkDialog.value = true
}

function insertImage() {
  ElMessageBox.prompt('请输入图片地址', '插入图片', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^https?:\/\/.+/i,
    inputPlaceholder: '请输入图片地址',
    inputErrorMessage: '请正确输入图片地址',
  }).then(({value}) => {
    editor.command.executeImage({
      width: 100,
      height: 100,
      imgDisplay: ImageDisplay.BLOCK,
      value: value,
    })
  })
}

function uploadImage() {

}

function insertLinkOk() {
  formRef.value.validate().then(res => {
    linkDialog.value = false
    editor.command.executeHyperlink({
      type: ElementType.HYPERLINK,
      value: '',
      url: link.url,
      valueList: splitText(link.label).map(n => ({
        value: n,
        size: 16
      }))
    })
  }).catch(err => {
    ElMessage.error('请正确填写信息')
  })
}

function setPagePadding(pd) {
  editor.command.executeSetPaperMargin(pd.size)
}

function doScale(zoom) {
  if ((scale.value < 0.5 && zoom < 0) || (scale.value > 3 && zoom > 0)) {
    ElMessage.warning("缩放已经到极限了😥")
  } else {
    scale.value += zoom
    editor.command.executePageScale(scale.value)
  }
}
</script>

<template>
  <el-scrollbar class="w-print-designer">
    <div style="width: 100%; display: flex; justify-content: center" editor-component="menu">
      <div class="w-print-tools w-icon-btn-group" v-if="showTools && !readonly">
        <icon-btn :disabled="!selected.undo" title="撤销" icon="mdi:undo" @click="editor.command.executeUndo()"/>
        <icon-btn :disabled="!selected.redo" title="重做" icon="mdi:redo" @click="editor.command.executeRedo()"/>
        <icon-btn :active="selected.painter" title="格式刷" icon="mdi:format-paint" @click="cmd('executePainter')"/>
        <icon-btn title="清除格式" icon="carbon:erase" @click="editor.command.executeFormat()"/>
        <el-divider direction="vertical"/>
        <el-dropdown trigger="click">
      <span class="w-flex-ct-op">
        <el-text>{{ fontType }}</el-text>
        <el-icon><CaretBottom/></el-icon>
      </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :style="{'font-family': ft.value}" :key="ft.value" v-for="ft in fontTypes"
                                @click="cmd('executeFont', ft.value)">
                {{ ft.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click">
      <span class="w-flex-ct-op">
        <el-text>{{ fontSize }}</el-text>
        <el-icon><CaretBottom/></el-icon>
      </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :key="fs.value" v-for="fs in fontSizes" @click="editor.command.executeSize(fs.value)">
                {{ fs.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <icon-btn title="字号增加" icon="mdi:format-annotation-plus" @click="cmd('executeSizeAdd')"/>
        <icon-btn title="字号减小" icon="mdi:format-annotation-minus" @click="cmd('executeSizeMinus')"/>
        <icon-btn title="加粗" icon="mdi:format-bold" @click="editor.command.executeBold()"/>
        <icon-btn title="倾斜" icon="mdi:format-italic" @click="editor.command.executeItalic()"/>
        <icon-btn title="下划线" icon="tabler:underline" @click="editor.command.executeUnderline()"/>
        <icon-btn title="删除线" icon="mdi:format-strikethrough-variant" @click="editor.command.executeStrikeout()"/>
        <icon-btn title="下标" icon="mdi:format-subscript" @click="editor.command.executeSubscript()"/>
        <icon-btn title="上标" icon="mdi:format-superscript" @click="editor.command.executeSuperscript()"/>
        <div style="display:flex; align-items: center; padding: 0 5px">
          <iconify icon="material-symbols:format-color-text" @click="fontColorRef.show()"/>
          <el-color-picker ref="fontColorRef" :model-value="selected.color"
                           size="small" @change="v => cmd('executeColor', v)"/>
        </div>
        <div style="display:flex; align-items: center; padding: 0 5px">
          <iconify icon="material-symbols:format-color-fill" @click="fontBgColorRef.show()"/>
          <el-color-picker ref="fontBgColorRef" :model-value="selected.highlight"
                           size="small" @change="v => cmd('executeHighlight', v)"/>
        </div>
        <el-dropdown trigger="click">
      <span class="w-flex-ct-op">
        <el-text>{{ fontTitle }}</el-text>
        <el-icon><CaretBottom/></el-icon>
      </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :key="fh.value" v-for="fh in fontTitles" @click="cmd('executeTitle', fh.value)">
                {{ fh.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <icon-btn title="左对齐" icon="mdi:format-align-left" @click="editor.command.executeRowFlex('left')"/>
        <icon-btn title="居中对齐" icon="mdi:format-align-center" @click="editor.command.executeRowFlex('center')"/>
        <icon-btn title="右对齐" icon="mdi:format-align-right" @click="editor.command.executeRowFlex('right')"/>
        <icon-btn title="两端对齐" icon="mdi:format-align-justify" @click="editor.command.executeRowFlex('alignment')"/>
        <icon-btn title="分散对齐" icon="material-symbols:format-letter-spacing"
                  @click="editor.command.executeRowFlex('justify')"/>
        <el-dropdown trigger="click">
          <div>
            <icon-btn size="19" title="行间距" icon="material-symbols:format-line-spacing"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="v in lineMgs" @click="editor.command.executeRowMargin(v)">{{ v }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click">
          <div>
            <icon-btn size="19" title="插入列表" icon="material-symbols:format-list-numbered-rounded"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="editor.command.executeList(ListType.OL, ListStyle.DISC)">
                <span>有序 &nbsp1._____</span>
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeList(ListType.UL, ListStyle.CHECKBOX)">
                <span>复选 <input :value="true" style="width: 10px;" type="checkbox"/>_____</span>
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeList(ListType.UL, ListStyle.SQUARE)">
            <span class="w-flex-col-ct">方块
              <div
                  style="display:inline-block; border: 1px solid black; width: 6px; height: 6px; margin: 0 5px 0 10px"></div>
              _____
            </span></el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeList(ListType.UL, ListStyle.DECIMAL)">
            <span class="w-flex-col-ct">实心
              <div
                  style="display:inline-block; background: black; width: 8px; height: 8px; border-radius: 50%; margin: 0 5px 0 10px"></div>
              _____
            </span>
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeList(ListType.UL, ListStyle.CIRCLE)">
            <span class="w-flex-col-ct">空心
              <div
                  style="display:inline-block; border: 1px solid black; width: 6px; height: 6px; border-radius: 50%; margin: 0 5px 0 10px"></div>
              _____
            </span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-divider class="w-exclude" direction="vertical"/>
        <el-popover width="180" trigger="click">
          <el-text>{{ pos.y }}行 {{ pos.x }}列 （单击确定）</el-text>
          <table @mouseleave="pos.x = 0; pos.y = 0">
            <tbody>
            <tr v-for="r in 10">
              <td v-for="c in 10" @mouseover="pos.y = r; pos.x = c"
                  @click="editor.command.executeInsertTable(r, c)"
                  :class="{'w-table-rs': pos.x >= c && pos.y >= r}"></td>
            </tr>
            </tbody>
          </table>
          <template #reference>
            <iconify title="插入表格" icon="mdi:table"/>
          </template>
        </el-popover>
        <el-dropdown trigger="click">
          <div>
            <icon-btn title="插入图片" icon="material-symbols:imagesmode-outline-rounded"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="insertImage">
                插入网络图片
              </el-dropdown-item>
              <el-dropdown-item @click="uploadImage">
                上传本地图片
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <icon-btn title="插入链接" icon="mdi:link-variant-plus" @click="insertLink"/>
        <el-dropdown trigger="click">
          <div>
            <icon-btn size="19" title="分割线" icon="material-symbols:line-style"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="editor.command.executeSeparator([0,0])">
                实线
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeSeparator([1,1])">
                点线
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeSeparator([3,1])">
                虚线
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click">
          <div>
            <icon-btn size="19" title="水印" icon="material-symbols:branding-watermark"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="watermarkDialog = true">
                + 添加水印
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executeDeleteWatermark()">
                × 删除水印
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <icon-btn title="插入分页符" icon="mdi:format-page-break" @click="editor.command.executePageBreak()"/>
        <el-divider class="w-exclude" direction="vertical"/>
        <icon-btn title="导入word文档" icon="mdi:file-document-plus-outline" @click="fileInput.click()"/>
        <icon-btn title="导出word文档" icon="mdi:file-export-outline"
                  @click="editor.command.executeExportDocx({fileName: '导出.decx'})"/>
        <icon-btn title="插入条形码" icon="mdi:barcode-scan" @click="insertImgCode(false)"/>
        <icon-btn title="插入二维码" icon="mdi:qrcode" @click="insertImgCode(true)"/>
        <icon-btn title="插入代码块" icon="mdi:code-json"/>
        <el-divider class="w-exclude" direction="vertical"/>
        <icon-btn title="搜索/替换" icon="mdi:text-box-search-outline"/>
        <icon-btn title="打印/预览" icon="mdi:printer-outline" @click="editor.command.executePrint()"/>
      </div>
    </div>
    <input type="file" @change="importDoc" ref="fileInput" accept=".doc,.docx" style="display: none;"/>
    <div editor-component="menu">
      <el-scrollbar class="w-print-vars" height="calc(100vh - 180px)">
        <div v-for="(group, i) in fields" :key="i" style="padding-bottom: 10px">
          <el-text>{{ group.name }}</el-text>
          <div class="w-print-fields">
            <div v-for="field in group.fields" :key="field.symbol" draggable="true" @dragend="dragField(field, $event)">
              {{ field.name }}
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div ref="WPrinter" class="w-print-pages"></div>
    <div class="w-print-footer" v-if="showTools && !readonly">
      <div class="w-icon-btn-group">
        <icon-btn title="页面间隔" icon="mdi:book-open-page-variant"/>
        <div class="w-exclude">
          <el-text size="small">显示页码</el-text>
          <el-text size="small">页面：2/3</el-text>
          <el-text size="small">字数：{{ wordCount }}</el-text>
        </div>
      </div>
      <el-text size="small">编辑模式</el-text>
      <div class="w-icon-btn-group">
        <icon-btn title="缩小" icon="mdi:minus-thick" @click="doScale(-0.1)"/>
        <el-text class="w-exclude" size="small">{{ parseInt(scale * 100) }}%</el-text>
        <icon-btn title="放大" icon="mdi:plus-thick" @click="doScale(0.1)"/>
        <el-dropdown trigger="click">
          <div>
            <icon-btn title="纸张大小" icon="radix-icons:dimensions"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="ps in pageSizes"
                                @click="editor.command.executePaperSize(ps.value[0], ps.value[1])">{{ ps.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click">
          <div>
            <icon-btn title="纸张方向" icon="mdi:phone-rotate-landscape" @click=""/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="editor.command.executePaperDirection(PaperDirection.HORIZONTAL)">
                横向
              </el-dropdown-item>
              <el-dropdown-item @click="editor.command.executePaperDirection(PaperDirection.VERTICAL)">
                纵向
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click">
          <div>
            <icon-btn title="页边距" icon="fluent:document-border-32-regular"/>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="pd in pagePadding" @click="setPagePadding(pd)">
                {{ pd.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <icon-btn title="全屏" icon="mdi:fullscreen"/>
        <icon-btn title="编辑器设置" icon="mdi:cog-outline"/>
      </div>
    </div>
  </el-scrollbar>

  <w-dialog close-free width="400px" v-model="watermarkDialog" title="插入水印" @ok="insertWatermark">
    <el-form>
      <el-form-item label="效果预览">
        <div :style="{'font-family': watermark.font, 'font-size': watermark.size + 'px', color: watermark.color}">
          {{ watermark.data }}
        </div>
      </el-form-item>
      <el-form-item label="水印内容">
        <el-input v-model="watermark.data" placeholder="请输入水印内容"/>
      </el-form-item>
      <el-form-item label="字体样式">
        <el-select v-model="watermark.font" placeholder="选择水印字体">
          <el-option :value="ft.value" :key="ft.value" v-for="ft in fontTypes">
            <span :style="{'font-family': ft.value}">{{ ft.label }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="水印大小">
        <el-input-number :min="5" :max="50" v-model="watermark.size" placeholder="请输入水印大小"/>
      </el-form-item>
      <el-form-item label="水印颜色">
        <el-color-picker color-format="hex" show-alpha v-model="watermark.color"/>
      </el-form-item>
      <el-form-item label="重复水印">
        <el-switch v-model="watermark.repeat"/>
      </el-form-item>
    </el-form>
  </w-dialog>

  <w-dialog close-free width="400px" v-model="linkDialog" title="插入链接" @ok="insertLinkOk">
    <el-form ref="formRef" :model="link" label-position="left">
      <el-form-item prop="label" label="链接文字"
                    :rules="{type: 'string', required: true, message: '请输入链接文字', trigger: 'blur'}">
        <el-input style="width: 100%;" clearable v-model="link.label" placeholder="请输入链接文字"/>
      </el-form-item>
      <el-form-item prop="url" label="URL地址"
                    :rules="{pattern: /^(https?|ftp|file):\/\/([^\s]+)$/, required: true, message: '请输入正确的URL', trigger: 'blur'}">
        <el-input style="width: 100%;" clearable v-model="link.url" placeholder="请输入链接地址"/>
      </el-form-item>
    </el-form>
  </w-dialog>
</template>

<style scoped lang="less">
@tool-nav-height: 50px;
@tool-footer-height: 30px;

.w-flex-ct-op {
  display: flex;
  align-items: center;
  cursor: pointer
}

.w-print-vars {
  position: absolute;
  margin-top: 50px;
  padding-left: 10px;
  padding-right: 10px;
  user-select: none;

  .w-print-fields {
    & > div {
      padding: 5px 10px;
      width: 150px;
      cursor: grab;
      border-radius: 5px;
      margin: 5px;
      border: 1px solid var(--el-bg-color);
      background: var(--el-bg-color);

      &:hover {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
        border-color: var(--el-color-primary);
      }
    }
  }
}

.w-print-designer {
  position: relative;
  background: var(--el-bg-color-page);

  .is-selected {
    background: var(--el-fill-color-darker);
  }

  :deep(.el-color-picker) {
    .el-color-picker__trigger {
      padding: 0;
      height: 10px;
      width: 10px;
      border: none;

      .el-color-picker__color {
        border: none;
      }

      .el-color-picker__icon {
        display: none;
      }
    }
  }

  .w-print-tools {
    justify-content: center;
    top: 0;
    font-size: 18px;
    height: @tool-nav-height;
    line-height: @tool-nav-height;
  }

  .w-print-pages {
    display: flex;
    justify-content: center;
    padding-top: @tool-nav-height;
    padding-bottom: @tool-footer-height;

    :deep(.ce-page-container) {
      box-shadow: 0 0 10px 0 #cbc9c9;
    }
  }

  .w-print-footer {
    width: calc(100% - 40px);
    bottom: 0;
    height: @tool-footer-height;
    line-height: @tool-footer-height;
    justify-content: space-between;

    & > div {
      display: flex;
      align-items: center;
    }
  }

  .w-print-tools, .w-print-footer {
    z-index: 1;
    padding: 0 20px;
    position: absolute;
    background: var(--el-bg-color-page);
    display: flex;
    align-items: center;
  }

  .w-icon-btn-group {
    & > :not(.w-exclude) {
      padding: 5px;
      border-radius: 5px;
      margin: 0 2px;
      cursor: pointer;

      &:hover {
        background: var(--el-fill-color-darker);
      }
    }
  }
}

.w-table-rs {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

td {
  width: 10px;
  height: 10px;
  border: 1px solid var(--el-border-color-darker);
}
</style>
