import request from '@/api/request.js'

//获取表单组件sfc代码
export function getFormById(componentId) {
  return request({
    url: `form/component/${componentId}`,
    method: 'get'
  })
}

export function getFormByType(type) {
  return request({
    url: `form/component/type/${type}`,
    method: 'get'
  })
}

//查询表单自定义组件列表
export function getFormCps(params) {
  return request({
    url: `form/component/list`,
    method: 'get',
    params: params
  })
}

//保存表单组件
export function saveFromCp(params) {
  return request({
    url: `form/component`,
    method: 'post',
    data: params
  })
}

export function publishFromCp(id) {
  return request({
    url: `form/component/publish/${id}`,
    method: 'put'
  })
}

export function disableFromCp(id) {
  return request({
    url: `form/component/disable/${id}`,
    method: 'put'
  })
}




