import type { FormItemConfig } from '@/types/workflow';

export interface TypeConfigProps {
  item: FormItemConfig;
  onChange: (patch: Partial<FormItemConfig>) => void;
  onChangeProps: (patch: Record<string, any>) => void;
  datasourceOptions?: Array<{ label: string; value: string }>;
}
