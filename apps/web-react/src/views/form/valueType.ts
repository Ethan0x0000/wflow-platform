export const ValueType = {
  none: 'none',
  all: 'all',
  option: 'option',
  options: 'options',
  string: 'string',
  number: 'number',
  bool: 'bool',
  time: 'time',
  dateTime: 'dateTime',
  timeRange: 'timeRange',
  dateTimeRange: 'dateTimeRange',
  object: 'object',
  array: 'array',
  org: 'org',
  objArray: 'objArray',
  orgArray: 'orgArray',
  image: 'image',
  imageArray: 'imageArray',
  fileArray: 'fileArray',
} as const;

export type ValueTypeKey = keyof typeof ValueType;

export const validBaseType: Record<string, string> = {
  option: 'object',
  options: 'array',
  number: 'number',
  bool: 'boolean',
  timeRange: 'array',
  dateTimeRange: 'array',
  object: 'object',
  array: 'array',
  org: 'object',
  objArray: 'array',
  orgArray: 'array',
  imageArray: 'array',
  fileArray: 'array',
};

export default ValueType;
