import type { Json } from "./common.js";

export interface FormDataField {
  key: string;
  value: Json;
}

export interface FormDataRow {
  instId: string;
  defineId: string;
  content: FormDataField[];
  createTime: string;
  updateTime: string;
  cacheTime: string;
  expireTime: string;
}
