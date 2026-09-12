import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, message } from 'antd';
import { getInstDetail } from '@/api/instance';
import { getManagerInstDetail, managerHandleTask } from '@/api/manager';
import {
  handlerTask,
  reviseInstance,
  urgingTask,
  getFallbackNodes,
  getWithdrawNodes,
  type FallbackNode,
} from '@/api/task';
import { getOldSign, saveSign } from '@/api/org';
import { getPrintConf } from '@/api/model';
import { t } from '@/i18n';
import type { FormRenderRef } from '@/views/form/FormRender';
import type { ResFile } from '@/components/WResUpload';
import type { PrintHandle } from '@/views/print/DefaultPrint';
import type { InstanceDetail, OperationPerm, OrgTarget, TodoTask } from '@/types/workflow';
import { resolveFormJson } from '@/utils/ProcessUtil';
import { parseFormSource, walkComponents, type ActionKind, type ProcessInstPreviewProps } from './helpers';

export function useProcessInstPreview(props: ProcessInstPreviewProps) {
  const { open, instId, taskId, nodeId, adminMode = false, onSuccess } = props;
  const [loading, setLoading] = useState(false);
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [parentInst, setParentInst] = useState<InstanceDetail | null>(null);
  const [activeTab, setActiveTab] = useState('form');
  const formRef = useRef<FormRenderRef | null>(null);
  const parentFormRef = useRef<FormRenderRef | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(taskId);
  const [handlerOpen, setHandlerOpen] = useState(false);
  const [handlerAction, setHandlerAction] = useState<ActionKind>('agree');
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState<ResFile[]>([]);
  const [commentFiles, setCommentFiles] = useState<ResFile[]>([]);
  const [atUsers, setAtUsers] = useState<OrgTarget[]>([]);
  const [targetUsers, setTargetUsers] = useState<OrgTarget[]>([]);
  const [targetNode, setTargetNode] = useState<string | undefined>();
  const [nodeOptions, setNodeOptions] = useState<FallbackNode[]>([]);
  const [atPickerOpen, setAtPickerOpen] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [oldSign, setOldSign] = useState<string>('');
  const [useOldSign, setUseOldSign] = useState(false);
  const [saveSignChecked, setSaveSignChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [urgingOpen, setUrgingOpen] = useState(false);
  const [urgingUsers, setUrgingUsers] = useState<OrgTarget[]>([]);
  const [urgingRemark, setUrgingRemark] = useState('');

  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseComment, setReviseComment] = useState('');

  const [printOpen, setPrintOpen] = useState(false);
  const [printConf, setPrintConf] = useState<{ type: string; template: any } | null>(null);
  const [printFields, setPrintFields] = useState<any[]>([]);
  const [printPermConf, setPrintPermConf] = useState<Record<string, string>>({});
  const [customPrint, setCustomPrint] = useState(false);
  const printRef = useRef<PrintHandle | null>(null);

  useEffect(() => {
    if (open && instId) {
      setSelectedTaskId(taskId);
      loadDetail();
    } else {
      setInstance(null);
      setParentInst(null);
    }
  }, [open, instId, nodeId, taskId, adminMode]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = adminMode
        ? await getManagerInstDetail(instId, taskId, nodeId)
        : await getInstDetail(instId, nodeId);
      const data: InstanceDetail = res.data;
      setInstance(data);
      if (!taskId) setSelectedTaskId(data.todoTasks?.[0]?.taskId);
      if (data.parentInstId) loadParent(data.parentInstId);
      else setParentInst(null);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.usePreview.loadDetailFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadParent = async (parentId: string) => {
    try {
      const res = await getInstDetail(parentId);
      setParentInst(res.data);
    } catch {
      setParentInst(null);
    }
  };

  const formSource = useMemo(() => parseFormSource(instance?.formSource), [instance?.formSource]);
  const parentFormSource = useMemo(() => parseFormSource(parentInst?.formSource), [parentInst?.formSource]);
  const hasForm = instance?.formType !== 4;
  const selectedTask: TodoTask | undefined = instance?.todoTasks?.find((task) => task.taskId === selectedTaskId) || instance?.todoTasks?.[0];
  const op: OperationPerm = instance?.operationPerm || {};
  const canHandle = Boolean(selectedTask) || adminMode;
  const hasActions = Object.values(op).some((item: any) => item?.enable);

  const permConf = useMemo(() => {
    const result: Record<string, string> = { ...(instance?.fieldPerm || {}) };
    const fallback = adminMode ? 'E' : instance?.defaultFieldPerm || 'R';
    walkComponents(formSource.components, (item) => {
      const key = item.key || item.id;
      if (key && result[key] === undefined) result[key] = fallback;
    });
    return result;
  }, [instance?.fieldPerm, instance?.defaultFieldPerm, adminMode, formSource.components]);

  const editableKeys = useMemo(() => {
    const keys = new Set<string>();
    walkComponents(formSource.components, (item) => {
      const key = item.key || item.id;
      if (key && (adminMode || permConf[key] === 'E')) keys.add(key);
    });
    return keys;
  }, [formSource.components, permConf, adminMode]);

  const collectFormValues = (): Record<string, any> => {
    const values = formRef.current?.getValues() || instance?.formData || {};
    if (adminMode) return values;
    return Object.fromEntries(Object.entries(values).filter(([key]) => editableKeys.has(key)));
  };

  const currentNeedSign = selectedTask?.needSign === true;

  const openHandler = async (action: ActionKind) => {
    if (['agree', 'complete', 'reject'].includes(action) && hasForm) {
      try {
        await formRef.current?.validate();
      } catch {
        message.warning(t('workspace.usePreview.requiredFields'));
        return;
      }
    }
    setHandlerAction(action);
    setCommentText(
      action === 'agree'
        ? t('workspace.usePreview.agreed')
        : action === 'reject'
          ? t('workspace.usePreview.disagreed')
          : ''
    );
    setCommentImages([]);
    setCommentFiles([]);
    setAtUsers([]);
    setTargetUsers([]);
    setTargetNode(undefined);
    setSignature('');
    setSaveSignChecked(false);
    setUseOldSign(false);
    setNodeOptions([]);
    if (action === 'fallback') {
      try {
        const res = await getFallbackNodes(instId, selectedTaskId);
        const options: FallbackNode[] = res.data || [];
        setNodeOptions(options);
        setTargetNode(options[0]?.nodeId);
      } catch (e: any) {
        message.error(e?.msg || t('workspace.usePreview.fallbackNodesFailed'));
        return;
      }
    }
    if (action === 'withdraw') {
      try {
        const res = await getWithdrawNodes(instId);
        const options: FallbackNode[] = res.data || [];
        setNodeOptions(options);
        setTargetNode(options[0]?.nodeId);
      } catch (e: any) {
        message.error(e?.msg || t('workspace.usePreview.withdrawNodesFailed'));
        return;
      }
    }
    if (action === 'agree' || action === 'complete') {
      if (currentNeedSign) {
        try {
          const res = await getOldSign();
          setOldSign(res.data || '');
          if (res.data) setUseOldSign(true);
        } catch {
          setOldSign('');
        }
      }
    }
    setHandlerOpen(true);
  };

  const confirmRevoke = () => {
    Modal.confirm({
      title: t('workspace.usePreview.revokeTitle'),
      content: t('workspace.usePreview.revokeContent'),
      okText: t('workspace.usePreview.revokeOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        setSubmitting(true);
        try {
          await handlerTask({
            instId,
            action: 'revoke',
            comment: { text: t('workspace.usePreview.revokeComment'), images: [], files: [] },
            requestId: crypto.randomUUID(),
          });
          message.success(t('workspace.usePreview.revoked'));
          onSuccess?.();
          loadDetail();
        } catch (e: any) {
          message.error(e?.msg || t('common.failed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const submitHandler = async () => {
    if (['forward', 'beforeAdd', 'afterAdd'].includes(handlerAction) && targetUsers.length !== 1) {
      message.warning(t('workspace.usePreview.selectOneTarget'));
      return;
    }
    if (['fallback', 'withdraw'].includes(handlerAction) && !targetNode) {
      message.warning(t('workspace.usePreview.selectTargetNode'));
      return;
    }
    if (
      (handlerAction === 'agree' || handlerAction === 'complete') &&
      currentNeedSign &&
      !(useOldSign ? oldSign : signature)
    ) {
      message.warning(t('workspace.usePreview.signFirst'));
      return;
    }
    setSubmitting(true);
    try {
      const comment = {
        text: commentText,
        images: commentImages,
        files: commentFiles,
        atUsers,
      };
      if (adminMode) {
        await managerHandleTask({
          requestId: crypto.randomUUID(),
          instId,
          taskId: selectedTaskId,
          action: handlerAction === 'comment' ? 'complete' : handlerAction === 'withdraw' ? 'revoke' : handlerAction,
          formData: collectFormValues(),
          targetUsers: targetUsers.map((user) => user.id),
          comment,
          signature: useOldSign ? oldSign : signature || undefined,
        });
      } else {
        const payload: Record<string, any> = {
          instId,
          taskId: selectedTaskId ?? null,
          action: handlerAction,
          formData: collectFormValues(),
          comment,
          atUsers,
          requestId: crypto.randomUUID(),
        };
        if (['forward', 'beforeAdd', 'afterAdd'].includes(handlerAction)) payload.targetUsers = targetUsers.map((user) => user.id);
        if (['fallback', 'withdraw'].includes(handlerAction)) payload.targetNode = targetNode;
        if (handlerAction === 'agree' || handlerAction === 'complete') {
          const sign = useOldSign ? oldSign : signature;
          if (sign) payload.signature = sign;
        }
        await handlerTask(payload);
      }
      if (saveSignChecked) {
        const sign = useOldSign ? oldSign : signature;
        if (sign) await saveSign(sign).catch(() => undefined);
      }
      message.success(t('workspace.usePreview.handled'));
      setHandlerOpen(false);
      onSuccess?.();
      loadDetail();
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitRevise = async () => {
    setSubmitting(true);
    try {
      const values = adminMode
        ? formRef.current?.getValues() || {}
        : Object.fromEntries(
            Object.entries(formRef.current?.getValues() || {}).filter(([key]) => (instance?.fieldPerm || {})[key] !== 'R')
          );
      await reviseInstance({
        instId,
        formData: values,
        comment: { text: reviseComment, images: [], files: [] },
        requestId: crypto.randomUUID(),
      });
      message.success(t('workspace.usePreview.reviseSuccess'));
      setReviseOpen(false);
      setReviseComment('');
      onSuccess?.();
      loadDetail();
    } catch (e: any) {
      message.error(e?.msg || t('workspace.usePreview.reviseFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitUrging = async () => {
    if (!urgingUsers.length) {
      message.warning(t('workspace.usePreview.selectUrgingUsers'));
      return;
    }
    setSubmitting(true);
    try {
      await urgingTask({ instId, targetUserIds: urgingUsers.map((user) => user.id), remark: urgingRemark });
      message.success(t('workspace.usePreview.urgingSuccess'));
      setUrgingOpen(false);
      setUrgingUsers([]);
      setUrgingRemark('');
    } catch (e: any) {
      message.error(e?.msg || t('workspace.usePreview.urgingFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const openPrint = async () => {
    try {
      setPrintFields(resolveFormJson(formSource.components, false));
      setPrintPermConf((instance?.fieldPerm || {}) as Record<string, string>);
      const res = await getPrintConf(instance?.defineId || '');
      const type = res.data?.type;
      let template: any = null;
      if (res.data?.template) {
        try {
          template = typeof res.data.template === 'string' ? JSON.parse(res.data.template) : res.data.template;
        } catch {
          template = null;
        }
      }
      setPrintConf({ type, template });
      setCustomPrint(type !== 'DEFAULT' && !!template);
      setPrintOpen(true);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.usePreview.printConfFailed'));
    }
  };

  return {
    loading,
    instance,
    parentInst,
    activeTab,
    setActiveTab,
    formRef,
    parentFormRef,
    selectedTaskId,
    setSelectedTaskId,
    handlerOpen,
    setHandlerOpen,
    handlerAction,
    commentText,
    setCommentText,
    commentImages,
    setCommentImages,
    commentFiles,
    setCommentFiles,
    atUsers,
    setAtUsers,
    targetUsers,
    setTargetUsers,
    targetNode,
    setTargetNode,
    nodeOptions,
    atPickerOpen,
    setAtPickerOpen,
    signature,
    setSignature,
    oldSign,
    useOldSign,
    setUseOldSign,
    saveSignChecked,
    setSaveSignChecked,
    submitting,
    urgingOpen,
    setUrgingOpen,
    urgingUsers,
    setUrgingUsers,
    urgingRemark,
    setUrgingRemark,
    reviseOpen,
    setReviseOpen,
    reviseComment,
    setReviseComment,
    printOpen,
    setPrintOpen,
    printConf,
    printFields,
    printPermConf,
    customPrint,
    setCustomPrint,
    printRef,
    formSource,
    parentFormSource,
    hasForm,
    selectedTask,
    op,
    canHandle,
    hasActions,
    currentNeedSign,
    openHandler,
    confirmRevoke,
    submitHandler,
    submitRevise,
    submitUrging,
    openPrint,
  };
}

export type ProcessInstPreviewApi = ReturnType<typeof useProcessInstPreview>;
