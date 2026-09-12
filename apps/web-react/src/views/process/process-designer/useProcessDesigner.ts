import { useMemo, useState } from 'react';
import { message } from 'antd';
import { NodeTypes, createBranchHeader } from '../ProcessNodes';
import { reloadNodeId } from '@/utils/ProcessUtil';
import { t } from '@/i18n';
import { deepClone, locateArray, locateNodeContext, replaceNodeById, reloadAndNormalize } from '../processTree';
import { validateProcess } from './validateProcess';
import type { ClipboardData, ProcessDesignerProps } from './types';

export function useProcessDesigner({ value = [], onChange, formFields }: ProcessDesignerProps) {
  const nodes = useMemo(() => (Array.isArray(value) && value.length > 0 ? value : NodeTypes.Start.create()), [value]);
  const [activeNode, setActiveNode] = useState<any>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [scale, setScale] = useState(100);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [validateErrors, setValidateErrors] = useState<string[]>([]);
  const [insertOpenKey, setInsertOpenKey] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const applyChange = (fn: (root: any[]) => void) => {
    const next = deepClone(nodes);
    fn(next);
    reloadAndNormalize(next);
    onChange?.(next);
  };

  const readClipboard = (): ClipboardData | null => {
    if (clipboard) return clipboard;
    try {
      const raw = sessionStorage.getItem('copyNode');
      if (raw) return JSON.parse(raw) as ClipboardData;
    } catch (e) {
      return null;
    }
    return null;
  };

  const storeClipboard = (data: ClipboardData) => {
    setClipboard(data);
    sessionStorage.setItem('copyNode', JSON.stringify(data));
  };

  const insertNode = (path: number[], index: number, typeKey: string) => {
    const factory = NodeTypes[typeKey];
    if (!factory) {
      message.warning(t('process.designer.unknownNodeType'));
      return;
    }
    applyChange((root) => {
      const list = locateArray(root, path);
      if (!list) return;
      list.splice(index + 1, 0, ...factory.create());
    });
  };

  const deleteNode = (path: number[], index: number) => {
    applyChange((root) => {
      const list = locateArray(root, path);
      if (!list) return;
      list.splice(index, 1);
    });
  };

  const copyNode = (node: any) => {
    storeClipboard({ kind: 'node', node: deepClone(node) });
    message.success(t('process.designer.copyNodeSuccess'));
  };

  const pasteNode = (path: number[], index: number) => {
    const data = readClipboard();
    if (!data) {
      message.warning(t('process.designer.noClipboard'));
      return;
    }
    if (data.kind === 'branch') {
      message.warning(t('process.designer.clipboardIsBranch'));
      return;
    }
    applyChange((root) => {
      const list = locateArray(root, path);
      if (!list || !data.node) return;
      const node = deepClone(data.node);
      node.name = `${node.name}-copy`;
      reloadNodeId(node);
      list.splice(index + 1, 0, node);
      if (node.type === 'Gateway') {
        list.splice(index + 2, 0, {
          id: node.id.replace(/_fork/g, '_join'),
          type: 'Join',
          name: t('process.node.join'),
          parentId: null,
          childId: null,
          props: { type: node.props?.type },
        });
      }
    });
    setClipboard(null);
    sessionStorage.removeItem('copyNode');
  };

  const addBranch = (gatewayPath: number[]) => {
    applyChange((root) => {
      const ctx = locateNodeContext(root, gatewayPath);
      const gateway = ctx?.list[ctx.index];
      if (!gateway || gateway.type !== 'Gateway') return;
      const index = (gateway.branch || []).length - 1;
      gateway.props.branch.splice(index, 0, createBranchHeader(gateway.props.type, index + 1));
      gateway.branch.splice(index, 0, []);
    });
  };

  const deleteBranch = (gatewayPath: number[], branchIndex: number) => {
    applyChange((root) => {
      const ctx = locateNodeContext(root, gatewayPath);
      const gateway = ctx?.list[ctx.index];
      if (!gateway || gateway.type !== 'Gateway') return;
      if ((gateway.branch || []).length <= 2) {
        const join = ctx.list[ctx.index + 1];
        ctx.list.splice(ctx.index, 1);
        if (join && join.type === 'Join') ctx.list.splice(ctx.index, 1);
      } else {
        gateway.props.branch.splice(branchIndex, 1);
        gateway.branch.splice(branchIndex, 1);
      }
    });
  };

  const moveBranch = (gatewayPath: number[], branchIndex: number, delta: number) => {
    const target = branchIndex + delta;
    applyChange((root) => {
      const ctx = locateNodeContext(root, gatewayPath);
      const gateway = ctx?.list[ctx.index];
      if (!gateway || gateway.type !== 'Gateway') return;
      const headers = gateway.props.branch || [];
      const bodies = gateway.branch || [];
      if (target < 0 || target >= headers.length) return;
      [headers[branchIndex], headers[target]] = [headers[target], headers[branchIndex]];
      [bodies[branchIndex], bodies[target]] = [bodies[target], bodies[branchIndex]];
    });
  };

  const copyBranch = (gatewayPath: number[], branchIndex: number) => {
    const ctx = locateNodeContext(nodes, gatewayPath);
    const gateway = ctx?.list[ctx.index];
    if (!gateway) return;
    storeClipboard({
      kind: 'branch',
      brNode: deepClone(gateway.props.branch[branchIndex]),
      brNodes: deepClone(gateway.branch[branchIndex]),
    });
    message.success(t('process.designer.copyBranchSuccess'));
  };

  const pasteBranch = (gatewayPath: number[]) => {
    const data = readClipboard();
    if (!data || data.kind !== 'branch' || !data.brNode) {
      message.warning(t('process.designer.clipboardNotBranch'));
      return;
    }
    applyChange((root) => {
      const ctx = locateNodeContext(root, gatewayPath);
      const gateway = ctx?.list[ctx.index];
      if (!gateway) return;
      const header = deepClone(data.brNode);
      const body = deepClone(data.brNodes) || [];
      header.name = `${header.name}-copy`;
      reloadNodeId(header);
      reloadNodeId(body);
      const index = (gateway.branch || []).length - 1;
      gateway.props.branch.splice(index, 0, header);
      gateway.branch.splice(index, 0, body);
    });
    setClipboard(null);
    sessionStorage.removeItem('copyNode');
  };

  const openNode = (node: any, selectable = true) => {
    if (!selectable) return;
    setActiveNode(node);
    setInspectorOpen(true);
  };

  const saveNode = (next: any) => {
    applyChange((root) => {
      replaceNodeById(root, next.id, next);
    });
    setInspectorOpen(false);
    setActiveNode(null);
  };

  const runValidate = () => {
    const errors = validateProcess(nodes);
    setValidateErrors(errors);
    setValidateOpen(true);
    if (errors.length === 0) message.success(t('process.designer.validatePass'));
  };

  return {
    nodes,
    activeNode,
    inspectorOpen,
    scale,
    jsonOpen,
    validateOpen,
    validateErrors,
    insertOpenKey,
    clipboard,
    formFields,
    setActiveNode,
    setInspectorOpen,
    setScale,
    setJsonOpen,
    setValidateOpen,
    setInsertOpenKey,
    applyChange,
    readClipboard,
    storeClipboard,
    insertNode,
    deleteNode,
    copyNode,
    pasteNode,
    addBranch,
    deleteBranch,
    moveBranch,
    copyBranch,
    pasteBranch,
    openNode,
    saveNode,
    runValidate,
  };
}

export type ProcessDesignerApi = ReturnType<typeof useProcessDesigner>;
