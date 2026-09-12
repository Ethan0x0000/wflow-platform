import type { TabKey } from './types';

export const STEP_NUM: Record<TabKey, string> = {
  BASE: '①',
  FORM: '②',
  PROCESS: '③',
  PLUS: '④',
};

export const FORM_TYPE_LABEL_KEYS: Record<number, string> = {
  0: 'admin.formType.design',
  1: 'admin.formType.code',
  2: 'admin.formType.external',
  4: 'admin.formType.none',
};

export const SYNC_EVENT_OPTIONS = [
  { labelKey: 'admin.syncEvent.create', value: 'create' },
  { labelKey: 'admin.syncEvent.update', value: 'update' },
  { labelKey: 'admin.syncEvent.revoke', value: 'revoke' },
  { labelKey: 'admin.syncEvent.reject', value: 'reject' },
  { labelKey: 'admin.syncEvent.delete', value: 'delete' },
  { labelKey: 'admin.syncEvent.pass', value: 'pass' },
];
