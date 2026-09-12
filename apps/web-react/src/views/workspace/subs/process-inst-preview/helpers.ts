import { t } from '@/i18n';
import type { FormItemConfig } from '@/types/workflow';

export type ActionKind =
  | 'agree'
  | 'complete'
  | 'reject'
  | 'forward'
  | 'beforeAdd'
  | 'afterAdd'
  | 'fallback'
  | 'withdraw'
  | 'revoke'
  | 'comment';

export const actionTitleKeys: Record<ActionKind, string> = {
  agree: 'workspace.handler.titles.agree',
  complete: 'workspace.handler.titles.complete',
  reject: 'workspace.handler.titles.reject',
  forward: 'workspace.handler.titles.forward',
  beforeAdd: 'workspace.handler.titles.beforeAdd',
  afterAdd: 'workspace.handler.titles.afterAdd',
  fallback: 'workspace.handler.titles.fallback',
  withdraw: 'workspace.handler.titles.withdraw',
  revoke: 'workspace.handler.titles.revoke',
  comment: 'workspace.handler.titles.comment',
};

export const quickCommentKeys = [
  'workspace.handler.quickAgree',
  'workspace.handler.quickTrue',
  'workspace.handler.quickVerified',
  'workspace.handler.quickFollowRules',
  'workspace.handler.quickReturnEdit',
];

export interface ProcessInstPreviewProps {
  open: boolean;
  instId: string;
  taskId?: string;
  nodeId?: string;
  adminMode?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function parseFormSource(source?: string): { components: FormItemConfig[]; conf: any } {
  if (!source) return { components: [], conf: {} };
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    if (Array.isArray(parsed)) return { components: parsed, conf: {} };
    return { components: parsed?.components || [], conf: parsed?.conf || {} };
  } catch {
    return { components: [], conf: {} };
  }
}

export function walkComponents(items: any[], visit: (item: any) => void) {
  for (const item of items || []) {
    if (!item) continue;
    if (Array.isArray(item)) {
      walkComponents(item, visit);
      continue;
    }
    visit(item);
    if (item.props?.isContainer && Array.isArray(item.props.columns)) walkComponents(item.props.columns, visit);
    if ((item.type === 'TableList' || item.type === 'FormList') && Array.isArray(item.props?.columns)) walkComponents(item.props.columns, visit);
  }
}

export function formatValue(item: FormItemConfig, value: any): string {
  if (value === undefined || value === null || value === '') return '-';
  const options: any[] = item.props?.options || [];
  const labelOf = (raw: any) => {
    const match = options.find((opt) => (typeof opt === 'string' ? opt === raw : (opt.value ?? opt.name) === raw || opt.name === raw));
    return typeof match === 'string' ? match : match?.name || match?.label || String(raw);
  };
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'object' ? entry?.name ?? entry?.label ?? JSON.stringify(entry) : labelOf(entry)
      )
      .join(t('workspace.listSeparator'));
  }
  if (typeof value === 'object') return value.name ?? value.label ?? JSON.stringify(value);
  if (item.valueType === 'option' || options.length) return labelOf(value);
  return String(value);
}
