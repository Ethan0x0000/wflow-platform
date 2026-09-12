import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, message } from 'antd';
import {
  saveModel,
  deployModel,
  getProcActiveModel,
  getProcModelByVer,
  getHisModels,
  activeModel,
  updateModel,
  moveModel,
  getProcGroup,
  createProcGroup,
} from '@/api/model';
import { NodeTypes } from '@/views/process/ProcessNodes';
import type { OrgTarget } from '@/types/workflow';
import {
  createDefaultEvents,
  createDefaultFormCode,
  createDefaultFormJson,
  createDefaultFormRef,
  createDefaultLogo,
  createDefaultSetting,
  flattenFormFields,
  getFormCode,
  normalizeSetting,
  sanitizeSetting,
  parseJson,
  type FormCodeConf,
  type FormRefConf,
  type ModelLogo,
  type ProcSetting,
} from '@/components/modelDefaults';
import type { GroupRow, HisModel, TabKey } from './types';
import { useTranslation } from '@/i18n';

export function useModelDesigner() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialCode = searchParams.get('code') || '';
  const initialGroupId = searchParams.get('groupId') || '';

  const [activeTab, setActiveTab] = useState<TabKey>('BASE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Model meta
  const [code, setCode] = useState(initialCode);
  const [procName, setProcName] = useState(t('admin.common.untitledProcess'));
  const [logo, setLogo] = useState<ModelLogo>(createDefaultLogo);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [formType, setFormType] = useState(0);
  const [remark, setRemark] = useState('');
  const [version, setVersion] = useState(0);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  // Designer data
  const [formJson, setFormJson] = useState<Record<string, any>>(createDefaultFormJson);
  const [formCode, setFormCode] = useState<FormCodeConf>(createDefaultFormCode);
  const [formRef, setFormRef] = useState<FormRefConf>(createDefaultFormRef);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [processNodes, setProcessNodes] = useState<any[]>(() => NodeTypes.Start.create());
  const [events, setEvents] = useState<Record<string, any>>(createDefaultEvents);
  const [startupRange, setStartupRange] = useState('ALL');
  const [startupPerm, setStartupPerm] = useState<OrgTarget[]>([]);
  const [adminPerm, setAdminPerm] = useState<OrgTarget[]>([]);
  const [setting, setSetting] = useState<ProcSetting>(createDefaultSetting);

  // Groups
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Version history
  const [hisModels, setHisModels] = useState<HisModel[]>([]);
  const [hisPage, setHisPage] = useState(1);
  const [hisPages, setHisPages] = useState(0);
  const [hisOpen, setHisOpen] = useState(false);

  // Modals
  const [validModalOpen, setValidModalOpen] = useState(false);
  const [validErrors, setValidErrors] = useState<string[]>([]);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const publishedExists = useMemo(() => hisModels.some((item) => item.status >= 1), [hisModels]);

  const applyModelData = (data: any) => {
    setCode(data.code || '');
    setProcName(data.procName || data.name || t('admin.common.untitledProcess'));
    setLogo(parseJson<ModelLogo>(data.logo, createDefaultLogo()));
    setGroupId(data.groupId || initialGroupId);
    setFormType(Number(data.formType ?? 0));
    setRemark(data.remark || '');
    setVersion(Number(data.version || 0));
    setHasNewVersion(Boolean(data.hasNewVersion));
    setFormJson(parseJson<Record<string, any>>(data.formJson, createDefaultFormJson()));
    setFormCode(getFormCode(data.formCode));
    setFormRef(parseJson<FormRefConf>(data.formRef, createDefaultFormRef()));
    setFormFields(parseJson<any[]>(data.formFields, []));
    const parsedProcess = parseJson<any>(data.process, []);
    setProcessNodes(Array.isArray(parsedProcess) ? parsedProcess : [parsedProcess]);
    setEvents(parseJson<Record<string, any>>(data.events, createDefaultEvents()));
    setStartupRange(data.startupRange || 'ALL');
    setStartupPerm(parseJson<OrgTarget[]>(data.startupPerm, []));
    setAdminPerm(parseJson<OrgTarget[]>(data.adminPerm, []));
    setSetting(normalizeSetting(parseJson<Record<string, any>>(data.setting, {})));
  };

  const loadModelData = async (modelCode: string) => {
    setLoading(true);
    try {
      const res = await getProcActiveModel(modelCode);
      applyModelData(res.data);
      setActiveTab('BASE');
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelDesigner.fetchModelFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await getProcGroup();
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelDesigner.fetchGroupsFailed'));
    }
  };

  const fetchHistory = async (modelCode: string, pageNo: number) => {
    if (!modelCode) return;
    try {
      const res = await getHisModels({ code: modelCode, pageNo, pageSize: 10 });
      setHisModels(Array.isArray(res.data?.records) ? res.data.records : []);
      setHisPages(Number(res.data?.pages || 0));
      setHisPage(Number(res.data?.pageNo || pageNo));
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelDesigner.fetchHistoryFailed'));
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  useEffect(() => {
    if (initialCode) void loadModelData(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (code) void fetchHistory(code, hisPage);
  }, [code, hisPage]);

  useEffect(() => {
    if (!initialCode && !initialGroupId && !groupId && groups.length > 0) setGroupId(groups[0].id);
  }, [groups, initialCode, initialGroupId, groupId]);

  const collectFormFields = (): any[] => {
    const components = Array.isArray(formJson?.components) ? formJson.components : [];
    if (components.length > 0) return flattenFormFields(components);
    return formFields;
  };

  const buildPayload = (): Record<string, any> => {
    const fields = collectFormFields();
    return {
      code: code || undefined,
      procName,
      name: procName,
      groupId,
      formType,
      remark,
      logo: JSON.stringify(logo),
      formJson: JSON.stringify(formJson || createDefaultFormJson()),
      formRef: JSON.stringify(formRef),
      formCode: JSON.stringify(formCode),
      process: JSON.stringify(processNodes),
      setting: JSON.stringify(sanitizeSetting(setting)),
      startupRange,
      startupPerm: JSON.stringify(startupPerm),
      adminPerm: JSON.stringify(adminPerm),
      formFields: JSON.stringify(fields),
      events: JSON.stringify(events),
    };
  };

  const saveDraft = async (silent = false): Promise<string | null> => {
    if (!procName.trim()) {
      if (!silent) message.warning(t('admin.modelDesigner.nameRequired'));
      return null;
    }
    if (!groupId) {
      if (!silent) message.warning(t('admin.modelDesigner.groupRequired'));
      return null;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await saveModel(payload);
      const nextCode = res.data || code;
      setCode(nextCode);
      setVersion((value) => (value > 0 ? value : 1));
      setHasNewVersion(true);
      setFormFields(collectFormFields());
      if (!silent) message.success(t('admin.common.saveSuccess'));
      void fetchHistory(nextCode, hisPage);
      return nextCode;
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.saveFailed'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const validateAll = (): string[] => {
    const errs: string[] = [];
    if (!procName.trim()) errs.push(t('admin.modelDesigner.nameRequired'));
    if (!groupId) errs.push(t('admin.modelDesigner.groupRequired'));
    if (startupRange === 'RANGE' && startupPerm.length === 0) errs.push(t('admin.modelDesigner.startupRangeRequired'));
    if (formType === 0) {
      const components = Array.isArray(formJson?.components) ? formJson.components : [];
      if (components.length === 0) errs.push(t('admin.modelDesigner.formEmpty'));
      const keys = flattenFormFields(components)
        .filter((field) => typeof field.key === 'string' && field.valueType && field.valueType !== 'none')
        .map((field) => field.key as string);
      const duplicated = keys.find((key, index) => keys.indexOf(key) !== index);
      if (duplicated) errs.push(t('admin.modelDesigner.duplicateFieldKey').replace('{key}', duplicated));
    }
    if (!Array.isArray(processNodes) || processNodes.length === 0) errs.push(t('admin.modelDesigner.processEmpty'));
    const codeRule = setting?.code;
    if (codeRule?.type === 'CUSTOM') {
      const rules = Array.isArray(codeRule.rules) ? codeRule.rules : [];
      if (rules.length === 0) errs.push(t('admin.modelDesigner.ruleRequired'));
      else if (rules.some((rule) => !String(rule).trim())) errs.push(t('admin.modelDesigner.ruleLiteralRequired'));
      else if (!rules.some((rule) => String(rule).includes('${'))) errs.push(t('admin.modelDesigner.ruleDynamicRequired'));
    }
    const sync = setting?.formSync;
    if (sync?.enable) {
      if (!Array.isArray(sync.events) || sync.events.length === 0) errs.push(t('admin.modelDesigner.syncEventRequired'));
      else if (sync.type === 'DB' && !sync.tbName) errs.push(t('admin.modelDesigner.syncTableRequired'));
      else if (sync.type === 'API' && !sync.apiUrl) errs.push(t('admin.modelDesigner.syncUrlRequired'));
      else if (sync.type === 'EL' && !String(sync.el || '').trim()) errs.push(t('admin.modelDesigner.syncElRequired'));
    }
    return errs;
  };

  const handleSaveDraft = () => {
    void saveDraft(false);
  };

  const handlePublishClick = () => {
    const errs = validateAll();
    if (errs.length > 0) {
      setValidErrors(errs);
      setValidModalOpen(true);
      return;
    }
    setConfirmPublishOpen(true);
  };

  const handleConfirmPublish = async () => {
    setDeploying(true);
    try {
      const savedCode = await saveDraft(true);
      if (!savedCode) return;
      await deployModel(savedCode);
      message.success(t('admin.common.publishSuccess'));
      setConfirmPublishOpen(false);
      await loadModelData(savedCode);
      void fetchHistory(savedCode, 1);
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.publishFailed'));
    } finally {
      setDeploying(false);
    }
  };

  const handleUpdateOnly = () => {
    if (!code) {
      message.warning(t('admin.modelDesigner.saveFirst'));
      return;
    }
    Modal.confirm({
      title: t('admin.modelDesigner.updateOnly'),
      content: t('admin.modelDesigner.updateContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const res = await updateModel({
            code,
            procName,
            groupId,
            remark,
            logo: JSON.stringify(logo),
            setting: JSON.stringify(sanitizeSetting(setting)),
            startupRange,
            startupPerm: JSON.stringify(startupPerm),
            adminPerm: JSON.stringify(adminPerm),
          });
          message.success(res.data || t('admin.modelDesigner.updateSuccess'));
          setHasNewVersion(false);
          void fetchHistory(code, hisPage);
        } catch (e: any) {
          message.error(e?.msg || t('admin.modelDesigner.updateFailed'));
        }
      },
    });
  };

  const handleGroupChange = async (value: string) => {
    setGroupId(value);
    if (!code) return;
    try {
      await moveModel(code, value);
      message.success(t('admin.modelDesigner.movedGroup'));
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelDesigner.moveGroupFailed'));
    }
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (name.length < 2 || name.length > 30) {
      message.warning(t('admin.modelManager.nameLength'));
      return;
    }
    try {
      const res = await createProcGroup(name);
      message.success(t('admin.modelManager.groupCreated'));
      setGroupModalOpen(false);
      setNewGroupName('');
      await loadGroups();
      if (res.data) setGroupId(res.data);
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelDesigner.groupCreateFailed'));
    }
  };

  const switchVer = (his: HisModel) => {
    if (!code) return;
    Modal.confirm({
      title: t('admin.modelDesigner.switchVersionTitle'),
      content: t('admin.modelDesigner.switchVersionContent').replace('{version}', String(his.version)),
      okText: t('admin.modelDesigner.switchVersionOk'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const res = await getProcModelByVer(code, his.version);
          applyModelData(res.data);
          message.success(t('admin.modelDesigner.switchVersionSuccess').replace('{version}', String(his.version)));
        } catch (e: any) {
          message.error(e?.msg || t('admin.modelDesigner.switchVersionFailed'));
        }
      },
    });
  };

  const activeVer = (his: HisModel) => {
    if (!code) return;
    Modal.confirm({
      title: t('admin.modelDesigner.activateVersionTitle'),
      content: t('admin.modelDesigner.activateVersionContent').replace('{version}', String(his.version)),
      okText: t('admin.modelDesigner.activateVersionOk'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const res = await activeModel(his.id);
          message.success(res.data || t('admin.modelDesigner.activateSuccess'));
          const next = await getProcModelByVer(code, his.version);
          applyModelData(next.data);
          void fetchHistory(code, hisPage);
        } catch (e: any) {
          message.error(e?.msg || t('admin.modelDesigner.activateFailed'));
        }
      },
    });
  };

  const handleMock = () => {
    if (!code) {
      message.warning(t('admin.modelDesigner.saveFirst'));
      return;
    }
    window.open(`/workspace/startProc?code=${encodeURIComponent(code)}&version=${version}&mock=1`, '_blank');
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    saving,
    deploying,
    code,
    procName,
    setProcName,
    logo,
    setLogo,
    groupId,
    setGroupId,
    formType,
    setFormType,
    remark,
    setRemark,
    version,
    hasNewVersion,
    formJson,
    setFormJson,
    formCode,
    setFormCode,
    formRef,
    setFormRef,
    formFields,
    processNodes,
    setProcessNodes,
    events,
    startupRange,
    setStartupRange,
    startupPerm,
    setStartupPerm,
    adminPerm,
    setAdminPerm,
    setting,
    setSetting,
    groups,
    groupModalOpen,
    setGroupModalOpen,
    newGroupName,
    setNewGroupName,
    hisModels,
    hisPage,
    setHisPage,
    hisPages,
    hisOpen,
    setHisOpen,
    validModalOpen,
    setValidModalOpen,
    validErrors,
    confirmPublishOpen,
    setConfirmPublishOpen,
    publishedExists,
    loadGroups,
    fetchHistory,
    collectFormFields,
    handleSaveDraft,
    handlePublishClick,
    handleConfirmPublish,
    handleUpdateOnly,
    handleGroupChange,
    handleCreateGroup,
    switchVer,
    activeVer,
    handleMock,
  };
}

export type ModelDesignerApi = ReturnType<typeof useModelDesigner>;
