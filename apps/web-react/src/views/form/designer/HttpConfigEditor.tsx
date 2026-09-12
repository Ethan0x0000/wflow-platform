import { FormHttpConfig } from '@/components/HttpConfigPanel';
import type { FormHttpConfigProps, HttpValue } from '@/components/HttpConfigPanel';

export type { HttpValue };

export type HttpConfigEditorProps = FormHttpConfigProps;

/** 兼容旧路径的薄适配器：实现统一收敛到 @/components/HttpConfigPanel 的 FormHttpConfig */
export const HttpConfigEditor = FormHttpConfig;

export default HttpConfigEditor;
