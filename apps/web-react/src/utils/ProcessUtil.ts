import { t } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

let index = 1;

export function getRandNodeId(): string {
  const nodeId = `node_${Date.now()}${index.toString().padStart(4, '0')}`;
  index++;
  if (index > 9999) index = 1;
  return nodeId;
}

export function exportText(text: string, filename: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function reloadNodeId(nodes: any) {
  const reloadNode = (node: any, i = 0) => {
    if (!node) return;
    if (node.type === 'Gateway') {
      node.id = getRandNodeId() + '_fork';
      if (node.props?.branch) reloadNodeId(node.props.branch);
      if (Array.isArray(node.branch)) {
        node.branch.forEach((b: any) => reloadNodeId(b));
      }
    } else if (node.type === 'Join') {
      node.id = nodes[i - 1]?.id ? nodes[i - 1].id.replace('_fork', '_join') : getRandNodeId();
    } else {
      node.id = getRandNodeId();
    }
  };

  if (Array.isArray(nodes)) {
    nodes.forEach((node, i) => reloadNode(node, i));
  } else if (nodes && nodes.type === 'Gateway') {
    reloadNode(nodes);
  } else if (nodes) {
    nodes.id = getRandNodeId();
  }
}

export function forEachProcessNode(nodes: any, callback: (node: any) => void) {
  if (Array.isArray(nodes)) {
    nodes.forEach((node) => {
      if (!node) return;
      if (node.type === 'Gateway') {
        callback(node);
        node.props?.branch?.forEach((branch: any) => callback(branch));
        node.branch?.forEach((branch: any) => forEachProcessNode(branch, callback));
      } else {
        callback(node);
      }
    });
  }
}

export function reloadProcessId(items: any[], parent: any = null) {
  const lastBranchNodes: any[] = [];
  items.forEach((item, i) => {
    if (i > 0) {
      items[i - 1].childId = item.id;
      item.parentId = items[i - 1].id;
    } else if (parent) {
      parent.childId = item.id;
      item.parentId = parent.id;
    }
    if (item.type === 'Gateway') {
      item.props?.branch?.forEach((branch: any) => (branch.parentId = item.id));
      item.branch?.forEach((branch: any[], bi: number) => {
        if (branch.length > 0 && item.props?.branch?.[bi]) {
          item.props.branch[bi].childId = branch[0].id;
        }
        const brEndNode = branch.length > 0 ? branch[branch.length - 1] : item.props?.branch?.[bi];
        lastBranchNodes[bi] = brEndNode;
        reloadProcessId(branch, item.props?.branch?.[bi]);
      });
    } else if (item.type === 'Join') {
      lastBranchNodes.forEach((node) => {
        if (node) node.childId = item.id;
      });
      lastBranchNodes.length = 0;
    }
  });
}

export function isUserNode(node: any) {
  return node && ['Approval', 'Cc', 'Task', 'Start', 'ROOT', 'APPROVAL', 'TASK', 'CC'].includes(node.type);
}

export function isNomalNode(node: any) {
  return isUserNode(node) || (node && ['Trigger', 'Subproc', 'TRIGGER', 'SUBPROC'].includes(node.type));
}

export function loadFormItem(item: any, items: any[], parent: any, addItemFunc: Function, deep = true) {
  if (!item) return;
  if (Array.isArray(item)) {
    item.forEach((it) => loadFormItem(it, items, null, addItemFunc, deep));
  } else if (item.props?.isContainer && Array.isArray(item.props.columns)) {
    addItemFunc(item, parent);
    item.props.columns.forEach((it: any) => loadFormItem(it, items, null, addItemFunc, deep));
  } else if (item.type === 'TableList' || item.type === 'FormList') {
    addItemFunc(item, parent);
    if (deep && Array.isArray(item.props?.columns)) {
      item.props.columns.forEach((col: any) => loadFormItem(col, items, item, addItemFunc, deep));
    }
  } else {
    addItemFunc(item, parent);
  }
}

export function resolveFormJson(json: any, deep = true) {
  const items: any[] = [];
  loadFormItem(json, items, null, (item: any, parent: any) => {
    items.push({
      ...item,
      required: item.props?.required || false,
      parent: parent ? { key: parent.key, name: parent.name, type: parent.type } : undefined,
    });
  }, deep);
  return items;
}

export function getFormPermFields(fields: any[], defaultPerm = 'R') {
  return fields.map((item) => ({
    id: item.id,
    key: item.key || item.id,
    name: item.parent ? `${item.parent.name}.${item.name || item.title}` : item.name || item.title,
    required: item.props?.required || item.required,
    perm: item.perm || defaultPerm,
  }));
}

export function getStatusText(item: any, isAgent = false, initiator = ''): string {
  if (!item) return t('workspace.statusText.processing');
  const action = item.action || item.result;
  if (action === null && (item.endTime || item.finishTime)) return t('workspace.statusText.taskCancelled');
  switch (action) {
    case 'agree':
    case 'PASS':
      return t('workspace.statusText.agreed');
    case 'reject':
    case 'REFUSE':
      return t('workspace.statusText.refused');
    case 'startup':
      return isAgent
        ? formatMessage(t('workspace.statusText.startedByAgent'), { name: initiator })
        : t('workspace.statusText.started');
    case 'complete':
      return t('workspace.statusText.completed');
    case 'fallback':
      return t('workspace.statusText.returned');
    case 'forward':
    case 'transfer':
      return t('workspace.statusText.forwarded');
    case 'comment':
      return t('workspace.statusText.commented');
    case 'beforeAdd':
      return t('workspace.statusText.beforeAdd');
    case 'afterAdd':
      return t('workspace.statusText.afterAdd');
    case 'cc':
      return t('workspace.statusText.cc');
    case 'revoke':
    case 'CANCEL':
      return t('workspace.statusText.revoked');
    case 'candidate':
      return t('workspace.statusText.waitingClaim');
    case 'cancel':
      return t('workspace.statusText.taskCancelled');
    case 'revise':
      return t('workspace.statusText.revised');
    case 'pass':
      return t('workspace.statusText.passedProcess');
    case 'refuse':
      return t('workspace.statusText.refusedProcess');
    default:
      return t('workspace.statusText.processing');
  }
}
