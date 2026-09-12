import request from './request';

export function getFormById(componentId: string) {
  return request({
    url: `/form/component/${componentId}`,
    method: 'get',
  });
}

export function getFormByType(type: string) {
  return request({
    url: `/form/component/type/${type}`,
    method: 'get',
  });
}

export function getFormCps(params: any) {
  return request({
    url: '/form/component/list',
    method: 'get',
    params,
  });
}

export function saveFromCp(params: any) {
  return request({
    url: '/form/component',
    method: 'post',
    data: params,
  });
}

export function publishFromCp(id: string) {
  return request({
    url: `/form/component/publish/${id}`,
    method: 'put',
  });
}

export function disableFromCp(id: string) {
  return request({
    url: `/form/component/disable/${id}`,
    method: 'put',
  });
}
