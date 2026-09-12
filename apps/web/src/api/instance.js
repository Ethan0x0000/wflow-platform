import request from './request.js'

//发起流程实例
export function startProcess(params){
  params.requestId ||= crypto.randomUUID()
  return request({
    url: '/inst/startup',
    method: 'post',
    data: params
  })
}

//获取实例详情
export function getInstDetail(instId, nodeId){
  return request({
    url: '/inst/detail',
    method: 'get',
    params: {
      instId: instId,
      nodeId: nodeId
    }
  })
}

export function getInstProcess(instId){
  return request({
    url: `/inst/process/${instId}`,
    method: 'get'
  })
}

export function delInst(instId){
  return request({
    url: `/inst/${instId}`,
    method: 'delete'
  })
}

export function getInstList(params){
  return request({
    url: `/inst/list`,
    method: 'get',
    params: params
  })
}

export function getInstRecords(instId){
  return request({
    url: `/inst/records/${instId}`,
    method: 'get'
  })
}

//查询流程实例讨论组记录
export function getInstDiscuss(params){
  return request({
    url: `/inst/discuss`,
    method: 'get',
    params: params
  })
}

export function addInstDiscuss(instId, params){
  return request({
    url: `/inst/discuss/${instId}`,
    method: 'post',
    data: params
  })
}

export function delInstDiscuss(id){
  return request({
    url: `/inst/discuss/${id}`,
    method: 'delete'
  })
}

/**
 * 查询流程及表单详细数据
 * @param params
 * @returns {*}
 */
export function getInstWithFormByCode(params){
  return request({
    url: `/inst/list/count`,
    method: 'get',
    params: params
  })
}

//导出excel数据
export function exportInstWithFormByCode(params){
  return request({
    url: `/inst/list/export`,
    method: 'get',
    responseType: 'blob',
    params: params
  })
}

//查询抄送我的流程记录
export function getCcMeInst(params){
  return request({
    url: `/inst/cc/list`,
    method: 'get',
    params: params
  })
}

//查询我提交的流程记录
export function getMySubmitInst(params){
  return request({
    url: `/inst/mySubmit/list`,
    method: 'get',
    params: params
  })
}

//查询首页流程统计数
export function getInstCount(){
  return request({
    url: `/inst/count`,
    method: 'get'
  })
}

//上传签字签名
export function uploadSign(formData){
  return request({
    headers: {'Content-Type': 'multipart/form-data'},
    url: `/res?isImg=true&isSign=true`,
    method: 'post',
    data: formData
  })
}

