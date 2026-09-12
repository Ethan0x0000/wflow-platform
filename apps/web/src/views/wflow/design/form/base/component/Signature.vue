<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WDialog from "../../../../common/WDialog.vue";
import SignaturePad from "signature_pad";
import {base64ImgToFormData, getRes, resizeBase64Img} from "@/utils/GlobalFunc.js";
import {uploadSign} from "@/api/instance.js";
import {useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const {formItem} = useFormItem()
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const visible = ref(false)
const randId = ref(Math.ceil(Math.random() * 10000))
let signaturePad = null

function initSign() {
  if (signaturePad) {
    signaturePad.clear()
  } else {
    let canvas = document.getElementById('signPanel' + randId.value)
    canvas.setAttribute('width', '650px')
    canvas.setAttribute('height', '300px')
    signaturePad = new SignaturePad(canvas, {
      penColor: props.config.props.color,
      minWidth: props.config.props.thickness,
      maxWidth: props.config.props.thickness + 2,
    })
    signaturePad.onEnd = () => {
      //this._value = this.signaturePad.toDataURL()
    }
  }
}
function resizeCanvas(canvas) {
  var ratio = Math.max(window.devicePixelRatio, 1, 1)
  canvas.width = canvas.offsetWidth * ratio
  canvas.height = canvas.offsetHeight * ratio
  canvas.getContext('2d').scale(ratio, ratio)
  signaturePad.clear()
}

function showSignPanel() {
  if (props.mode !== 'E') return
  visible.value = true
  nextTick(() => {
    initSign()
  })
}
function signOk() {
  visible.value = false
  if (!signaturePad.isEmpty()){
    resizeBase64Img(signaturePad.toDataURL(), 200, 100).then(data => {
      base64ImgToFormData(data, formData => {
        uploadSign(formData).then(res => {
          _value.value = `${res.data.url}?isSign=true`
        })
      })
    })
    formItem?.validate?.()
  }
}

</script>

<template>
  <div v-if="mode !== 'V'">
    <div v-if="(_value || '') !== ''">
      <img :src="getRes(_value)" style="cursor: pointer" @click="showSignPanel" width="30%" />
    </div>
    <template v-else>
      <el-button :disabled="mode === 'R'" icon="edit" @click="showSignPanel">
        {{config.props.btnText}}
      </el-button>
      <el-text class="w-placeholder">{{config.props.placeholder || ''}}</el-text>
    </template>
    <w-dialog title="请使用鼠标签字" width="700px" v-model="visible" @ok="signOk">
      <canvas :id="'signPanel' + randId"></canvas>
    </w-dialog>
  </div>
  <div v-else>
    <img :src="getRes(_value)" width="30%" />
  </div>
</template>

<style scoped>

</style>
