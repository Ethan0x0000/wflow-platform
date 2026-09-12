import request from './request';

export interface AgentRule {
  id?: string;
  userId?: string;
  target: { id: string; name?: string; avatar?: string; type?: string };
  scope: string[] | null;
  timeRange: string[];
  reason?: string;
}

export function getAgentRulePage(params: { pageNo?: number; pageSize?: number }) {
  return request<{ records: AgentRule[]; total: number }>({
    url: '/handover',
    method: 'get',
    params,
  });
}

export function addAgentRule(data: AgentRule) {
  return request<string>({
    url: '/handover',
    method: 'post',
    data,
  });
}

export function updateAgentRule(data: AgentRule) {
  return request<string>({
    url: '/handover',
    method: 'put',
    data,
  });
}

export function deleteAgentRule(id: string) {
  return request<string>({
    url: `/handover/${id}`,
    method: 'delete',
  });
}
