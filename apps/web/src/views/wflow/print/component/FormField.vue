<script setup>
import ValueType from "../../design/form/ValueType.js";
import {getRes, isEmpty} from "@/utils/GlobalFunc.js";
const WRichEditor = defineAsyncComponent(() => import("@/views/wflow/common/editor/WRichEditor.vue"));

const props = defineProps({
  config: {
    type: Object,
    default: () => {
      return {}
    }
  },
  permConf: {
    type: Object,
    default: () => {
      return {}
    }
  },
  value: [String, Number, Array, Object, Boolean]
})

</script>

<template>
  <span v-if="config.valueType === ValueType.option">
    {{ value?.label }}
  </span>
  <span v-else-if="config.valueType === ValueType.options">
    {{ (value || []).map(v => v.label).join('、') }}
  </span>
  <span v-else-if="config.valueType === ValueType.timeRange || config.valueType === ValueType.dateTimeRange">
    {{ (value || []).join(' ~ ') }}
  </span>
  <span v-else-if="config.valueType === ValueType.orgArray">
    {{ (value || []).map(v => v.name).join('、') }}
  </span>
  <span v-else-if="config.valueType === ValueType.imageArray">
    <template v-for="img in (value || [])">
      <img style="margin-right: 5px" :src="getRes(img.url) + '?zip=true'" width="80px" height="60px"/>
    </template>
  </span>
  <span v-else-if="config.valueType === ValueType.fileArray">
    <template v-for="file in (value || [])">
      <el-link icon="Document" :href="`${getRes(file.url)}?name=${file.name}&download=true`">{{ file.name }}</el-link>
    </template>
  </span>
  <span v-else-if="config.valueType ===  ValueType.image">
    <img v-if="value" :src="getRes(value)" width="20%"/>
  </span>
  <span v-else-if="config.valueType === ValueType.array">
    {{ Array.isArray(value) ? value.join('、') : (value || '') }}
  </span>
  <span v-else-if="config.type === 'PhoneNumber'">+{{ value?.prefix }} {{ value?.number }}</span>
  <span v-else-if="config.type === 'TableList' || config.type === 'FormList'">
    <table v-if="(value || []).length > 0">
      <tbody>
      <tr>
        <template v-for="col in config.props.columns">
          <td v-if="permConf[col.key] !== 'H'">{{ col.name }}</td>
        </template>
      </tr>
      <tr v-for="row in (value || [])">
        <template v-for="col in config.props.columns">
          <td v-if="permConf[col.key] !== 'H'">
            <form-field :perm-conf="permConf" :config="col" :value="row[col.key]"/>
          </td>
        </template>
      </tr>
      </tbody>
    </table>
  </span>
  <w-rich-editor v-else-if="config.type === 'RichText' && !isEmpty(value)"
                 readonly style="border: none" :model-value="value"/>
  <span v-else>{{ value || '' }}</span>
</template>

<style scoped lang="less">
table {
  font-size: 16px;
  width: 100%;
  border-collapse: collapse;
  padding: 2px;
}

table tr th,
table tr td {
  text-align: left;
  border: 1px solid #464648;
  padding: 5px 10px;
}
</style>
