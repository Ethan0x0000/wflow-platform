//节点复用逻辑
export default {
  props: {
    config: {
      type: Object,
      default: () => {
        return {}
      }
    },
    index: Number,
    mode: {
      type: String,
      default: 'E' //组件模式: E 编辑模式, R 阅读模式，V 值模式
    },
    active: { //是否选中
      type: Object
    },
    modelValue: [Object, Number, Array, String]
  },
  computed: {
    _active: function (props, emit){
      return {
        get() {
          return props.active
        },
        set(val) {
          emit('update:active', val)
        }
      }
    },
    _value: function (props, emit){
      return {
        get() {
          return props.modelValue
        },
        set(val) {
          emit('update:modelValue', val)
        }
      }
    }
  },
  emits: ['update:modelValue', 'update:active', 'copy', 'delete'],
}
