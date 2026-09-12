import { reloadProcessId } from '@/utils/ProcessUtil';

export type NodePath = number[];

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function locateArray(root: any[], path: NodePath): any[] | null {
  let list: any[] = root;
  for (let i = 0; i + 1 < path.length; i += 2) {
    const node = list[path[i]];
    if (!node || node.type !== 'Gateway') return null;
    const branch = node.branch?.[path[i + 1]];
    if (!Array.isArray(branch)) return null;
    list = branch;
  }
  return list;
}

export function locateNodeContext(root: any[], path: NodePath): { list: any[]; index: number } | null {
  if (!path.length) return null;
  const list = locateArray(root, path.slice(0, -1));
  const index = path[path.length - 1];
  if (!list || !list[index]) return null;
  return { list, index };
}

export function forEachNode(nodes: any[] | undefined, callback: (node: any) => void): void {
  if (!Array.isArray(nodes)) return;
  nodes.forEach((node) => {
    if (!node) return;
    callback(node);
    if (node.type === 'Gateway') {
      (node.props?.branch || []).forEach((header: any) => header && callback(header));
      (node.branch || []).forEach((body: any[]) => forEachNode(body, callback));
    }
  });
}

export function collectNodes(root: any[]): any[] {
  const result: any[] = [];
  forEachNode(root, (node) => result.push(node));
  return result;
}

export function replaceNodeById(nodes: any[] | undefined, id: string, next: any): boolean {
  if (!Array.isArray(nodes)) return false;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (node.id === id) {
      nodes[i] = next;
      return true;
    }
    if (node.type === 'Gateway') {
      if (replaceNodeById(node.props?.branch, id, next)) return true;
      for (const body of node.branch || []) {
        if (replaceNodeById(body, id, next)) return true;
      }
    }
  }
  return false;
}

function clearDanglingLinks(root: any[]): void {
  const ids = new Set<string>();
  forEachNode(root, (node) => node?.id && ids.add(node.id));
  forEachNode(root, (node) => {
    if (!node) return;
    if (node.childId && !ids.has(node.childId)) node.childId = null;
    if (node.parentId && node.parentId !== 'start' && !ids.has(node.parentId)) node.parentId = null;
  });
}

export function reloadAndNormalize(root: any[]): void {
  reloadProcessId(root);
  clearDanglingLinks(root);
}
