import request from './request.js'

/**
 * 查询系统所有流程分组
 * @returns {*}
 */
export function getProcGroup() {
  return request({
    url: 'model/group',
    method: 'get'
  })
}

/**
 * 创建流程分组
 * @param name 分组名称
 * @returns {*}
 */
export function createProcGroup(name) {
  return request({
    url: 'model/group',
    method: 'post',
    params: {name}
  })
}

/**
 * 删除系统内流程分组
 * @returns {*}
 */
export function delProcGroup(groupId) {
  return request({
    url: 'model/group',
    method: 'delete',
    params: {groupId}
  })
}

/**
 * 查询系统所有分组及流程
 * @returns {*}
 */
export function getProcGroupItems() {
  return request({
    url: 'model/group/items',
    method: 'get'
  })
}

/**
 * 查询系统所有分组及流程简易信息
 * @returns {*}
 */
export function getProcGroupItemsList() {
  return request({
    url: 'model/group/items/list',
    method: 'get'
  })
}

/**
 * 移动流程到某个分组
 * @param groupId 目标分组ID
 * @param modelId 要移动的流程模型ID
 * @returns {*}
 */
export function moveModel(groupId, modelId) {
  return request({
    url: 'model/group/move',
    method: 'put',
    params: {groupId, modelId}
  })
}

/**
 * 修改分组名称
 * @param groupId 要修改的分组ID
 * @param name 新名称
 * @returns {*}
 */
export function updateGroupName(groupId, name) {
  return request({
    url: 'model/group/name',
    method: 'put',
    params: {groupId, name}
  })
}

/**
 * 分组排序
 * @param groupIds 按顺序的分组ID集合
 * @returns {*}
 */
export function updateGroupSort(groupIds) {
  return request({
    url: `model/group/sort`,
    method: 'put',
    data: groupIds
  })
}

/**
 * 分组内流程模型排序
 * @param groupId  操作的分组
 * @param codes 按顺序的流程模型code集合
 * @returns {*}
 */
export function updateGroupModelSort(groupId, codes) {
  return request({
    url: `model/sort/${groupId}`,
    method: 'put',
    data: codes
  })
}

/**
 * 保存设计的流程模型数据
 * @param modelObj 流程模型实体对象
 * @returns {*}
 */
export function saveModel(modelObj) {
  return request({
    url: 'model/save',
    method: 'post',
    data: modelObj
  })
}

/**
 * 发布流程模型
 * @param code 流程模型编号
 * @returns {*}
 */
export function deployModel(code) {
  return request({
    url: 'model/deploy',
    method: 'post',
    params: {code}
  })
}

export function getModelFormFields(code) {
  return request({
    url: `model/formFields/by/${code}`,
    method: 'get'
  })
}

/**
 * 获取流程模型表单信息
 * @param code 流程模型编号
 * @param ver 版本号
 * @returns {*}
 */
export function getModelFormInfo(code, ver) {
  return request({
    url: `model/formFields`,
    method: 'get',
    params: {code: code, ver: ver}
  })
}

/**
 * 获取指定版本的流程模型设计数据
 * @param code 模型编号
 */
export function getProcActiveModel(code){
  return request({
    url: 'model',
    method: 'get',
    params: {code: code}
  })
}

/**
 * 获取用户所有可发起的流程模型及分组
 * @returns {*}
 */
export function getProcModelByUser(){
  return request({
    url: 'model/group/items/byUser',
    method: 'get'
  })
}

/**
 * 查询流程模型指定版本数据
 * @param code 模型编号
 * @param ver 版本号
 * @param isSimple 是否返回简易信息
 * @returns {*}
 */
export function getProcModelByVer(code, ver, isSimple = false){
  return request({
    url: 'model/ver',
    method: 'get',
    params: {code: code, ver: ver, isSimple}
  })
}

/**
 * 查询指定所有版本的流程
 * @param code 流程编号
 * @returns {*}
 */
export function getHisModels(params){
  return request({
    url: 'model/his/ver',
    method: 'get',
    params: params
  })
}

/**
 * 部署流程
 * @param code 流程编号
 * @returns {*}
 */
export function deploy(code){
  return request({
    url: 'model/deploy',
    method: 'post',
    params: {code}
  })
}

/**
 * 激活指定模型
 * @param id 模型id主键
 * @returns {*}
 */
export function activeModel(id){
  return request({
    url: `model/active/${id}`,
    method: 'put'
  })
}

/**
 * 激活指定模型
 * @param status 是否是激活
 * @param code 模型code
 * @returns {*}
 */
export function enableModel(status, code){
  return request({
    url: `model/enable`,
    method: 'put',
    params: {status: status, code: code}
  })
}

/**
 * 删除指定模型
 * @param code 模型code
 * @returns {*}
 */
export function deleteModel(code){
  return request({
    url: `model/${code}`,
    method: 'delete'
  })
}

/**
 * 仅更新本模型
 * @param params 模型数据
 * @returns {*}
 */
export function updateModel(params){
  return request({
    url: `model/update`,
    method: 'post',
    data: params
  })
}

/**
 * 复制模型
 * @param code 模型code编号
 * @param name 模型名称
 * @returns {*}
 */
export function copyModel(code, name){
  return request({
    url: `model/copy`,
    method: 'post',
    params: {code: code, name: name}
  })
}

export function getBpmnXml(defineId){
  return request({
    url: `model/xml/${defineId}`,
    method: 'get'
  })
}

export function validateEl(el){
  return request({
    url: `model/el/validate?el=${encodeURIComponent(el)}`,
    method: 'get'
  })
}

export function validateElList(elList){
  return request({
    url: `model/el/validate`,
    method: 'post',
    data: elList
  })
}

//获取打印设置
export function getPrintConf(defineId){
  return request({
    url: `model/print/conf/${defineId}`,
    method: 'get'
  })
}
