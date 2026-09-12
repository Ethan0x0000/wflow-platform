import request from '@/api/request.js'

// 获取工作交接记录列表
export function getWorkHandoverList(params) {
  return request({
    url: `/work-handover`,
    method: 'get',
    params: params
  })
}

// 创建工作交接记录
export function createWorkHandover(data) {
  return request({
    url: `/work-handover`,
    method: 'post',
    data: data
  })
}

// 生效工作交接
export function activateWorkHandover(id) {
  return request({
    url: `/work-handover/activate/${id}`,
    method: 'put'
  })
}

// 删除工作交接记录
export function deleteWorkHandover(id) {
  return request({
    url: `/work-handover/${id}`,
    method: 'delete'
  })
}

// 重试部分失败的工作交接
export function retryWorkHandover(id) {
  return request({
    url: `/work-handover/retry/${id}`,
    method: 'put'
  })
}
