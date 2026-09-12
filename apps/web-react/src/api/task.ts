import request from './request';

export function getTodoTasks(params: any) {
  return request({
    url: '/task/todo',
    method: 'get',
    params,
  });
}

export function getIdoTasks(params: any) {
  return request({
    url: '/task/ido',
    method: 'get',
    params,
  });
}

export function handlerTask(params: any) {
  params.requestId = params.requestId || crypto.randomUUID();
  return request({
    url: '/task/handler',
    method: 'post',
    data: params,
  });
}

export function reviseInstance(params: any) {
  return request({
    url: '/task/revise',
    method: 'post',
    data: params,
  });
}

export function getFallbackNodes(instId: string, taskId?: string) {
  return request({
    url: '/task/fallback/nodes',
    method: 'get',
    params: { instId, taskId },
  });
}

export function urgingTask(params: any) {
  return request({
    url: '/task/urging',
    method: 'post',
    data: params,
  });
}

export function claimTheTask(taskId: string) {
  return request({
    url: `/task/claim/${taskId}`,
    method: 'get',
  });
}

export function getWithdrawNodes(instId: string) {
  return request({
    url: '/task/withdraw/nodes',
    method: 'get',
    params: { instId },
  });
}

export function getCandidates(taskId: string) {
  return request<any[]>({
    url: `/task/candidate/${taskId}`,
    method: 'get',
  });
}

export interface FallbackNode {
  id: string;
  nodeId: string;
  name: string;
  nodeName?: string;
}
