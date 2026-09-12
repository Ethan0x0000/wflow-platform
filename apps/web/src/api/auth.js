import request from '@/api/request.js'

//用户登录
export function login(userId) {
  return request({
    url: `auth/login/${userId}`,
    method: 'get'
  })
}
