import BaseFormComponents from "./base/BaseFormComponents.js";
import KitFormComponents from "./kits/KitFormComponents.js";

const Components = import.meta.glob('./*/component/*.vue')
const ComponentConfigs = import.meta.glob('./*/config/*.vue')

//批量导出所有的component下面的表单组件
export const FormComponents = {}
Object.keys(Components).forEach((key) => {
  const name = key.replace(/^.+\/([^/]+)\.vue$/, '$1')
  FormComponents[name] = defineAsyncComponent(Components[key])
})

export const FormComponentConfigs = {}
Object.keys(ComponentConfigs).forEach((key) => {
  const name = key.replace(/^.+\/([^/]+)\.vue$/, '$1')
  FormComponentConfigs[name] = defineAsyncComponent(ComponentConfigs[key])
})

//再次导出表单组件
export const KitComponents = KitFormComponents
export const BaseComponents = BaseFormComponents
