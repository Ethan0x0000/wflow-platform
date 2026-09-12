import request from './request';

export function getWorkHandoverList(params: any) {
  return request({
    url: '/work-handover',
    method: 'get',
    params,
  });
}

export function createWorkHandover(data: any) {
  return request({
    url: '/work-handover',
    method: 'post',
    data,
  });
}

export function activateWorkHandover(id: string) {
  return request({
    url: `/work-handover/activate/${id}`,
    method: 'put',
  });
}

export function deleteWorkHandover(id: string) {
  return request({
    url: `/work-handover/${id}`,
    method: 'delete',
  });
}

export function retryWorkHandover(id: string) {
  return request({
    url: `/work-handover/retry/${id}`,
    method: 'put',
  });
}
