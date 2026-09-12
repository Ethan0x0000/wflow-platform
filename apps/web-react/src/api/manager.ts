import request from './request';

export function getManagerTasks(params: any) {
  return request({
    url: '/manage/task',
    method: 'get',
    params,
  });
}

export function getManagerInstDetail(instId: string, taskId?: string, nodeId?: string) {
  return request({
    url: '/manage/inst/detail',
    method: 'get',
    params: { instId, taskId, nodeId },
  });
}

export function suspendInst(instId: string) {
  return request({
    url: `/manage/suspend/${instId}`,
    method: 'put',
  });
}

export function resumeInst(instId: string) {
  return request({
    url: `/manage/resume/${instId}`,
    method: 'put',
  });
}

export function managerHandleTask(params: any) {
  return request({
    url: '/manage/task/handler',
    method: 'post',
    data: params,
  });
}
