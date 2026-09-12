import type { FormItemConfig } from '@/types/workflow';
import { t } from '@/i18n';
import { randomFieldKey } from '../catalog';

/** 左侧组件库插入位置 */
export type InsertTarget =
  | { kind: 'root' }
  | { kind: 'spanCol'; containerId: string; col: number }
  | { kind: 'tableCell'; containerId: string; row: number; col: number }
  | { kind: 'listColumns'; containerId: string };

export const ROOT_TARGET: InsertTarget = { kind: 'root' };

export function sameTarget(a: InsertTarget | null | undefined, b: InsertTarget | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'root') return true;
  if (a.kind === 'spanCol' && b.kind === 'spanCol') {
    return a.containerId === b.containerId && a.col === b.col;
  }
  if (a.kind === 'tableCell' && b.kind === 'tableCell') {
    return a.containerId === b.containerId && a.row === b.row && a.col === b.col;
  }
  if (a.kind === 'listColumns' && b.kind === 'listColumns') {
    return a.containerId === b.containerId;
  }
  return false;
}

export function deepClone<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function isSpanLayout(item?: FormItemConfig | null): boolean {
  return !!item && item.type === 'SpanLayout' && item.props?.isContainer === true;
}

export function isTableLayout(item?: FormItemConfig | null): boolean {
  return !!item && item.type === 'TableLayout' && item.props?.isContainer === true;
}

export function isListContainer(item?: FormItemConfig | null): boolean {
  return !!item && (item.type === 'TableList' || item.type === 'FormList');
}

export function isContainerItem(item?: FormItemConfig | null): boolean {
  return !!item && item.props?.isContainer === true;
}

/** 读取一个容器节点的子列表（Span 为每栏、TableLayout 为每个单元格、TableList/FormList 为每列） */
export function childListsOf(item: FormItemConfig): FormItemConfig[][] {
  const columns = item.props?.columns;
  if (!Array.isArray(columns)) return [];
  if (isTableLayout(item)) {
    return columns.flatMap((row: any) => (Array.isArray(row) ? row.filter((cell: any) => Array.isArray(cell)) : []));
  }
  if (isSpanLayout(item)) {
    return columns.filter((col: any) => Array.isArray(col));
  }
  if (isListContainer(item)) {
    return columns.filter((col: any) => col && typeof col === 'object').map((col: any) => [col]);
  }
  return [];
}

/** 不可变地映射一个容器节点的所有子列表 */
export function mapChildren(item: FormItemConfig, fn: (list: FormItemConfig[]) => FormItemConfig[]): FormItemConfig {
  const columns = item.props?.columns;
  if (!Array.isArray(columns)) return item;
  if (isTableLayout(item)) {
    return {
      ...item,
      props: {
        ...item.props,
        columns: columns.map((row: any) =>
          Array.isArray(row) ? row.map((cell: any) => (Array.isArray(cell) ? fn(cell) : cell)) : row
        ),
      },
    };
  }
  if (isSpanLayout(item)) {
    return {
      ...item,
      props: { ...item.props, columns: columns.map((col: any) => (Array.isArray(col) ? fn(col) : col)) },
    };
  }
  if (isListContainer(item)) {
    const nextColumns = columns
      .map((col: any) => (col && typeof col === 'object' ? fn([col])[0] : col))
      .filter((col: any) => col !== undefined && col !== null);
    return { ...item, props: { ...item.props, columns: nextColumns } };
  }
  return item;
}

export function findNode(items: FormItemConfig[], id: string): FormItemConfig | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    for (const list of childListsOf(item)) {
      const found = findNode(list, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function mapNode(
  items: FormItemConfig[],
  id: string,
  updater: (item: FormItemConfig) => FormItemConfig
): FormItemConfig[] {
  return items.map((item) => {
    if (item.id === id) return updater(item);
    return mapChildren(item, (list) => mapNode(list, id, updater));
  });
}

export function removeNode(items: FormItemConfig[], id: string): FormItemConfig[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => mapChildren(item, (list) => removeNode(list, id)));
}

export function getTargetList(components: FormItemConfig[], target: InsertTarget): FormItemConfig[] {
  if (target.kind === 'root') return components;
  const node = findNode(components, target.containerId);
  const columns = node?.props?.columns;
  if (!Array.isArray(columns)) return [];
  if (target.kind === 'spanCol') {
    const col = columns[target.col];
    return Array.isArray(col) ? (col as FormItemConfig[]) : [];
  }
  if (target.kind === 'tableCell') {
    const row = columns[target.row];
    const cell = Array.isArray(row) ? row[target.col] : undefined;
    return Array.isArray(cell) ? (cell as FormItemConfig[]) : [];
  }
  return columns as FormItemConfig[];
}

export function replaceTargetList(
  components: FormItemConfig[],
  target: InsertTarget,
  list: FormItemConfig[]
): FormItemConfig[] {
  if (target.kind === 'root') return list;
  const node = findNode(components, target.containerId);
  if (!node) return components;
  const columns: any[] = Array.isArray(node.props?.columns) ? [...node.props.columns] : [];
  if (target.kind === 'spanCol') {
    columns[target.col] = list;
  } else if (target.kind === 'tableCell') {
    const row = Array.isArray(columns[target.row]) ? [...columns[target.row]] : [];
    row[target.col] = list;
    columns[target.row] = row;
  } else {
    columns.splice(0, columns.length, ...list);
  }
  return mapNode(components, target.containerId, (item) => ({
    ...item,
    props: { ...item.props, columns },
  }));
}

export function appendToTarget(components: FormItemConfig[], target: InsertTarget, item: FormItemConfig): FormItemConfig[] {
  return replaceTargetList(components, target, [...getTargetList(components, target), item]);
}

export function insertAfterInTarget(
  components: FormItemConfig[],
  target: InsertTarget,
  index: number,
  item: FormItemConfig
): FormItemConfig[] {
  const list = getTargetList(components, target);
  const next = [...list.slice(0, index + 1), item, ...list.slice(index + 1)];
  return replaceTargetList(components, target, next);
}

export function moveInTarget(
  components: FormItemConfig[],
  target: InsertTarget,
  index: number,
  dir: 'up' | 'down'
): FormItemConfig[] {
  const list = getTargetList(components, target);
  const to = dir === 'up' ? index - 1 : index + 1;
  if (to < 0 || to >= list.length || index < 0 || index >= list.length) return components;
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return replaceTargetList(components, target, next);
}

export function deleteFromTarget(components: FormItemConfig[], target: InsertTarget, index: number): FormItemConfig[] {
  const list = getTargetList(components, target);
  if (index < 0 || index >= list.length) return components;
  return replaceTargetList(components, target, list.filter((_, i) => i !== index));
}

/** 深拷贝节点并重置 id/key（含嵌套子节点） */
export function cloneWithNewIds(item: FormItemConfig): FormItemConfig {
  const reId = (node: FormItemConfig): FormItemConfig => {
    const next = mapChildren(deepClone(node), (list) => list.map(reId));
    next.id = `wflow_${randomFieldKey('n')}`;
    next.key = `${node.type || 'field'}_${randomFieldKey('k')}`;
    return next;
  };
  return reId(item);
}

/** 目标位置的文字描述，用于左侧组件库提示 */
export function describeTarget(components: FormItemConfig[], target: InsertTarget, separator = ''): string {
  if (target.kind === 'root') return t('form.designer.target.root');
  const node = findNode(components, target.containerId);
  if (!node) return t('form.designer.target.root');
  if (target.kind === 'spanCol') {
    return `${node.name}${separator}${t('form.designer.target.col').replace('{col}', String(target.col + 1))}`;
  }
  if (target.kind === 'tableCell') {
    return `${node.name}${separator}${t('form.designer.target.cell')
      .replace('{row}', String(target.row + 1))
      .replace('{col}', String(target.col + 1))}`;
  }
  return `${node.name}${separator}${t('form.designer.target.listCol')}`;
}
