import request from './request.js'

/**
 * 查询流程预测
 * @returns {*}
 */
export function getForecast(params) {
  return request({
    url: `startup/forecast`,
    method: 'post',
    data: params
  })
}

//查询流程模拟
export function getForecastMock(params, code, version) {
  return request({
    url: `startup/forecast/${code}/${version}`,
    method: 'post',
    data: params
  })
}

/**
 * 分页查询流程草稿
 * @param params
 * @returns {*}
 */
export function getDrafts(params) {
  return request({
    url: `startup/draft`,
    method: 'get',
    params: params
  })
}

/**
 * 保存流程草稿
 * @param params
 * @returns {*}
 */
export function saveDraft(params) {
  return request({
    url: `startup/draft`,
    method: 'post',
    data: params
  })
}

/**
 * 删除流程草稿
 * @param id
 * @returns {*}
 */
export function delDraft(id) {
  return request({
    url: `startup/draft/${id}`,
    method: 'delete'
  })
}

/**
 * 获取发起流程的信息
 * @param code 流程编号
 * @param version 流程版本
 * @returns {*}
 */
export function getStartupModel(code, version) {
  return request({
    url: `startup/model/${code}/${version}`,
    method: 'get'
  })
}

