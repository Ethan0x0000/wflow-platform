import request from './request';

export function getForecast(params: any) {
  return request({
    url: '/startup/forecast',
    method: 'post',
    data: params,
  });
}

export function getForecastMock(params: any, code: string, version: number | string) {
  return request({
    url: `/startup/forecast/${code}/${version}`,
    method: 'post',
    data: params,
  });
}

export function getDrafts(params: any) {
  return request({
    url: '/startup/draft',
    method: 'get',
    params,
  });
}

export function saveDraft(params: any) {
  return request({
    url: '/startup/draft',
    method: 'post',
    data: params,
  });
}

export function delDraft(id: string) {
  return request({
    url: `/startup/draft/${id}`,
    method: 'delete',
  });
}

export function getStartupModel(code: string, version?: number | string) {
  const url = version ? `/startup/model/${code}/${version}` : `/startup/model/${code}`;
  return request({
    url,
    method: 'get',
  });
}
