export interface ModelRow {
  id: string;
  code: string;
  procName: string;
  groupId: string;
  version: number;
  status: number;
  defineId: string;
  logo: string;
  process: string;
  formType: number;
  formJson: string;
  setting: string;
  startupRange: string;
  startupPerm: string;
  adminPerm: string;
  formFields: string;
  events: string;
  formRef: string | null;
  formCode: string | null;
  hasNewVersion: boolean;
  createTime: string;
  sort: number;
  remark: string;
}

export interface ModelGroupRow {
  id: string;
  name: string;
  sort: number;
}

export interface ModelListItem extends ModelRow {
  hasManagePerm: boolean;
  updateTime: string;
}

export interface ModelVersionRow {
  id: string;
  defineId: string;
  procName: string;
  version: number;
  status: number;
  createTime: string;
}
