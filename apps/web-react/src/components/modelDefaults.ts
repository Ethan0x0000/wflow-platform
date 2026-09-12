import { t } from '@/i18n';

export interface ModelLogo {
  name: string;
  bgc: string;
  color: string;
}

export interface FormCodeConf {
  pc: string | null;
  mb: string | null;
}

export interface FormRefConf {
  type: string;
  pcPath: string | null;
  mbPath: string | null;
}

export interface FormSyncMapping {
  source?: string | null;
  type?: string | null;
  target?: string | null;
}

export interface FormSyncRule {
  enable: boolean;
  range: boolean;
  events: string[];
  type: string;
  apiUrl: string | null;
  preCover: boolean;
  preJs: string | null;
  tbName: string | null;
  el?: string | null;
  fieldMapping: FormSyncMapping[];
  [key: string]: any;
}

export interface ProcSetting {
  code: { type: string; rules: string[] };
  accessPerm: boolean;
  discuss: { enable: boolean; endEnable: boolean };
  comment: { enable: boolean; endEnable: boolean };
  endComment: boolean;
  endDiscuss: boolean;
  enableUrging: boolean;
  enableCancel: boolean;
  agreeSign: boolean;
  reloadUser: boolean;
  returnSkip: boolean;
  cancel: { timeout: number; enable: boolean };
  revise: { timeout: number; enable: boolean };
  enableAgent: boolean;
  enableRevoke: boolean;
  print: { type: string; template: string | null };
  formSync: FormSyncRule;
  deduplication: { type: string; isSkip: boolean };
  [key: string]: any;
}

export const DEFAULT_LOGO: ModelLogo = {
  name: 'file-icons:omnigraffle',
  bgc: '#4C87F3',
  color: '#FFFFFF',
};

export const LOGO_COLORS = [
  '#ff4500',
  '#ff8c00',
  '#ffd700',
  '#90ee90',
  '#00ced1',
  '#1e90ff',
  '#c71585',
  '#399161',
  '#248689',
  '#B1B433',
  '#59B2AD',
  '#EC6269',
  '#238B8C',
  '#4C87F3',
];

const codeRuleToken = (labelKey: string, value: string): { label: string; value: string } => ({
  get label() {
    return t(labelKey);
  },
  value,
});

export const CODE_RULE_TOKENS = [
  codeRuleToken('workspace.codeRule.literal', ''),
  codeRuleToken('workspace.codeRule.dateTime', '${dateTime}'),
  codeRuleToken('workspace.codeRule.randNumber', '${randNumber}'),
  codeRuleToken('workspace.codeRule.dayAdd', '${dayAdd}'),
  codeRuleToken('workspace.codeRule.monthAdd', '${monthAdd}'),
];

export function createDefaultLogo(): ModelLogo {
  return { ...DEFAULT_LOGO };
}

export function createDefaultFormCode(): FormCodeConf {
  return { pc: null, mb: null };
}

export function createDefaultFormRef(): FormRefConf {
  return { type: 'LOCAL', pcPath: null, mbPath: null };
}

export function createDefaultFormJson(): Record<string, any> {
  return {
    conf: {
      labelPosition: 'right',
      labelWidth: 100,
      _labelPosition: 'top',
      _labelWidth: 100,
      size: 'default',
      valid: { type: 'SIMPLE', js: null, rules: [] },
      showHide: { type: 'SIMPLE', js: null, rules: [] },
      actionRule: { type: 'SIMPLE', js: null, rules: [] },
      onLoad: { type: 'SIMPLE', js: null, actions: [] },
    },
    datasource: [],
    components: [],
  };
}

export function createDefaultEvents(): Record<string, any> {
  return {
    retry: 0,
    async: false,
    startup: [],
    pass: [],
    reject: [],
    revoked: [],
  };
}

export function createDefaultFormSync(): FormSyncRule {
  return {
    enable: false,
    range: false,
    events: [],
    type: 'DB',
    apiUrl: null,
    preCover: false,
    preJs: 'return ctx',
    tbName: null,
    el: null,
    fieldMapping: [],
  };
}

export function createDefaultSetting(): ProcSetting {
  return {
    code: { type: 'DEFAULT', rules: [] },
    accessPerm: false,
    discuss: { enable: true, endEnable: false },
    comment: { enable: true, endEnable: false },
    endComment: true,
    endDiscuss: true,
    enableUrging: true,
    enableCancel: false,
    agreeSign: false,
    reloadUser: false,
    returnSkip: false,
    cancel: { timeout: 30, enable: false },
    revise: { timeout: 30, enable: false },
    enableAgent: false,
    enableRevoke: false,
    print: { type: 'DEFAULT', template: null },
    formSync: createDefaultFormSync(),
    deduplication: { type: 'NONE', isSkip: false },
  };
}

export function normalizeSetting(input: any): ProcSetting {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const defaults = createDefaultSetting();
  const sync = raw.formSync && typeof raw.formSync === 'object' && !Array.isArray(raw.formSync) ? raw.formSync : {};
  return {
    ...defaults,
    ...raw,
    code: { ...defaults.code, ...(raw.code || {}) },
    discuss: { ...defaults.discuss, ...(raw.discuss || {}) },
    comment: { ...defaults.comment, ...(raw.comment || {}) },
    cancel: { ...defaults.cancel, ...(raw.cancel || {}) },
    revise: { ...defaults.revise, ...(raw.revise || {}) },
    print: { ...defaults.print, ...(raw.print || {}) },
    formSync: {
      ...defaults.formSync,
      ...sync,
      events: Array.isArray(sync.events) ? sync.events : [],
      fieldMapping: Array.isArray(sync.fieldMapping) ? sync.fieldMapping : [],
    },
    deduplication: { ...defaults.deduplication, ...(raw.deduplication || {}) },
  };
}

/**
 * Strip null-valued optional keys so the payload satisfies the server's strict
 * `syncRuleSchema` (optional strings must be absent, not null).
 */
export function sanitizeSetting(input: ProcSetting): Record<string, any> {
  const setting: Record<string, any> = { ...input };
  const sync = input.formSync as any;
  if (sync && typeof sync === 'object') {
    const cleanSync: Record<string, any> = {
      enable: sync.enable === true,
      events: Array.isArray(sync.events) ? sync.events : [],
      type: sync.type || 'DB',
    };
    if (typeof sync.range === 'boolean') cleanSync.range = sync.range;
    if (typeof sync.preCover === 'boolean') cleanSync.preCover = sync.preCover;
    if (sync.preJs) cleanSync.preJs = sync.preJs;
    if (sync.apiUrl) cleanSync.apiUrl = sync.apiUrl;
    if (sync.tbName) cleanSync.tbName = sync.tbName;
    if (sync.el) cleanSync.el = sync.el;
    const mapping = (Array.isArray(sync.fieldMapping) ? sync.fieldMapping : [])
      .filter((item: any) => item && item.source)
      .map((item: any) => ({ source: item.source, ...(item.type ? { type: item.type } : {}), ...(item.target ? { target: item.target } : {}) }));
    if (mapping.length) cleanSync.fieldMapping = mapping;
    setting.formSync = cleanSync;
  }
  return setting;
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getFormCode(value: unknown): FormCodeConf {
  if (!value) return createDefaultFormCode();
  if (typeof value === 'object') {
    const conf = value as Record<string, unknown>;
    return { pc: (conf.pc as string | null) ?? null, mb: (conf.mb as string | null) ?? null };
  }
  try {
    const parsed = JSON.parse(String(value));
    if (parsed && typeof parsed === 'object') {
      return { pc: (parsed.pc as string | null) ?? null, mb: (parsed.mb as string | null) ?? null };
    }
  } catch {
    return { pc: String(value), mb: null };
  }
  return { pc: String(value), mb: null };
}

// Mirrors Vue resolveFormJson/loadFormItem: flatten nested components into
// descriptors, keeping top-level `required` and dropping `props`.
export function flattenFormFields(components: any): any[] {
  const fields: any[] = [];
  const visit = (raw: any, parent?: any) => {
    if (Array.isArray(raw)) {
      raw.forEach((item) => visit(item, parent));
      return;
    }
    if (!raw || typeof raw !== 'object') return;
    const component = raw;
    const props = component.props && typeof component.props === 'object' ? component.props : {};
    const descriptor: Record<string, any> = {
      ...component,
      required: props.required === true || component.required === true,
    };
    delete descriptor.props;
    if (parent) descriptor.parent = { key: parent.key, name: parent.name };
    fields.push(descriptor);
    if (props.isContainer) {
      // Vue resolves container columns without a parent reference.
      if (Array.isArray(props.columns)) props.columns.forEach((column: any) => visit(column));
    } else if (component.type === 'TableList' || component.type === 'FormList') {
      const columns = Array.isArray(component.columns) ? component.columns : props.columns;
      if (Array.isArray(columns)) columns.forEach((column: any) => visit(column, component));
    }
  };
  visit(components);
  return fields;
}

export function resolveStartupLabel(model: any): string {
  const range = model?.startupRange;
  if (range === 'NONE') return t('workspace.modelDefaults.allForbidden');
  if (range === 'RANGE') {
    const perms = parseJson<any[]>(model?.startupPerm, []);
    const names = perms.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean);
    return names.join(t('workspace.listSeparator')) || t('workspace.modelDefaults.allUsers');
  }
  return t('workspace.modelDefaults.allUsers');
}

export function resolveAdminLabel(model: any): string {
  const perms = parseJson<any[]>(model?.adminPerm, []);
  return perms
    .map((item) => (typeof item === 'string' ? item : item?.name))
    .filter(Boolean)
    .join(t('workspace.listSeparator'));
}

const RUNTIME_MODEL_KEYS = [
  'id',
  'defineId',
  'deployId',
  'hasNewVersion',
  'hasManagePerm',
  'updateTime',
  'lastVersion',
  'createTime',
  'status',
  'sort',
];

export function sanitizeModelForTransfer(model: any): Record<string, any> {
  const copy: Record<string, any> = { ...(model || {}) };
  for (const key of RUNTIME_MODEL_KEYS) delete copy[key];
  copy.version = 1;
  return copy;
}

export function defaultModelPayload(input: {
  code: string;
  procName: string;
  groupId: string;
  sort: number;
  process: any[];
}): Record<string, any> {
  return {
    code: input.code,
    procName: input.procName,
    name: input.procName,
    groupId: input.groupId,
    sort: input.sort,
    formType: 0,
    version: 1,
    logo: JSON.stringify(createDefaultLogo()),
    process: JSON.stringify(input.process),
    formJson: JSON.stringify(createDefaultFormJson()),
    formRef: JSON.stringify(createDefaultFormRef()),
    formCode: JSON.stringify(createDefaultFormCode()),
    formFields: JSON.stringify([]),
    setting: JSON.stringify(createDefaultSetting()),
    startupRange: 'ALL',
    startupPerm: JSON.stringify([]),
    adminPerm: JSON.stringify([]),
    events: JSON.stringify(createDefaultEvents()),
    remark: '',
  };
}
