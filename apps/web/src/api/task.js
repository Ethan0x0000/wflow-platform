import request from './request.js'

//查询待办任务
export function getTodoTasks(params){
  return request({
    url: '/task/todo',
    method: 'get',
    params: params
  })
}

//查询已办任务
export function getIdoTasks(params){
  return request({
    url: '/task/ido',
    method: 'get',
    params: params
  })
}

//处理待办任务
export function handlerTask(params){
  params.requestId ||= crypto.randomUUID()
  return request({
    url: '/task/handler',
    method: 'post',
    data: params
  })
}

//修改已结束的流程
export function reviseInstance(params){
  return request({
    url: '/task/revise',
    method: 'post',
    data: params
  })
}

//查询可回退节点
export function getFallbackNodes(instId, taskId){
  return request({
    url: '/task/fallback/nodes',
    method: 'get',
    params: {instId: instId, taskId: taskId}
  })
}

//催办流程
export function urgingTask(params){
  return request({
    url: '/task/urging',
    method: 'post',
    data: params
  })
}

/**
 * 签收任务
 * @param taskId 需要签收的任务ID
 * @returns {*}
 */
export function claimTheTask(taskId) {
  return request({
    url: `/task/claim/${taskId}`,
    method: 'get'
  })
}

/**
 * 查询任务的候选人
 * @param taskId 任务id
 * @returns {*}
 */
export function getCandidates(taskId) {
  return request({
    url: `/task/candidate/${taskId}`,
    method: 'get'
  })
}

/**
 * 查询可撤回的节点
 * @param instId
 * @returns {*}
 */
export function getWithdrawNodes(instId) {
  return request({
    url: `/task/withdraw/nodes`,
    method: 'get',
    params: {
      instId: instId
    }
  })
}



