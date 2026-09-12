import Type from '../ValueType'

export default [
  {
    name: '布局组件',
    components: [
      {
        icon: 'tabler:layout-columns',
        type: 'SpanLayout',
        name: '分栏布局',
        valueType: Type.none,
        props: {
          isContainer: true,
          span: 24,
          number: 2,
          gutter: 5,
          columns: []
        }
      },
      {
        icon: 'lets-icons:table',
        type: 'TableLayout',
        name: '表格布局',
        valueType: Type.none,
        props: {
          isContainer: true,
          fonts: [],
          heights: [40, 40], //每行高px
          widths: [50, 50], //每列宽%
          borderColor: '#3C3F41', //边框颜色
          borderWidth: 1, //边框粗细
          cellSpans: [ //单元格占位，与columns对应
            [{row: 1, col: 1}, {row: 1, col: 1}],
            [{row: 1, col: 1}, {row: 1, col: 1}],
          ],
          columns: [[[], []], [[], []]] //表格的每行[每个单元格]
        }
      }
    ]
  },
  {
    name: '基础组件',
    components: [
      {
        icon: 'iconamoon:edit',
        type: 'TextInput',
        name: '单行输入框',
        valueType: Type.string,
        props: {
          required: false,
          length: [0, null],
          regex: {
            exp: null,
            error: null
          }
        }
      },
      {
        name: '多行输入框',
        type: 'TextareaInput',
        icon: 'solar:list-down-line-duotone',
        valueType: Type.string,
        props: {
          required: false,
          max: 255
        }
      },
      {
        name: '数字输入框',
        type: 'NumberInput',
        icon: 'tabler:123',
        key: null,
        valueType: Type.number,
        props: {
          required: false,
          precision: 0
        }
      },
      {
        name: '评分',
        type: 'Score',
        icon: 'fluent:star-12-regular',
        valueType: Type.number,
        props: {
          required: false,
          color: '#f0a732',
          max: 5,
          showScore: true,
          enableHalf: false,
          icon: 'StarFilled',
        }
      },
      {
        name: '单选',
        type: 'SinglePicker',
        icon: 'mdi:radiobox-marked',
        valueType: Type.option,
        props: {
          required: false,
          expanding: false,
          optionType: 'static',
          static: [{label: '选项1', value: '选项1'}],
          dictKey: null,
          http: {}
        }
      },
      {
        name: '多选',
        type: 'MultiplePicker',
        icon: 'mingcute:multiselect-line',
        valueType: Type.options,
        props: {
          required: false,
          expanding: false,
          optionType: 'static',
          static: [{label: '选项1', value: '选项1'}],
          dictKey: null,
          http: {}
        }
      },
      {
        name: '日期时间点',
        type: 'DateTimePicker',
        icon: 'material-symbols:calendar-month-outline',
        valueType: Type.dateTime,
        props: {
          required: false,
          format: 'YYYY-MM-DD HH:mm'
        }
      },
      {
        name: '日期时间段',
        type: 'DateTimeRangePicker',
        icon: 'material-symbols:calendar-clock-outline',
        valueType: Type.dateTimeRange,
        props: {
          required: false,
          placeholder: ['开始时间', '结束时间'],
          format: 'YYYY-MM-DD HH:mm',
          showLength: false
        }
      },
      {
        name: '时间点',
        type: 'TimePicker',
        icon: 'gridicons:time',
        valueType: Type.time,
        props: {
          required: false
        }
      },
      {
        name: '时间段',
        type: 'TimeRangePicker',
        icon: 'zmdi:time-interval',
        valueType: Type.timeRange,
        props: {
          required: false,
          placeholder: ['开始时间', '结束时间'],
          showLength: false
        }
      },
      {
        name: '人员选择',
        type: 'UserPicker',
        icon: 'gravity-ui:persons',
        valueType: Type.orgArray,
        props: {
          required: false,
          multiple: false
        }
      },
      {
        name: '部门选择',
        type: 'DeptPicker',
        icon: 'fluent:organization-24-regular',
        valueType: Type.orgArray,
        props: {
          required: false,
          multiple: false
        }
      },
      {
        name: '上传图片',
        type: 'ImageUpload',
        icon: 'mingcute:pic-2-line',
        valueType: Type.imageArray,
        props: {
          required: false,
          enablePrint: true,
          maxSize: 5, //图片最大大小MB
          maxNumber: 10, //最大上传数量
          enableZip: true, //图片压缩后再上传
          abstract: false
        }
      },
      {
        name: '上传附件',
        type: 'FileUpload',
        icon: 'material-symbols:folder-open-outline',
        valueType: Type.fileArray,
        props: {
          required: false,
          enablePrint: true,
          onlyRead: false, //是否只读，false只能在线预览，true可以下载
          maxSize: 100, //文件最大大小MB
          maxNumber: 10, //最大上传数量
          fileTypes: [], //限制文件上传类型
          abstract: false
        }
      },
      {
        name: '手机号',
        type: 'PhoneNumber',
        icon: 'bi:phone',
        valueType: Type.object,
        props: {
          required: false,
          enablePrint: true,
          abstract: false
        }
      },
      {
        name: '身份证号',
        type: 'IdCard',
        icon: 'mage:id-card',
        valueType: Type.string,
        props: {
          required: false,
          enablePrint: true,
          abstract: false,
          regex: {
            exp: '^(^[1-9]\\d{7}((0\\d)|(1[0-2]))(([0|1|2]\\d)|3[0-1])\\d{3}$)|(^[1-9]\\d{5}[1-9]\\d{3}((0\\d)|(1[0-2]))(([0|1|2]\\d)|3[0-1])((\\d{4})|\\d{3}[Xx])$)$',
            error: '请输入正确的身份证号'
          }
        }
      },
      {
        name: 'HTML',
        type: 'Html',
        icon: 'mingcute:code-line',
        valueType: Type.none,
        props: {
          code: '<h2>wflow工作流</h2>',
          height: 200,
          render: 'vue'
        }
      },
      {
        name: '分隔标签',
        type: 'LabelText',
        icon: 'mynaui:label',
        valueType: Type.none,
        props: {
          required: false,
          color: '#1989FA',
          hideLabel: true,
          showBgc: false,
          placeholder: '分隔内容',
        }
      },
      {
        name: '警示文字',
        type: 'AlertBlock',
        icon: 'line-md:alert',
        valueType: Type.none,
        props: {
          type: 'primary',
          closable: false,
          hideLabel: true,
          hideIcon: false,
          content: '铁铁，wflow简直太好用了😭'
        }
      },
      {
        name: '静态文字',
        type: 'Text',
        icon: 'mingcute:text-line',
        valueType: Type.none,
        props: {
          type: 'text',
          tag: 'div',
          align: 'left',
          fonts: [],
          hideLabel: true,
          content: 'wflow 屌爆了'
        }
      },
    ]
  },
  {
    name: '高级组件',
    components: [
      {
        name: '明细表格',
        type: 'TableList',
        icon: 'mdi:table',
        valueType: Type.objArray,
        props: {
          showSort: false,
          required: false,
          showBorder: true,
          showSummary: false,
          summaryColumns: [],
          maxSize: 0, //最大条数，为0则不限制
          columns:[], //列设置
          colWidths: {},
          summaryCols: []
        }
      },
      {
        name: '多项表单',
        type: 'FormList',
        icon: 'fluent:form-new-20-regular',
        valueType: Type.objArray,
        props: {
          allowPut: true, //允许
          required: false,
          maxSize: 0, //最大条数，为0则不限制
          columns:[], //列设置
          labelPosition: 'right',//标签位置
          labelWidth: 100,//标签宽度，
          size: 'default',
        }
      },
      {
        name: '富文本',
        type: 'RichText',
        icon: 'mdi:text-box-edit',
        valueType: Type.string,
        props: {
          required: false
        }
      },
      {
        name: '流程引用',
        type: 'InstQuote',
        icon: 'typcn:flow-children',
        valueType: Type.options,
        props: {
          required: false,
          addText: '选择流程',
          code: null //引用哪种流程的编号
        }
      },
      {
        name: '计算公式',
        type: 'CalcFormula',
        icon: 'pajamas:formula',
        valueType: Type.number,
        props: {
          explain: [], //表达式
          jsCode: '',
          precision: 2, //小数精度
          prefix: '',
          suffix: '',
          isCustom: false
        }
      },
      {
        name: '签字板',
        type: 'Signature',
        icon: 'majesticons:edit-pen-4',
        valueType: Type.image,
        props: {
          required: false,
          thickness: 2,
          btnText: '点击签字',
          color: '#000000'
        }
      },
      {
        name: '地理位置',
        type: 'Location',
        icon: 'carbon:location',
        valueType: Type.option,
        props: {}
      },
      {
        name: '省市区',
        type: 'Provinces',
        icon: 'icon-park-solid:local-pin',
        valueType: Type.string,
        props: {
          level: 3
        }
      },
      {
        name: 'Iframe网页',
        type: 'WebIframe',
        icon: 'mingcute:chrome-line',
        valueType: Type.none,
        props: {
          path: null
        }
      },
      {
        name: '万能组件',
        type: 'VueSfc',
        icon: 'la:vuejs',
        valueType: Type.all,
        props: {
          sfc: null,
          mbSfc: null
        }
      },
    ]
  },
]

