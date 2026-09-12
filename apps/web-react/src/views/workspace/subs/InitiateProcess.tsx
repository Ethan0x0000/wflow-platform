import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Spin,
  Alert,
  message,
  Modal,
  Radio,
  Checkbox,
  Popover,
  Empty,
  Tag,
  Divider,
} from 'antd';
import { RollbackOutlined, CheckOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { getStartupModel, getForecast, getForecastMock, getDrafts, saveDraft, delDraft } from '@/api/startup';
import { startProcess, getInstDetail } from '@/api/instance';
import { getUserDeptList } from '@/api/org';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { useWflowStore } from '@/stores/wflow';
import { FormRender, type FormRenderRef } from '@/views/form/FormRender';
import { ProcessForecast } from '@/components/ProcessForecast';
import { WOrgTags } from '@/components/WOrgTags';
import type { FormItemConfig, OrgTarget } from '@/types/workflow';

interface ParsedForm {
  components: FormItemConfig[];
  conf: any;
}

function parseJson(source: any, fallback: any = {}): any {
  if (!source) return fallback;
  if (typeof source !== 'string') return source;
  try {
    return JSON.parse(source);
  } catch {
    return fallback;
  }
}

function walkKeys(items: any[], visit: (key: string, item: any) => void) {
  for (const item of items || []) {
    if (!item) continue;
    if (Array.isArray(item)) {
      walkKeys(item, visit);
      continue;
    }
    const key = item.key || item.id;
    if (key) visit(key, item);
    if (item.props?.isContainer && Array.isArray(item.props.columns)) walkKeys(item.props.columns, visit);
    if ((item.type === 'TableList' || item.type === 'FormList') && Array.isArray(item.props?.columns)) walkKeys(item.props.columns, visit);
  }
}

export const InitiateProcess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { loginUser } = useWflowStore();
  const code = searchParams.get('code') || '';
  const version = searchParams.get('version') || undefined;
  const instId = searchParams.get('instId') || '';
  const isMock = searchParams.get('mock') === '1';

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [model, setModel] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [processData, setProcessData] = useState<Record<string, string[]>>({});
  const [forecastNodes, setForecastNodes] = useState<any[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [depts, setDepts] = useState<any[]>([]);
  const [startDeptId, setStartDeptId] = useState<string>('');
  const [agentSubmit, setAgentSubmit] = useState(false);
  const [startUser, setStartUser] = useState<OrgTarget[]>([]);
  const [mockInitiator, setMockInitiator] = useState<OrgTarget[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedForm>({ components: [], conf: {} });

  const formRef = useRef<FormRenderRef | null>(null);

  const initiator = useMemo<OrgTarget>(() => {
    if (isMock && mockInitiator[0]) return mockInitiator[0];
    if (model?.enableAgent && startUser[0]) return startUser[0];
    return { id: loginUser?.id, name: loginUser?.name, avatar: loginUser?.avatar, type: 'user' };
  }, [isMock, mockInitiator, model?.enableAgent, startUser, loginUser]);

  useEffect(() => {
    if (!code) return;
    if (instId) {
      getInstDetail(instId)
        .then((res) => {
          setFormData(res.data?.formData || {});
          const defineId = res.data?.defineId;
          loadModel(res.data?.code || code, String(res.data?.version || version || ''), defineId);
        })
        .catch((error: any) => message.error(error?.msg || t('workspace.initiate.getDataFailed')));
    } else {
      loadModel(code, version);
    }
  }, [code, version, instId]);

  useEffect(() => {
    if (!initiator?.id) return;
    getUserDeptList(initiator.id)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setDepts(list);
        if (list.length === 0) {
          Modal.warning({ title: t('workspace.initiate.noDeptTitle'), content: t('workspace.initiate.noDeptContent') });
        } else if (!list.some((dept: any) => dept.id === startDeptId)) {
          setStartDeptId(list[0].id);
        }
      })
      .catch((error: any) => message.error(error?.msg || t('workspace.initiate.getDeptFailed')));
  }, [initiator?.id]);

  const loadModel = async (modelCode: string, modelVersion?: string, defineId?: string) => {
    if (!modelCode) return;
    setLoading(true);
    try {
      const res = await getStartupModel(modelCode, modelVersion);
      const data = res.data;
      data.logo = parseJson(data.logo, {});
      data.process = parseJson(data.process, []);
      data.setting = parseJson(data.setting, {});
      if (data.formType === 0) {
        const formJson = parseJson(data.formJson, { components: [], conf: {} });
        setParsed({ components: formJson.components || [], conf: formJson.conf || {} });
      } else if (data.formType === 2 && data.formRef) {
        try {
          const formRes = await request<any>({ url: '/form/model/ver', method: 'get', params: { code: data.formRef } });
          const formJson = parseJson(formRes.data?.formJson, { components: [], conf: {} });
          setParsed({ components: formJson.components || [], conf: formJson.conf || {} });
        } catch {
          setParsed({ components: [], conf: {} });
        }
      } else {
        setParsed({ components: [], conf: {} });
      }
      setModel({ ...data, defineId: defineId || data.defineId });
      refreshForecast(data.defineId || defineId);
    } catch (error: any) {
      message.error(error?.msg || t('workspace.initiate.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const permConf = useMemo(() => {
    const map: Record<string, string> = { ...(model?.fieldPermMap || {}) };
    walkKeys(parsed.components, (key) => {
      if (map[key] === undefined) map[key] = 'E';
    });
    return map as Record<string, 'R' | 'E' | 'H' | 'D'>;
  }, [model?.fieldPermMap, parsed.components]);

  const collectEditable = (): Record<string, any> => {
    const values = formRef.current?.getValues() || formData;
    const configured = Object.keys(model?.fieldPermMap || {}).length > 0;
    if (!configured) return values;
    const result: Record<string, any> = {};
    walkKeys(parsed.components, (key) => {
      if (permConf[key] === 'E' && key in values) result[key] = values[key];
    });
    return result;
  };

  const refreshForecast = async (defineId?: string, data?: Record<string, any>) => {
    setForecastLoading(true);
    try {
      const params = { defineId, code, initiator: initiator.id, startDeptId, formData: data ?? formData };
      const res = isMock ? await getForecastMock(params, code, version || 0) : await getForecast(params);
      setForecastNodes(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      message.error(error?.msg || t('workspace.initiate.forecastFailed'));
    } finally {
      setForecastLoading(false);
    }
  };

  const openDrafts = async () => {
    setDraftOpen(true);
    try {
      const res = await getDrafts({ code: model?.code || code });
      setDrafts(res.data?.records || []);
    } catch (error: any) {
      message.error(error?.msg || t('workspace.initiate.draftsFailed'));
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft({
        code: model?.code || code,
        defineId: model?.defineId,
        version: model?.version,
        formData: JSON.stringify(collectEditable()),
        processData: JSON.stringify(processData),
      });
      message.success(t('workspace.initiate.draftSaved'));
      if (draftOpen) openDrafts();
    } catch (error: any) {
      message.error(error?.msg || t('workspace.initiate.draftSaveFailed'));
    }
  };

  const useDraft = (draft: any) => {
    const draftForm = parseJson(draft.formData, {});
    setFormData(draftForm);
    setProcessData(parseJson(draft.processData, {}));
    formRef.current?.setValues(draftForm);
    setDraftOpen(false);
  };

  const handleSubmit = async () => {
    try {
      await formRef.current?.validate();
    } catch {
      message.error(t('workspace.initiate.validateFailed'));
      return;
    }
    if (isMock) {
      message.success(t('workspace.initiate.validatePassed'));
      return;
    }
    setSubmitting(true);
    try {
      await startProcess({
        defineId: model.defineId,
        initiator: initiator.id,
        startDeptId,
        formData: collectEditable(),
        processData: Object.keys(processData).length ? processData : undefined,
        requestId: crypto.randomUUID(),
      });
      message.success(t('workspace.initiate.startSuccess'));
      navigate('/workspace/submitted');
    } catch (error: any) {
      message.error(error?.msg || t('workspace.initiate.startFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const processTree = (nodes: any[]): React.ReactNode =>
    (nodes || []).map((node: any, index) => (
      <div key={`${node.id}-${index}`} style={{ marginLeft: node.parentId ? 24 : 0, padding: '4px 0' }}>
        <Tag color={node.type === 'Approval' ? 'blue' : node.type === 'Task' ? 'cyan' : 'default'}>{node.type}</Tag>
        <Typography.Text>{node.name}</Typography.Text>
        {Array.isArray(node.branch) &&
          node.branch.map((branch: any[], branchIndex: number) => (
            <div key={branchIndex} style={{ marginLeft: 24, borderLeft: '1px dashed #ddd', paddingLeft: 12 }}>
              {processTree(branch)}
            </div>
          ))}
      </div>
    ));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip={t('workspace.initiate.loading')} />
      </div>
    );
  }

  if (!model) {
    return <Alert message={t('workspace.initiate.modelNotFound')} type="error" showIcon />;
  }

  const noMainForm = model.formType === 4;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <Card
        title={
          <Space size={12}>
            <Button type="text" icon={<RollbackOutlined />} onClick={() => navigate('/workspace/submitted')}>
              {t('workspace.initiate.back')}
            </Button>
            <div>
              <Space size={6}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {model.procName || model.name || t('workspace.initiate.startTitle')}
                </Typography.Title>
                {model.version !== undefined && <Tag>v{model.version}</Tag>}
              </Space>
              {model.remark && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {model.remark}
                </Typography.Text>
              )}
            </div>
          </Space>
        }
        extra={
          <Space>
            {isMock && (
              <Space>
                <Typography.Text type="secondary">{t('workspace.initiate.mockInitiator')}</Typography.Text>
                <WOrgTags value={mockInitiator} onChange={setMockInitiator} max={1} excludes={[loginUser?.id]} buttonText={t('workspace.initiate.selectMockUser')} />
              </Space>
            )}
            <Popover
              open={draftOpen}
              onOpenChange={(next) => (next ? openDrafts() : setDraftOpen(false))}
              placement="bottomRight"
              content={
                <div style={{ width: 300, maxHeight: 260, overflow: 'auto' }}>
                  {drafts.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('workspace.initiate.noDrafts')} />
                  ) : (
                    drafts.map((draft) => (
                      <div key={draft.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {draft.createTime}
                        </Typography.Text>
                        <Tag>v{draft.version}</Tag>
                        <div style={{ flex: 1 }} />
                        <Button type="link" danger size="small" onClick={() => delDraft(draft.id).then(() => openDrafts())}>
                          {t('workspace.initiate.delete')}
                        </Button>
                        <Button type="link" size="small" onClick={() => useDraft(draft)}>
                          {t('workspace.initiate.use')}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              }
            >
              <Button type="link" icon={<FolderOutlined />} disabled={isMock}>
                {t('workspace.initiate.draftBox')}
              </Button>
            </Popover>
          </Space>
        }
      >
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 3, minWidth: 0 }}>
            {model.enableAgent && (
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Checkbox checked={agentSubmit} onChange={(event) => setAgentSubmit(event.target.checked)}>
                  {t('workspace.initiate.agentSubmit')}
                </Checkbox>
                {agentSubmit && (
                  <>
                    <Divider type="vertical" />
                    <WOrgTags value={startUser} onChange={setStartUser} max={1} excludes={[loginUser?.id]} buttonText={t('workspace.initiate.selectAgentUser')} />
                  </>
                )}
              </div>
            )}

            {depts.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text strong style={{ marginRight: 12 }}>
                  {t('workspace.initiate.initiatorDept')}
                </Typography.Text>
                <Radio.Group value={startDeptId} onChange={(event) => setStartDeptId(event.target.value)}>
                  {depts.map((dept) => (
                    <Radio key={dept.id} value={dept.id}>
                      {dept.name}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            )}

            {noMainForm ? (
              <Empty description={t('workspace.initiate.noMainForm')} />
            ) : model.formType === 1 ? (
              <Alert
                type="info"
                showIcon
                message={t('workspace.formPane.codeForm')}
                description={t('workspace.initiate.codeFormDesc')}
              />
            ) : (
              <FormRender ref={formRef} config={parsed.components} value={formData} onChange={setFormData} permConf={permConf} readOnly={false} />
            )}

            <Space size="large" style={{ marginTop: 24 }}>
              <Button onClick={() => navigate('/workspace/submitted')} disabled={isMock}>
                {t('workspace.initiate.cancel')}
              </Button>
              <Button icon={<FolderOutlined />} ghost type="primary" onClick={handleSaveDraft} disabled={isMock}>
                {t('workspace.initiate.saveDraft')}
              </Button>
              <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleSubmit}>
                {isMock ? t('workspace.initiate.simulate') : t('workspace.initiate.submit')}
              </Button>
            </Space>
          </div>

          <div style={{ flex: 2, minWidth: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
              <Typography.Text strong style={{ marginRight: 16 }}>
                {t('workspace.initiate.forecastTitle')}
              </Typography.Text>
              <Button type="link" size="small" onClick={() => refreshForecast(model.defineId, collectEditable())}>
                {t('workspace.initiate.refreshForecast')}
              </Button>
              <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => setProcessOpen(true)}>
                {t('workspace.initiate.viewProcess')}
              </Button>
            </div>
            <ProcessForecast nodes={forecastNodes} value={processData} onChange={setProcessData} loading={forecastLoading} />
          </div>
        </div>
      </Card>

      <Modal
        title={formatMessage(t('workspace.initiate.chartTitle'), { name: model.procName || '' })}
        open={processOpen}
        onCancel={() => setProcessOpen(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>{processTree((model.process as any[]) || [])}</div>
      </Modal>
    </div>
  );
};

export default InitiateProcess;
