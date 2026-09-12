//流程条件比较设置选项
import {isEmpty, isHasAll} from "@/utils/GlobalFunc.js";
import {dayjs} from "element-plus";
import ValueType from "@/views/wflow/design/form/ValueType.js";

export const CompareOptions = {
  number: [
    {name: '大于', symbol: 'GT'},
    {name: '小于', symbol: 'LT'},
    {name: '等于', symbol: 'EQ'},
    {name: '大于等于', symbol: 'GT_EQ'},
    {name: '小于等于', symbol: 'LT_EQ'},
    {name: '不等于', symbol: 'NEQ'},
    {name: '包含在', symbol: 'IN'},
    {name: '介于两者间', symbol: 'BT'},
  ],
  string: [
    {name: '为空', symbol: 'EM'},
    {name: '不为空', symbol: 'NEM'},
    {name: '含有字符串', symbol: 'HAS'},
    {name: '包含在', symbol: 'IN'},
    {name: '等于', symbol: 'EQ'},
    {name: '不等于', symbol: 'NEQ'}
  ],
  array: [
    {name: '为空', symbol: 'EM'},
    {name: '不为空', symbol: 'NEM'},
    {name: '含有', symbol: 'HAS'},
    {name: '不含有', symbol: 'NHAS'},
  ],
  time: [
    {name: '为空', symbol: 'EM'},
    {name: '在之前<', symbol: 'BF'},
    {name: '在之后>', symbol: 'AF'},
    {name: '在之间', symbol: 'CT'},
    {name: '在之外', symbol: 'NCT'}
  ],
  timeRange: [
    {name: '为空', symbol: 'EM'},
    {name: '时长大于', symbol: 'GT'},
    {name: '时长大于等于', symbol: 'GT_EQ'},
    {name: '时长小于', symbol: 'LT'},
    {name: '时长小于等于', symbol: 'LT_EQ'},
    {name: '时长等于', symbol: 'EQ'}
  ],
  dateTime: [
    {name: '为空', symbol: 'EM'},
    {name: '在之前<', symbol: 'BF'},
    {name: '在之后>', symbol: 'AF'},
    {name: '在之间', symbol: 'CT'},
    {name: '在之外', symbol: 'NCT'}
  ],
  dateTimeRange: [
    {name: '为空', symbol: 'EM'},
    {name: '时长大于', symbol: 'GT'},
    {name: '时长大于等于', symbol: 'GT_EQ'},
    {name: '时长小于', symbol: 'LT'},
    {name: '时长小于等于', symbol: 'LT_EQ'},
    {name: '时长等于', symbol: 'EQ'}
  ],
  user: [
    {name: '为其中之一', symbol: 'IN'},
    {name: '不为其中之一', symbol: 'NIN'},
  ],
  dept: [
    {name: '部门属于', symbol: 'IN'},
    {name: '部门不属于', symbol: 'NIN'},
  ],
  org: [
    {name: '本人/部门属于', symbol: 'IN'},
    {name: '本人/部门不属于', symbol: 'NIN'},
  ],
  orgArray: [
    {name: '为空', symbol: 'EM'},
    {name: '含有', symbol: 'HAS'},
    {name: '不含有', symbol: 'NHAS'},
    {name: '选中对象为', symbol: 'EQ'},
  ],
  role: [
    {name: '拥有角色', symbol: 'HAS'},
    {name: '没有角色', symbol: 'NHAS'},
  ],
  result: [
    {name: '等于', symbol: 'EQ'}
  ],
  all: [
    {name: '大于', symbol: 'GT'},
    {name: '小于', symbol: 'LT'},
    {name: '等于', symbol: 'EQ'},
    {name: '不等于', symbol: 'NEQ'},
    {name: '大于等于', symbol: 'GT_EQ'},
    {name: '小于等于', symbol: 'LT_EQ'},
    {name: '包含在', symbol: 'IN'},
    {name: '介于两者间', symbol: 'BT'},
    {name: '为空', symbol: 'EM'},
    {name: '不为空', symbol: 'NEM'},
    {name: '不含有', symbol: 'NHAS'},
    {name: '含有字符串', symbol: 'HAS'}
  ],
  option: [
    {name: '为空', symbol: 'EM'},
    {name: '不为空', symbol: 'NEM'},
    {name: '等于', symbol: 'EQ'},
    {name: '不等于', symbol: 'NEQ'},
    {name: '包含在', symbol: 'IN'},
    {name: '不包含在', symbol: 'NIN'}
  ],
  options: [
    {name: '为空', symbol: 'EM'},
    {name: '不为空', symbol: 'NEM'},
    {name: '含有', symbol: 'HAS'},
    {name: '不含有', symbol: 'NHAS'},
  ],
  bool: [
    {name: '等于', symbol: 'EQ'},
    {name: '不等于', symbol: 'NEQ'}
  ],
}

//前端比较计算
const Compare = {
  EM: (a) => isEmpty(a),
  NEM: (a) => !isEmpty(a),
  //比大小
  GT: (a, b, type) => getNumber(a, type) > parseFloat(b[0]),
  LT: (a, b, type) => getNumber(a, type) < parseFloat(b[0]),
  GT_EQ: (a, b, type) => getNumber(a, type) >= parseFloat(b[0]),
  LT_EQ: (a, b, type) => getNumber(a, type) <= parseFloat(b[0]),
  //相等
  EQ: (a, b, type) => equals(a, b[0], type),
  NEQ: (a, b, type) => !equals(a, b[0], type),
  //范围
  IN: (a, b = [], type) => compareIn(a, b, type),
  NIN: (a, b = [], type) => !compareIn(a, b, type),
  BT: (a, b = []) => parseFloat(a) >= parseFloat(b[0]) && parseFloat(a) <= parseFloat(b[1]),
  //包含
  HAS: (a, b, type) => compareHas(a, b, type),
  NHAS: (a, b, type) => !compareHas(a, b, type),
  //时间判断
  CT: (a, b) => isBetween(a, b),
  NCT: (a, b) => !isBetween(a, b),
  BF: (a, b) => datetimeFmt(a).isBefore(datetimeFmt(b[0])),
  AF: (a, b) => datetimeFmt(a).isAfter(datetimeFmt(b[0])),
}

//获取时间差值
const getNumber = (a, type) => {
  if (type === ValueType.timeRange) return diffHour(a[0], a[1])
  else if (type === ValueType.dateTimeRange) return diffDay(a[0], a[1])
  else return parseFloat(a);
}

const equals = (a, b, type) => {
  try {
    if (type === ValueType.option) {
      return a.value == b.value
    } else if (type === ValueType.dateTimeRange) {
      return diffDay(a[0], a[1]) === parseFloat(b)
    } else if (type === ValueType.timeRange) {
      return diffHour(a[0], a[1]) === parseFloat(b)
    } else if (type === ValueType.orgArray) {
      return a.length === b.length && isHasAll(a, b, (a, b) => a.id == b.id)
    }
    return a == b
  } catch (e) {
    return false
  }
}

const compareIn = (a, b, type) => {
  try {
    if (type === ValueType.option) {
      return b.map(v => v.value).indexOf(a.value) > -1
    } else if (type === ValueType.orgArray) {
      return b.map(v => v.value).indexOf(a) > -1
    }
    return b.indexOf(a) > -1
  } catch (e) {
    return false
  }
}

//判断a是否含有b
const compareHas = (a, b, type) => {
  try {
    if (type === ValueType.options) {
      return a.map(v => v.value).indexOf(b[0].value) > -1
    } else if (type === ValueType.orgArray) {
      return isHasAll(a, b, (a, b) => a.id == b.id)
    }
    return a.indexOf(b[0]) > -1
  } catch (e) {
    return false
  }
}
//条件比较
export const compareRule = (rule, context) => {
  let result = false
  try {
    result = Compare[rule.compare](context[rule.symbol],
      rule.isDynamic ? [context[rule.compareVal[0]]] : rule.compareVal, rule.valueType)
  } catch (e) {
    console.error(e)
  }
  return result
}

//条件组比较
export const compareRuleGroup = (group, context) => {
  let trueNum = 0;
  //不设置条件则认为满足直接执行
  if (isEmpty(group.conditions)) return true
  for (let i = 0; i < (group.conditions || []).length; i++) {
    if (compareRule(group.conditions[i], context)) {
      trueNum++;
      if (!group.logic) return true
    }
  }
  return trueNum > 0 && trueNum === group.conditions.length
}

const getCdName = (cd) => {
  const options = CompareOptions[cd.valueType || cd.type]
  if (!options) return '?'
  const index = options.findIndex(v => v.symbol === cd.compare)
  return (options[index] || {}).name || '?'
}

/**
 * 自适应格式化时间/日期
 * @param t
 * @returns {*}
 */
const datetimeFmt = (t) => {
  return t.length > 9 ? dayjs(t) : dayjs('2025-01-01 ' + t)
}

const isBetween = (a, b) => {
  const ad = datetimeFmt(a)
  const bd1 = datetimeFmt(b[0])
  const bd2 = datetimeFmt(b[1])
  return ad.isAfter(bd1) && ad.isBefore(bd2)
}

const diffHour = (a, b) => {
  return Math.abs(datetimeFmt(a).diff(datetimeFmt(b), 'hour', true))
}

const diffDay = (a, b) => {
  return Math.abs(datetimeFmt(a).diff(datetimeFmt(b), 'day', true))
}

//流程条件支持对象
export const ProcessCondition = {
  INITIATOR: {
    desc(cd) {
      return `发起人 ${getCdName(cd)} ${(cd.compareVal || []).map(v => v.name).join('、')}`
    }
  },
  FORM: {
    desc(cd) {
      return `${cd.name[1]} ${getCdName(cd)} ${cd.compareVal.map(v => {
        if (v.label) return v.label
        else if (v.name) return v.name
        else return v
      }).join('、')}`
    }
  },
  CONTEXT: {
    desc(cd) {
      return `${cd.name[1]}${cd.type === 'variable' ? `[${cd.symbol ? cd.symbol : '?'}]` : ''} ${getCdName(cd)} ${cd.compareVal.join('、')}`
    }
  },
  DEV: {
    desc(cd) {
      const val = cd.compareVal[0]
      switch (cd.type) {
        case 'EL': return `EL:${val ? val : '?'}的结果`
        case 'JS': return `JS执行结果`
        case 'HTTP': return `请求:${val?.url}的结果`
      }

    }
  }
}
