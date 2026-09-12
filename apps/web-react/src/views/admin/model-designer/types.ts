export type TabKey = 'BASE' | 'FORM' | 'PROCESS' | 'PLUS';

export interface HisModel {
  id: string;
  defineId?: string;
  procName?: string;
  version: number;
  status: number;
  createTime?: string;
}

export interface GroupRow {
  id: string;
  name: string;
  sort?: number;
}
