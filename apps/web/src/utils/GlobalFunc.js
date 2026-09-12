import {getRandNodeId, loadFormItem} from "@/utils/ProcessUtil.js";
import axios from "axios";
import {ElMessage} from "element-plus";
import {getDictData} from "@/api/common.js";
import ValueType, {validBaseType} from "@/views/wflow/design/form/ValueType.js";
import request from "@/api/request.js";
import { ref, onMounted, onUnmounted } from 'vue';
import {compileHook} from './form-runtime';

const BASE_URL = import.meta.env.VITE_APP_BASE_API

/**
 * 生成随机字符串
 * @param len 长度
 * @returns {string}
 */
export function generateStr(len) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < len; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * 简单的深拷贝
 * @param obj 被拷贝的对象
 * @returns {any}
 */
export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 判空函数
 * @param value
 * @returns {boolean}
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  else if (Array.isArray(value)) return value.length === 0;
  else if (typeof value === 'string') return value.trim() === '';
  else return false
}

/**
 * 获取后端资源地址
 * @param url 资源地址
 * @returns {string}
 */
export function getRes(url) {
  if (!url) return null
  // 兼容处理，如果url以/api/api开头，则替换为/api
  const _url = url.startsWith("http") ? url : BASE_URL + url
  return _url.replace(/\/api\/api/, '/api')
}

/**
 * 获取资源访问前缀，用于加了url前缀的情况
 * @returns {string|string}
 */
export function getResPrefix() {
  return import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL
}

export function getSysAvatar() {
  return getResPrefix() + '/image/logo.png'
}

/**
 * 获取wflow的 token
 * @returns {{}}
 */
export function getAuthHeader() {
  const header = {}
  header[import.meta.env.VITE_APP_TOKEN_NAME || 'wflowToken'] = localStorage.getItem('token')
  return header
}

export function delField(cols, i) {
  cols.splice(i, 1)
}

export function copyField(cols, i) {
  const col = deepCopy(cols[i])
  loadFormItem(col, [], null, (item, parent) => {
    item.id = 'wflow_' + generateStr(8)
    item.key = col.type + '_' + generateStr(8)
  })
  col.id = 'wflow_' + generateStr(8)
  col.key = col.type + '_' + generateStr(8)
  cols.push(col)
}

/**
 * 去抖动函数
 * @param call 回调函数
 * @param cycle 抖动时长
 * @returns {(function(...[*]): void)|*}
 */
export function $debounce(call, cycle = 1000) {
  var timer = null; // 创建一个用来存放定时器的变量
  let func = call
  return function (...args) {
    clearTimeout(timer); //只要触发就清除
    timer = setTimeout(() => {
      func.apply(this, args);
    }, cycle);
  };
}

/**
 * ajax下载文件
 * @param response axios响应
 */
export function ajaxDownload(response) {
  //根据响应头获取文件名称
  let blob = new Blob([response.data], {type: response.headers['content-type']});
  // 创建新的URL并指向File对象或者Blob对象的地址
  const blobURL = window.URL.createObjectURL(blob)
  // 创建a标签，用于跳转至下载链接
  const tempLink = document.createElement('a')
  tempLink.style.display = 'none'
  tempLink.href = blobURL
  const contentDisposition = response.headers['content-disposition'] || 'attachment;filename=Download';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1]
  const plain = /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1]
  tempLink.setAttribute('download', decodeURIComponent(encoded || plain || 'Download'))
  // 兼容：某些浏览器不支持HTML5的download属性
  if (typeof tempLink.download === 'undefined') {
    tempLink.setAttribute('target', '_blank')
  }
  // 挂载a标签
  document.body.appendChild(tempLink)
  tempLink.click()
  document.body.removeChild(tempLink)
  // 释放blob URL地址
  window.URL.revokeObjectURL(blobURL)
}

/**
 * 根据path获取值
 * @param obj 参数对象
 * @param path 取值表达式
 * @returns {*}
 */
export function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => {
    // 处理数组语法，如 [0]
    let match = key.match(/(\w+)|\[(\d+)\]/g);
    return match ? match.reduce((innerAcc, k) => {
      // 如果是数字（数组索引），则访问数组元素，否则访问对象属性
      return innerAcc && innerAcc[k.replace(/\[|\]/g, '')];
    }, acc) : acc;
  }, obj);
}

/**
 * 解析模板字符串
 * @param template 模板
 * @param ctx 上下文变量
 * @returns {*}
 */
export function resolveByTemplate(template, ctx) {
  return template.replace(/{(.*?)}/g, (match, path) => getValueByPath(ctx, path) || '')
}

/**
 * 判断字段是否要必填
 * @param required
 * @param perm
 * @returns {boolean}
 */
export function isRequired(required, perm) {
  return required && (perm === 'E' || perm === 'D')
}

export const addHeaders = (headers) => {
  headers.TenantId = '1' // 设置当前请求租户ID
  headers.wflowToken = localStorage.getItem('token')
  return headers
};

/**
 * 压缩base64图片
 * @param base64
 * @param maxWidth
 * @param maxHeight
 * @returns {Promise<unknown>}
 */
export function resizeBase64Img(base64, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      let newWidth = img.width * scale;
      let newHeight = img.height * scale;
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      // 转换回 base64 格式
      const resizedBase64 = canvas.toDataURL('image/png');
      resolve(resizedBase64);
    };
  })
}

/**
 * base64图片转文件
 *
 * @param base64 字符串
 * @param uploadFunc 上传函数
 */
export function base64ImgToFormData(base64, uploadFunc) {
  const binaryString = atob(base64.split(',')[1]);
  const byteArray = Uint8Array.from(binaryString, char => char.charCodeAt(0));
  const blob = new Blob([byteArray], {type: 'image/png'}); // 请根据实际类型调整
  const formData = new FormData();
  formData.append("file", blob, "image.png");
  uploadFunc(formData)
}

/**
 * 获取文件大小描述
 * @param size 大小
 * @returns {string}
 */
export function getSize(size) {
  if (size > 1048576) {
    return (size / 1048576).toFixed(1) + 'MB'
  } else if (size > 1024) {
    return (size / 1024).toFixed(1) + 'KB'
  } else {
    return size + 'B'
  }
}

/**
 * 打开下载文件地址
 * @param file 文件json对象
 */
export function download(file) {
  const url = `${getRes(file.url)}?download=true&name=${file.name}`
  window.open(url, '_blank')
}

/**
 * 复制内容函数
 * @param value 需要复制的值
 * @param callback 复制完成回调
 */
export function copyValue(value, callback) {
  const content = document.createElement('textarea')
  // 防止手机上弹出软键盘
  content.setAttribute('readonly', 'readonly')
  content.value = value
  document.body.appendChild(content)
  content.select()
  document.execCommand('copy')
  document.body.removeChild(content)
  if (callback) callback()
}

/**
 * 通过json表达式提取对象值
 * @param data 数据
 * @param expression 表达式
 * @returns 取到的值
 */
export function jsonPathExtract(data, expression) {
  if (isEmpty(expression)) return data
  try {
    let current = data; // 当前解析的对象
    // 匹配并解析表达式
    const segments = expression.split(/\.|:/); // 分割表达式
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.includes("[")) {
        // 处理数组索引，如 a[0]
        const [key, index] = segment.match(/([a-zA-Z_]\w*)\[(\d+)]/).slice(1);
        current = current[key][parseInt(index, 10)];
      } else if (expression.includes(":") && i === segments.length - 1) {
        // 处理 a:b，提取数组中所有 b 字段的值
        const field = segment; // 获取冒号后的字段名
        current = current.map(item => item[field]);
      } else {
        // 普通的对象字段，如 a.b
        current = current[segment];
      }
    }
    return current;
  } catch (error) {
    console.error("Error extracting data:", error.message);
    return undefined;
  }
}

/**
 * 获取参数的json对象
 * @param script 对象脚本
 * @param vars 上下文
 * @returns js请求参数对象
 */
export function getJsonBody(script, vars){
  if (isEmpty(script)) return []
  return JSON.parse(script)
}

/**
 * 获取输入式参数对象
 * @param params 参数对象配置[{name: '参数名', value: '参数值', isDynamic: true}]
 * @param vars 上下文
 * @returns js参数对象
 */
export function getParamObj(params, vars) {
  const obj = {}
  params.forEach(p => {
    try {
      obj[p.name] = p.isDynamic ? getSimpleVal(vars[p.value]) : p.value
    } catch (e) {}
  })
  return obj
}

// 获取简单值
export function getSimpleVal(obj) {
  if (isEmpty(obj)) return null
  if (typeof obj === 'object') return JSON.stringify(obj)
  return obj
}

/**
 * 加载选项组件的选项请求
 * @param vars 上下文
 * @param props 组件设置项props
 */
export function loadOptions(vars, props) {
  return new Promise((resolve, reject) => {
    switch (props.optionType) {
      case 'static':
        resolve(props.static)
        break
      case 'http':
        const requestConf = {
          url: props.http.url,
          method: props.http.method.toLowerCase(),
          headers: {
            ...getParamObj(props.http.headers, vars),
            'Content-Type': props.http.isJson ? 'application/json;charset=UTF-8':'application/x-www-form-urlencoded'
          },
          params: getParamObj(props.http.params, vars),
          data: getJsonBody(props.http.data, vars),
          bodyForms: getParamObj(props.http.bodyForms, vars)
        }
        if (!isEmpty(props.http.preJs)) {
          compileHook(['request', 'ctx'], props.http.preJs)(requestConf, vars)
        }
        //前置处理结束，转换非get类型的请求参数
        if (requestConf.method.toLowerCase() !== 'get') {
          requestConf.params = requestConf.bodyForms
        }
        axios.request(requestConf).then(res => {
          //构造选项
          const records = jsonPathExtract(res.data, props.http.dataPath)
          if (Array.isArray(records)){
            resolve(records.map(v => {
              return {
                label: jsonPathExtract(v, props.http.label),
                value: jsonPathExtract(v, props.http.value)
              }
            }))
          } else {
            reject('返回数据不是数组')
          }
        }).catch(err => {
          ElMessage.error("加载选项失败")
          reject(err)
        })
        break
      case 'datasource':
        resolve(vars[props.datasource] || [])
        break
      case 'dict':
        if (props.dictKey == null) return
        getDictData(props.dictKey).then(res => {
          resolve(res.data)
        }).catch(err => {
          ElMessage.error("加载字典选项失败")
          reject(err)
        })
        break
    }
  })
}

/**
 * 加载全局数据源
 * @param dsList 数据源配置
 * @param formData 表单数据
 * @param dsVars 数据源变量对象
 * @param callback 回调函数
 * @returns {Promise<void>}
 */
export async function loadDsVars(dsList, formData, dsVars, callback) {
  const globalRequests = []
  for (let i = 0; i < dsList.length; i++) {
    try {
      if (!dsList[i].async) {
        await doRequest(dsList[i], formData, dsVars, callback)
      } else {
        globalRequests.push(doRequest(dsList[i], formData, dsVars, callback))
      }
    } catch (err) {}
  }
  if (globalRequests.length > 0) await Promise.all(globalRequests)
  if (callback) callback(dsVars)
}

/**
 * 追加参数给url
 * @param url
 * @param params
 * @returns {*|string}
 */
export function appendParamsToUrl(url, params) {
  // 检查是否已经有参数
  const hasParams = url.includes('?');
  const paramString = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');
  if (!paramString) return url;
  return hasParams ? url + '&' + paramString : url + '?' + paramString;
}

/**
 * 执行表单数据源请求动作
 * @param dsConfig 数据源配置
 * @param formData 表单数据
 * @param dsVars 数据源变量对象
 * @returns {Promise<void>}
 */
async function doRequest(dsConfig, formData, dsVars) {
  const vars = {...formData, ...dsVars.value}
  const requestConf = {
    url: dsConfig.request.url,
    method: dsConfig.request.method.toLowerCase(),
    headers: {
      ...getParamObj(dsConfig.request.headers, vars),
      'Content-Type': dsConfig.request.isJson ? 'application/json;charset=UTF-8':'application/x-www-form-urlencoded'
    },
    params: getParamObj(dsConfig.request.params, vars),
    data: getJsonBody(dsConfig.request.data, vars),
    bodyForms: getParamObj(dsConfig.request.bodyForms, vars)
  }
  if (!isEmpty(dsConfig.request.preJs)) {
    compileHook(['request', 'ctx'], dsConfig.request.preJs)(requestConf, vars)
  }
  if (requestConf.method.toLowerCase() !== 'get'){
    //非get请求，转移参数到url
    requestConf.url = appendParamsToUrl(requestConf.url, requestConf.params)
    requestConf.params = requestConf.bodyForms
  }
  await axios.request(requestConf).then(res => {
    dsConfig.handler.forEach(handler => {
      if (handler.valueType === ValueType.options) {
        //分别提取标签和值
        const labels = jsonPathExtract(res.data, handler.labelPath)
        const values = jsonPathExtract(res.data, handler.valuePath)
        //合并标签和值
        const options = []
        for (let i = 0; i < (labels || []).length; i++) {
          options.push({label: labels[i], value: values[i]})
        }
        dsVars.value[handler.value] = options
      } else {
        dsVars.value[handler.value] = jsonPathExtract(res.data, handler.jsonPath)
      }
    })
  })
}

/**
 * 获取表单字段的校验规则
 * @param fields 表单的所有字段
 * @param validates 表单字段自定义校验函数
 * @param permConf 表单字段权限配置
 * @param mode 组件/表单模式，无权限配置时默认走mode
 * @returns 表单校验规则
 */
export function getFieldValidRules(fields, validates, permConf = {}, mode) {
  const rules = {}
  fields.forEach(field => {
    rules[field.key] = []
    //构造字段的校验规则
    if (isRequired(field.props.required, (permConf[field.key] || mode))) {
      const rule = {
        required: true,
        message: `请完成 ${field.name}`,
        trigger: 'blur'
      }
      //设置校验类型
      if (validBaseType[field.valueType]) rule.type = validBaseType[field.valueType]
      rules[field.key].push(rule)
    }
    if (field.props.regex && (field.props.regex.exp || '').trim().length > 0) {
      //判断如果有设置正则表达式，则构造校验规则
      rules[field.key].push({
        pattern: new RegExp(field.props.regex.exp),
        message: field.props.regex.error,
        trigger: 'blur'
      })
    }
    //如果存在表单校验函数，那么把函数注入到校验规则中
    if (validates.value && validates.value[field.key] instanceof Function) {
      rules[field.key].push({
        validator: validates.value[field.key],
        trigger: 'blur'
      })
    }
    if (field.props.length && Array.isArray(field.props.length)) {
      const len = field.props.length
      if (!isEmpty(len[0])) {
        if (!isEmpty(len[1])) {
          rules[field.key].push({
            min: parseInt(len[0] || 0),
            max: parseInt(len[1]),
            message: `长度应为 ${len[0]}~${len[1]} 个字符`,
            trigger: 'blur'
          })
        } else if (parseInt(len[0]) > 0){
          rules[field.key].push({
            min: parseInt(len[0]),
            message: `长度至少为 ${len[0]} 个字符`,
            trigger: 'blur'
          })
        }
      }
    }
  })
  return rules
}

export function uploadImg(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("isImg", true);
  return request({
    headers: {'Content-Type': 'multipart/form-data'},
    url: `/res?isImg=true`,
    method: 'post',
    data: formData
  })
}

export function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("isImg", false);
  return request({
    headers: {'Content-Type': 'multipart/form-data'},
    url: `/res?isImg=false`,
    method: 'post',
    data: formData
  })
}

/**
 * 初始化字段响应式，用于对象类型表单字段绑定问题
 * @param props 组件props
 * @param _value 字段v-model值
 * @param key 用于检测的key，判断是否初始化字段
 * @param defaultVal 组件默认值
 */
export function useFormCpInit(props, _value, key, defaultVal) {
  let watchInit;
  watchInit = watch(() => props.mode, async () => {
    if (props.mode === 'E' && (!_value.value || !_value.value[key])) {
      _value.value = defaultVal
      //执行初始化后清除监听
      setTimeout(() => {
        //加个延时，让watch初始化完成
        if (watchInit instanceof Function) watchInit()
      }, 50)
    }
  }, {immediate: true})
}

/**
 * 自动给组件赋默认值
 * @param props 组件props
 * @param _value v-model值
 * @param custom 自定义赋值函数
 */
export function useFormCpDefaultValue(props, _value, custom) {
  onMounted(() => {
    //当有默认值设置且值为空且可编辑时赋默认值
    if (!props.config?.props) return
    if (!isEmpty(props.config.props.defaultValue) && !props.modelValue && props.mode === 'E') {
      if (custom && custom instanceof Function) custom()
      else _value.value = props.config.props.defaultValue
    }
  })
}

/**
 * 判断a数组是否包含b数组的所有元素
 * @param a 数组A
 * @param b 数组B
 * @param isEqual 是否使用自定义的相等性判断函数
 * @returns {*} true/false
 */
export function isHasAll(a, b, isEqual = (a, b) => a == b) {
  // 检查b中的每个元素是否都能在a中找到
  return b.every(elb =>
    a.some(ela => isEqual(ela, elb))
  );
}


/**
 * 拖拽控制宽度值的hook
 * 仅根据拖拽距离更新widthRef的值，不直接操作DOM元素
 * @param {string} resizerId - 拖拽手柄元素的ID
 * @param {Ref<number>} widthRef - 要更新的宽度值响应式变量
 * @param {Object} options - 可选配置项
 * @param {number} options.minWidth - 最小宽度限制，默认0
 * @param {number} options.maxWidth - 最大宽度限制，默认Infinity
 * @returns {Object} - 包含isDragging状态
 */
export function useDragWidth(resizerId, widthRef, options = {}) {
  // 解析配置项，设置默认值
  const {
    minWidth = 0,
    maxWidth = Infinity,
    changeWidth
  } = options;
  // 拖拽状态
  const isDragging = ref(false);
  // 记录拖拽开始时的位置和宽度
  let startX = 0;
  let startWidth = 0;
  // 拖拽手柄元素引用
  let resizerElement = null;
  // 初始化函数，获取拖拽手柄元素
  const init = () => {
    resizerElement = document.getElementById(resizerId);
    if (!resizerElement) {
      console.warn(`未找到ID为${resizerId}的拖拽手柄元素`);
      return false;
    }

    // 为拖拽手柄添加鼠标按下事件
    resizerElement.addEventListener('mousedown', handleMouseDown);
    return true;
  };

  // 处理鼠标按下事件（开始拖拽）
  const handleMouseDown = (e) => {
    // 防止默认行为，避免拖拽时选中文本等
    e.preventDefault();
    // 记录开始拖拽时的状态
    isDragging.value = true;
    startX = e.clientX;
    startWidth = widthRef.value;
    // 添加视觉反馈
    resizerElement.style.cursor = 'ew-resize';
  };

  // 处理鼠标移动事件（拖拽过程）
  const handleMouseMove = (e) => {
    if (!isDragging.value) return;
    // 计算横向拖拽距离
    const deltaX = e.clientX - startX;
    // 计算新宽度
    let newWidth = startWidth - deltaX;
    // 应用宽度限制
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    // 更新宽度值
    changeWidth(newWidth)
    widthRef.value = newWidth;
  };

  // 处理鼠标释放事件（结束拖拽）
  const handleMouseUp = () => {
    if (!isDragging.value) return;

    // 重置拖拽状态
    isDragging.value = false;

    // 移除视觉反馈
    resizerElement.style.cursor = '';
    resizerElement.classList.remove('dragging');
  };

  // 组件挂载时初始化
  onMounted(() => {
    init();
    // 监听全局鼠标移动和释放事件
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  // 组件卸载时清理
  onUnmounted(() => {
    if (resizerElement) {
      resizerElement.removeEventListener('mousedown', handleMouseDown);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  });

  return {
    isDragging
  };
}

export default {
  deepCopy
}
