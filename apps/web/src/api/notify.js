import request from '@/api/request.js'

// 查询组织架构树
export function getUnreadNotify(params) {
  return request({
    url: 'notify/list',
    method: 'get',
    params: params
  })
}

// 发已读回执
export function confirmNotify(ids) {
  return request({
    url: 'notify/confirm',
    method: 'post',
    data: ids
  })
}

export function testSend(msg) {
  return request({
    url: `notify/testSend`,
    method: 'get',
    params: {msg: msg}
  })
}
