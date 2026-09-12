import request from '@/api/request.js'

//获取我的代理规则
export function getAgentRulePage(params) {
  return request({
    url: `/handover`,
    method: 'get',
    params: params
  })
}

//保存我的代理规则
export function addAgentRule(data) {
  return request({
    url: `/handover`,
    method: 'post',
    data: data
  })
}

//删除我的代理规则
export function deleteAgentRule(id) {
  return request({
    url: `/handover/${id}`,
    method: 'delete'
  })
}

 //更新我的代理规则
export function updateAgentRule(data) {
  return request({
    url: `/handover`,
    method: 'put',
    data: data
  })
}
