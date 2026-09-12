import request from './request';

export function login(userId: string) {
  return request<any>({
    url: `/auth/login/${userId}`,
    method: 'get',
  });
}

export function getDemoUser() {
  return request<any>({
    url: '/auth/demo',
    method: 'get',
  });
}

export function getAuthMe() {
  return request<any>({
    url: '/auth/me',
    method: 'get',
  });
}
