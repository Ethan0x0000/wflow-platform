import request from './request';

export function getProcGroup() {
  return request({
    url: '/model/group',
    method: 'get',
  });
}

export function createProcGroup(name: string) {
  return request({
    url: '/model/group',
    method: 'post',
    params: { name },
  });
}

export function delProcGroup(groupId: string) {
  return request({
    url: '/model/group',
    method: 'delete',
    params: { groupId },
  });
}

export function getProcGroupItems() {
  return request({
    url: '/model/group/items',
    method: 'get',
  });
}

export function getProcGroupItemsList() {
  return request({
    url: '/model/group/items/list',
    method: 'get',
  });
}

export function getProcModelByUser() {
  return request({
    url: '/model/group/items/byUser',
    method: 'get',
  });
}

export function saveModel(modelObj: any) {
  return request<string>({
    url: '/model/save',
    method: 'post',
    data: modelObj,
  });
}

export function deployModel(code: string) {
  return request({
    url: '/model/deploy',
    method: 'post',
    params: { code },
  });
}

export function deploy(code: string) {
  return deployModel(code);
}

export function getModelFormFields(code: string) {
  return request({
    url: `/model/formFields/by/${code}`,
    method: 'get',
  });
}

export function getProcActiveModel(code: string) {
  return request({
    url: '/model',
    method: 'get',
    params: { code },
  });
}

export function getProcModelByVer(code: string, ver?: number, isSimple = false) {
  return request({
    url: '/model/ver',
    method: 'get',
    params: { code, ver, isSimple },
  });
}

export function getHisModels(params: { code: string; pageNo?: number; pageSize?: number }) {
  return request({
    url: '/model/his/ver',
    method: 'get',
    params,
  });
}

export function enableModel(status: number | boolean, code: string) {
  return request({
    url: '/model/enable',
    method: 'put',
    params: { status, code },
  });
}

export function deleteModel(code: string) {
  return request({
    url: `/model/${code}`,
    method: 'delete',
  });
}

export function updateModel(params: any) {
  return request({
    url: '/model/update',
    method: 'post',
    data: params,
  });
}

export function copyModel(code: string, name: string) {
  return request({
    url: '/model/copy',
    method: 'post',
    params: { code, name },
  });
}

export function getBpmnXml(defineId: string) {
  return request({
    url: `/model/xml/${defineId}`,
    method: 'get',
  });
}

export function getPrintConf(defineId: string) {
  return request<{ type: string; template: string }>({
    url: `/model/print/conf/${defineId}`,
    method: 'get',
  });
}

export function moveModel(modelId: string, groupId: string) {
  return request<string>({
    url: '/model/group/move',
    method: 'put',
    params: { modelId, groupId },
  });
}

export function updateGroupName(groupId: string, name: string) {
  return request<string>({
    url: '/model/group/name',
    method: 'put',
    params: { groupId, name },
  });
}

export function updateGroupSort(ids: string[]) {
  return request<string>({
    url: '/model/group/sort',
    method: 'put',
    data: ids,
  });
}

export function updateGroupModelSort(groupId: string, ids: string[]) {
  return request<string>({
    url: `/model/sort/${groupId}`,
    method: 'put',
    data: ids,
  });
}

export function getModelFormInfo(code: string, ver?: number) {
  return request<any>({
    url: '/model/formFields',
    method: 'get',
    params: { code, ver },
  });
}

export function activeModel(id: string) {
  return request<string>({
    url: `/model/active/${id}`,
    method: 'put',
  });
}

export function validateEl(el: string) {
  return request<string>({
    url: '/model/el/validate',
    method: 'get',
    params: { el },
  });
}

export function validateElList(list: string[]) {
  return request<string[]>({
    url: '/model/el/validate/list',
    method: 'post',
    data: list,
  });
}
