import { useEffect, useMemo, useState } from 'react';
import { useWflowStore } from '@/stores/wflow';
import { isNomalNode } from '@/utils/ProcessUtil';
import { collectNodes, deepClone } from '../processTree';
import { getModelFormInfo, getProcGroupItemsList } from '@/api/model';

export interface UseNodeInspectorOptions {
  open: boolean;
  node: any | null;
  processNodes: any[];
  formFields?: any[];
}

export function useNodeInspector({ open, node, processNodes, formFields: formFieldsProp }: UseNodeInspectorOptions) {
  const storeFormFields = useWflowStore((state) => state.formFields);
  const formFields = formFieldsProp !== undefined ? formFieldsProp : storeFormFields;
  const [draft, setDraft] = useState<any>(null);
  const [subprocGroups, setSubprocGroups] = useState<any[]>([]);
  const [subprocFields, setSubprocFields] = useState<any[]>([]);

  useEffect(() => {
    setDraft(node ? deepClone(node) : null);
  }, [node]);

  const mutate = (fn: (node: any) => void) => {
    setDraft((prev: any) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      fn(next);
      return next;
    });
  };

  const allNodes = useMemo(() => collectNodes(processNodes || []), [processNodes]);
  const nodeMap = useMemo(() => {
    const map = new Map<string, any>();
    allNodes.forEach((item) => map.set(item.id, item));
    return map;
  }, [allNodes]);

  const beforeNodes = useMemo(() => {
    if (!draft) return [];
    const result: any[] = [];
    let parentId = draft.parentId;
    const visited = new Set<string>();
    while (parentId && parentId !== 'start' && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = nodeMap.get(parentId);
      if (!parent) break;
      if (['Approval', 'Task', 'Start'].includes(parent.type)) result.push(parent);
      parentId = parent.parentId;
    }
    if (result.length === 0) {
      return allNodes.filter((item) => ['Approval', 'Task', 'Start'].includes(item.type) && item.id !== draft.id);
    }
    return result;
  }, [draft, nodeMap, allNodes]);

  const routerTargets = useMemo(
    () => allNodes.filter((item) => item.id !== draft?.id && isNomalNode(item)),
    [allNodes, draft?.id]
  );

  useEffect(() => {
    if (open && draft?.type === 'Subproc') {
      getProcGroupItemsList()
        .then((res: any) => {
          const groups = Array.isArray(res.data) ? res.data : [];
          setSubprocGroups(groups.filter((group: any) => (group.items || []).length > 0));
        })
        .catch(() => setSubprocGroups([]));
    }
  }, [open, draft?.type]);

  useEffect(() => {
    if (open && draft?.type === 'Subproc' && draft?.props?.code) {
      getModelFormInfo(draft.props.code, draft.props.isBindVer ? draft.props.version : undefined)
        .then((res: any) => {
          const info = res?.data || {};
          setSubprocFields(Array.isArray(info.formFields) ? info.formFields : []);
        })
        .catch(() => setSubprocFields([]));
    }
  }, [open, draft?.type, draft?.props?.code, draft?.props?.isBindVer, draft?.props?.version]);

  return { formFields, draft, mutate, allNodes, beforeNodes, routerTargets, subprocGroups, subprocFields };
}

export type NodeInspectorState = ReturnType<typeof useNodeInspector>;
