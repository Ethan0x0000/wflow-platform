import request from './request.js'

//获取全局任务列表（管理员）
export function getManagerTasks(params){
  return request({
    url: '/manage/task',
    method: 'get',
    params: params
  })
}

//获取管理员介入视角下的流程实例详情
export function getManagerInstDetail(instId, taskId, nodeId){
  return request({
    url: '/manage/inst/detail',
    method: 'get',
    params: {
      instId,
      taskId,
      nodeId
    }
  })
}

//挂起流程实例
export function suspendInst(instId){
  return request({
    url: `/manage/suspend/${instId}`,
    method: 'put'
  })
}

//恢复流程实例
export function resumeInst(instId){
  return request({
    url: `/manage/resume/${instId}`,
    method: 'put'
  })
}

//管理员介入处理任务
export function managerHandleTask(params){
  return request({
    url: '/manage/task/handler',
    method: 'post',
    data: params
  })
}
