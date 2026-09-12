import request from '@/api/request.js'


// 查询组织架构树
export function getOrgTree(deptId, type) {
  return request({
    url: 'org/tree',
    method: 'get',
    params: {deptId, type}
  })
}

// 搜索组织架构树
export function searchOrgs(name, type = 'user') {
  return request({
    url: 'org/search',
    method: 'get',
    params: {name, type}
  })
}

// 查询系统角色
export function getRole() {
  return request({
    url: 'org/roles',
    method: 'get'
  })
}

//查询用户资料信息
export function getUserDetail(userId) {
  return request({
    url: `org/user/detail/${userId}`,
    method: 'get'
  })
}

//查询用户所在部门
export function getUserDeptList(userId) {
  return request({
    url: `org/user/depts/${userId}`,
    method: 'get'
  })
}

// 搜索人员
export function getUserDepts(userId) {
  return request({
    url: `org/user/${userId}/dept`,
    method: 'get'
  })
}

// 查询系统用户组
export function getSysUserGroups(userId) {
  return request({
    url: `org/user/groups`,
    method: 'get'
  })
}

export function getOldSign() {
  return request({
    url: `org/user/signature`,
    method: 'get'
  })
}

export default {
  getOrgTree, getRole, searchOrgs, getSysUserGroups, getOldSign
}
