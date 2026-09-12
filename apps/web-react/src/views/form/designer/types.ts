/** 数据源变量（用于条件/动作选择） */
export interface DsVariable {
  label: string;
  value: string;
  valueType?: string;
  type?: string;
}

export interface DsGroupOption {
  label: string;
  value: string;
  children: DsVariable[];
}

/** 条件项（对齐 Vue WConditionConfig） */
export interface ConditionItem {
  type?: string | null;
  valueType?: string | null;
  fieldType?: string | null;
  isDynamic?: boolean;
  symbol?: string | null;
  compare?: string | null;
  compareVal?: any[];
  name?: string[];
}

export interface FormJsonValue {
  conf?: Record<string, any>;
  datasource?: any[];
  components?: any[];
  [key: string]: any;
}
