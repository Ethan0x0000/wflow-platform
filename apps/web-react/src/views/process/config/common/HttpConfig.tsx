import { ProcessHttpConfig } from '@/components/HttpConfigPanel';
import type { ProcessHttpConfigProps } from '@/components/HttpConfigPanel';

export type HttpConfigProps = ProcessHttpConfigProps;

/** 兼容旧路径的薄适配器：实现统一收敛到 @/components/HttpConfigPanel 的 ProcessHttpConfig */
export const HttpConfig = ProcessHttpConfig;

export default HttpConfig;
