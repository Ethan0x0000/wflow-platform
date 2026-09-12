import request from './request';

export function startProcess(params: any) {
  params.requestId = params.requestId || crypto.randomUUID();
  return request<string>({
    url: '/inst/startup',
    method: 'post',
    data: params,
  });
}

export function getInstDetail(instId: string, nodeId?: string) {
  return request({
    url: '/inst/detail',
    method: 'get',
    params: { instId, nodeId },
  });
}

export function getInstProcess(instId: string) {
  return request({
    url: `/inst/process/${instId}`,
    method: 'get',
  });
}

export function delInst(instId: string) {
  return request({
    url: `/inst/${instId}`,
    method: 'delete',
  });
}

export function getInstList(params: any) {
  return request({
    url: '/inst/list',
    method: 'get',
    params,
  });
}

export function getInstRecords(instId: string) {
  return request({
    url: `/inst/records/${instId}`,
    method: 'get',
  });
}

export function getInstDiscuss(params: { instId: string }) {
  return request({
    url: '/inst/discuss',
    method: 'get',
    params,
  });
}

export function addInstDiscuss(instId: string, params: any) {
  return request({
    url: `/inst/discuss/${instId}`,
    method: 'post',
    data: params,
  });
}

export function delInstDiscuss(id: string) {
  return request({
    url: `/inst/discuss/${id}`,
    method: 'delete',
  });
}

export function getInstWithFormByCode(params: any) {
  return request({
    url: '/inst/list/count',
    method: 'get',
    params,
  });
}

export function exportInstWithFormByCode(params: any) {
  return request({
    url: '/inst/list/export',
    method: 'get',
    responseType: 'blob',
    params,
  });
}

export function getCcMeInst(params: any) {
  return request({
    url: '/inst/cc/list',
    method: 'get',
    params,
  });
}

export function getMySubmitInst(params: any) {
  return request({
    url: '/inst/mySubmit/list',
    method: 'get',
    params,
  });
}

export function getInstCount() {
  return request({
    url: '/inst/count',
    method: 'get',
  });
}

export function uploadSign(formData: FormData) {
  return request<{ id: string; name: string; url: string }>({
    headers: { 'Content-Type': 'multipart/form-data' },
    url: '/res?isImg=true&isSign=true',
    method: 'post',
    data: formData,
  });
}
