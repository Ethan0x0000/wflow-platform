<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import {useWflowStore} from "@/stores/modules/wflow.js";
import {ElAmap, ElAmapSearchBox, ElAmapMarker, ElAmapControlGeolocation, initAMapApiLoader} from '@vuemap/vue-amap';
import WDialog from "@/views/wflow/common/WDialog.vue";
import '@vuemap/vue-amap/dist/style.css'
import {isEmpty} from "@/utils/GlobalFunc.js";
import {ElMessage, useFormItem} from "element-plus";

const props = defineProps({
  ...FormComponentMixin.props
})
const {formItem} = useFormItem()
const emit = defineEmits([...FormComponentMixin.emits])
const _value = defineModel()
const dialog = ref(false)
const mapConfig = reactive({
  center: [121.59996, 31.197646],
  zoom: 14,
  position: {
    addr: '',
    zb: [117.120098, 36.6512],
  },
})
let geocoder = null

function initMap() {
  //防止组件重复初始化地图
  if (!useWflowStore().mapIsInit) {
    initAMapApiLoader({
      key: import.meta.env.VITE_AMAP_KEY,
      securityJsCode: import.meta.env.VITE_AMAP_SECRET,
      plugin: [
        'AMap.Autocomplete',
        "AMap.Geocoder",
        'AMap.Geolocation'
      ],
    })
    useWflowStore().mapIsInit = true
  }
}

function showMap() {
  initMap()
  if (_value.value?.label) {
    const pos = _value.value.value.split(',')
    mapConfig.position.addr = _value.value.label
    mapConfig.position.zb = pos
    mapConfig.center = pos
  }
  dialog.value = true
}

function selectPoi(e) {
  mapConfig.center = [e.poi.location.lng, e.poi.location.lat]
  mapConfig.position.zb = mapConfig.center
  resolveAddr(mapConfig.position.zb)
}

function initMapInst(map) {
   map.plugin('AMap.Geocoder', () => {
     geocoder = new AMap.Geocoder();
     //map.addControl(this.geocoder);
   })
}

function getLocation(e) {
}

function clickMap(e) {
  let {lng, lat} = e.lnglat
  mapConfig.center = [lng, lat]
  mapConfig.position.zb = [lng, lat]
  resolveAddr(mapConfig.position.zb)
}

function resolveAddr(pos) {
  geocoder.getAddress(pos, (status, result) => {
    if (status === 'complete' && result.info === 'OK') {
      if (result && result.regeocode) {
        mapConfig.position.addr = result.regeocode.formattedAddress
      }
    }
  })
}

function selectOk() {
  if (isEmpty(mapConfig.position.addr)) {
    ElMessage.warning('未选择/解析到地址')
    return
  }
  _value.value = {
    label: mapConfig.position.addr,
    value: `${mapConfig.position.zb[0]},${mapConfig.position.zb[1]}`
  }
  dialog.value = false
  formItem?.validate?.()
}
</script>

<template>
  <div class="w-location" v-if="mode !== 'V'">
    <template v-if="_value?.label">
      <el-text>{{_value.label}}</el-text>
      <el-icon v-if="mode === 'E'" @click="_value = null; formItem?.validate?.()" class="w-cleaner">
        <CircleClose />
      </el-icon>
    </template>
    <el-text v-else class="w-placeholder">{{config.props?.placeholder || '请选择位置'}}</el-text>
    <el-button :disabled="mode === 'R'" style="margin-left: 10px" icon="MapLocation" @click="showMap" round/>
  </div>
  <el-text v-else>{{_value?.label}}</el-text>
  <w-dialog v-model="dialog" :title="`选择地理位置: ${mapConfig.position.addr}`" @ok="selectOk">
    <div class="w-location-map">
      <el-amap :center="mapConfig.center" :zoom="mapConfig.zoom" @click="clickMap" @init="initMapInst">
        <el-amap-marker :visible="true" :position="mapConfig.center"/>
        <el-amap-search-box placeholder="输入地址关键字搜索" @select="selectPoi" :debounce="500"/>
        <el-amap-control-geolocation :visible="true" @complete="getLocation"/>
      </el-amap>
    </div>
  </w-dialog>
</template>

<style lang="less">

.w-location {
  display: flex;
  align-items: center;

  .w-cleaner {
    margin-left: 5px;
    cursor: pointer;
  }
}

.w-location-map {
  height: 350px;
  width: 100%;
}

.amap-sug-result {
  z-index: 9999;
}
</style>
