import request from '@/api/request.js'

//获取字典数据
export function getDictData(dictKey) {
  return request({
    url: `sys/dict/${dictKey}`,
    method: 'get'
  })
}
