/**
 * 表单字段组件值类型，所有的组件必须按照这里面类型设置valueType字段
 */
export default {
  none: 'none',
  all: 'all', //可以是任何类型
  option: 'option', //单选项类型
  options: 'options', //多选项类型
  string: 'string',
  number: 'number',
  bool: 'bool',
  time: 'time',
  dateTime: 'dateTime',
  timeRange: 'timeRange',
  dateTimeRange: 'dateTimeRange',
  object: 'object',
  array: 'array', //普通类型的数组
  org: 'org', //组织架构相关，可以是用户、角色、岗位等，{id: '', type:''}
  objArray: 'objArray', //对象类型的数组
  orgArray: 'orgArray', //组织架构相关，可以是用户、角色、岗位等，[{id: '', type:''}]
  image: 'image',
  imageArray: 'imageArray',
  fileArray: 'fileArray',
}

//每种类型对应校验的基础类型
export const validBaseType =  {
  option: 'object', //单选项类型
  options: 'array', //多选项类型
  number: 'number',
  bool: 'boolean',
  timeRange: 'array',
  dateTimeRange: 'array',
  object: 'object',
  array: 'array', //普通类型的数组
  org: 'object', //组织架构相关，可以是用户、角色、岗位等，{id: '', type:''}
  objArray: 'array', //对象类型的数组
  orgArray: 'array', //组织架构相关，可以是用户、角色、岗位等，[{id: '', type:''}]
  imageArray: 'array',
  fileArray: 'array',
}
