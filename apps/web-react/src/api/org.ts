import request from './request';

export function getOrgTree(deptId?: string, type?: string) {
  return request({
    url: '/org/tree',
    method: 'get',
    params: { deptId, type },
  });
}

export function searchOrgs(name: string, type = 'user') {
  return request({
    url: '/org/search',
    method: 'get',
    params: { name, type },
  });
}

export function getRole() {
  return request({
    url: '/org/roles',
    method: 'get',
  });
}

export function getUserDetail(userId: string) {
  return request({
    url: `/org/user/detail/${userId}`,
    method: 'get',
  });
}

export function getUserDeptList(userId: string) {
  return request({
    url: `/org/user/depts/${userId}`,
    method: 'get',
  });
}

export function getUserDepts(userId: string) {
  return request({
    url: `/org/user/${userId}/dept`,
    method: 'get',
  });
}

export function getSysUserGroups() {
  return request({
    url: '/org/user/groups',
    method: 'get',
  });
}

export function getOldSign() {
  return request<string>({
    url: '/org/user/signature',
    method: 'get',
  });
}

export function saveSign(signature: string) {
  return request<string>({
    url: '/org/user/signature',
    method: 'post',
    data: { signature },
  });
}
