//获取随机节点id
let index = 1

export function getRandNodeId() {
  //前缀node_ + 时间戳 + 4位数
  const nodeId = `node_${new Date().getTime()}${index.toString().padStart(4, '0')}`
  index++;
  if (index > 9999) index = 1
  return nodeId
}

/**
 * 导出文件
 * @param text 文本内容
 * @param filename 文件名
 * @param type 类型
 */
export function exportText(text, filename, type = 'application/json') {
  const blob = new Blob([text], {type: type});
  // 生成下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename; // 设置下载文件名
  document.body.appendChild(a);
  a.click();
  // 清理临时URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

//重载所有的节点id
export function reloadNodeId(nodes) {
  const reloadNode = (node, i = 0) => {
    if (node.type === 'Gateway') {
      //递归网关，网关id加上一个后缀
      node.id = getRandNodeId() + '_fork'
      //分支头部节点
      reloadNodeId(node.props.branch)
      //分支
      node.branch.forEach(branch => reloadNodeId(branch))
    } else if (node.type === 'Join') {
      //合流点，拼join
      node.id = nodes[i - 1].id.replace('_fork', '_join')
    } else {
      reloadNodeId(node)
    }
  }

  if (Array.isArray(nodes)) {
    nodes.forEach((node, i) => reloadNode(node, i))
  } else if (nodes.type === 'Gateway') {
    reloadNode(nodes)
  } else {
    nodes.id = getRandNodeId()
  }
}

export function forEachProcessNode(nodes, call) {
  if (Array.isArray(nodes)) {
    nodes.forEach(node => {
      if (node.type === "Gateway") {
        call(node)
        //继续递归分支
        node.props.branch.forEach(branch => {
          call(branch)
        })
        node.branch.forEach(branch => {
          forEachProcessNode(branch, call)
        })
      } else {
        call(node)
      }
    })
  }
}

//重载节点的parentId 和 childId
export function reloadProcessId(items, parent = null) {
  let lastBranchNodes = []
  items.forEach((item, i) => {
    if (i > 0) {
      items[i - 1].childId = item.id
      item.parentId = items[i - 1].id
    } else if (parent) {
      parent.childId = item.id
      item.parentId = parent.id
    }
    //如果是网关就递归内部的分支
    if (item.type === 'Gateway') {
      //把条件节点和子分支进行连接
      item.props.branch.forEach(branch => branch.parentId = item.id)
      //重载子分支
      item.branch.forEach((branch, bi) => {
        if (branch.length > 0) {
          item.props.branch[bi].childId = branch[0].id
        }
        //分支的末端节点
        const brEndNode = branch.length > 0 ? branch[branch.length - 1] : item.props.branch[bi]
        lastBranchNodes[bi] = brEndNode
        //递归支路，支路的父节点为条件线路分支
        reloadProcessId(branch, item.props.branch[bi])
      })
    } else if (item.type === 'Join') {
      lastBranchNodes.forEach(node => {
        if(node) node.childId = item.id
      })
      lastBranchNodes.length = 0
    }
  })
}

export function isUserNode(node) {
  return node.type === 'Approval' || node.type === 'Cc' || node.type === 'Task' || node.type === 'Start'
}

export function isNomalNode(node) {
  return isUserNode(node) || node.type === 'Trigger' || node.type === 'Subproc'
}

/**
 * 加载表单组件选项
 * @param item 表单组件
 * @param items 收集的集合
 * @param parent 父级组件
 * @param addItemFunc 添加的函数
 */
export const loadFormItem = (item, items, parent, addItemFunc, deep = true) => {
  if (Array.isArray(item)) {
    item.forEach(it => loadFormItem(it, items, null, addItemFunc, deep))
  } else if (item.props.isContainer) {
    addItemFunc(item, parent)
    item.props.columns.forEach(it => loadFormItem(it, items, null, addItemFunc, deep))
  } else if (item.type === 'TableList' || item.type === 'FormList') {
    //处理表格
    addItemFunc(item, parent)
    if (deep) item.props.columns.forEach(col => loadFormItem(col, items, item, addItemFunc, deep))
  } else {
    addItemFunc(item, parent)
  }
}

/**
 * 解析表单json，拍平成数组
 * @param json 表单json
 * @returns {*[]} 表单组件列表
 */
export const resolveFormJson = (json, deep = true) => {
  let items = []
  loadFormItem(json, items, null, (item, parent) => {
    items.push({
      ...item,
      required: item.props?.required || false,
      //添加父级组件引用
      parent: parent ? {key: parent.key, name: parent.name} : undefined,
    })
  }, deep)
  return items
}

/**
 * 获取表单字段列表
 * @returns [{表单字段信息}]
 */
export const getFormPermFields = (fields, defaultPerm = 'R') => {
  return fields.map(item => {
    return {
      id: item.id,
      key: item.key,
      name: item.parent ? `${item.parent.name}.${item.name}` : item.name,
      required: item.props?.required,
      perm: item.perm ? item.perm : defaultPerm
    }
  })
}

export const isFormItem = (item, mode) => {
  return !item.props.isContainer && (item.valueType !== 'none' || mode === 'D')
}

export const getDefault = (val, def) => {
  return (val || '').trim().length === 0 ? def : val
}

export const validNodeName = (name, err) => {
  let errorInfo = null
  const len = (name || '').trim().length
  if (name.trim().length === 0) {
    errorInfo = '节点名称不能为空'
    err.push(errorInfo)
  } else if (len > 20) {
    errorInfo = '节点名称不能超过20个字符'
    err.push(errorInfo)
  }
  return errorInfo
}

/**
 * 获取流程状态描述
 * @param item
 * @param isAgent
 * @param initiator
 * @returns {string}
 */
export function getStatusText(item, isAgent, initiator) {
  const action = item.action || item.result
  if (action === null && (item.endTime || item.finishTime)) return '任务取消'
  switch (action) {
    case 'agree':
      return '已同意'
    case 'reject':
      return '已拒绝'
    case 'startup':
      return `${isAgent ? `代 ${initiator} ` : ''}发起流程`
    case 'complete':
      return '已办理'
    case 'fallback':
      return '已退回'
    case 'forward':
      return '转交给'
    case 'comment':
      return '添加评论'
    case 'beforeAdd':
      return '前加签'
    case 'afterAdd':
      return '后加签'
    case 'cc':
      return '抄送'
    case 'revoke':
      return '撤销流程'
    case 'candidate':
      return '等待参与者认领'
    case 'cancel':
      return '任务取消'
    case 'revise':
      return '修改数据'
    case 'pass':
      return '通过流程'
    case 'refuse':
      return '驳回流程'
    default:
      return '处理中'
  }
}

