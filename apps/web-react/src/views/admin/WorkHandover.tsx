import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Cascader,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CheckOutlined,
  DeleteOutlined,
  LoadingOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getWorkHandoverList,
  createWorkHandover,
  activateWorkHandover,
  deleteWorkHandover,
  retryWorkHandover,
} from '@/api/workHandover';
import { getProcGroupItemsList } from '@/api/model';
import { WAvatar } from '@/components/WAvatar';
import { WOrgTags } from '@/components/WOrgTags';
import type { OrgTarget } from '@/types/workflow';
import { useTranslation } from '@/i18n';

interface HandoverUser {
  id: string;
  name: string;
  avatar?: string;
}

interface FailedModel {
  id: string;
  code: string;
  name: string;
  version: number;
  error?: string;
}

interface HandoverRecord {
  id: string;
  source: HandoverUser;
  target: HandoverUser;
  scope: string[] | null;
  reason: string;
  status: number;
  createTime: string;
  activatedTime?: string | null;
  failedModels?: FailedModel[] | null;
}

interface GroupOption {
  value: string;
  label: string;
  children: Array<{ value: string; label: string }>;
}

interface HandoverFormValues {
  source?: OrgTarget[];
  target?: OrgTarget[];
  scope?: string[];
  timeRange?: [Dayjs, Dayjs];
  reason?: string;
}

const formatTime = (time?: string | null) => {
  if (!time) return '-';
  const value = dayjs(time);
  return value.isValid() ? value.format('YYYY-MM-DD HH:mm') : time;
};

export const WorkHandover: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<HandoverFormValues>();

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<HandoverRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ pageNo: 1, pageSize: 10 });

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAllScope, setIsAllScope] = useState(false);

  const [activateTarget, setActivateTarget] = useState<HandoverRecord | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [activating, setActivating] = useState(false);

  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [scopeLabels, setScopeLabels] = useState<Record<string, string>>({});
  const pathByCode = useRef<Record<string, string[]>>({});

  const sourceValue = Form.useWatch('source', form) as OrgTarget[] | undefined;
  const sourceIds = (sourceValue || []).map((item) => String(item.id));

  const silentRef = useRef(false);
  const loadListRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const loadList = useCallback(async (silent = false) => {
    if (silent && silentRef.current) return;
    silentRef.current = true;
    if (!silent) setLoading(true);
    try {
      const res = await getWorkHandoverList({
        pageNo: pagination.pageNo,
        pageSize: pagination.pageSize,
        all: true,
      });
      const data = res.data || {};
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      if (!silent) message.error(e?.msg || t('admin.workHandover.fetchFailed'));
    } finally {
      silentRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [pagination.pageNo, pagination.pageSize]);

  useEffect(() => {
    loadListRef.current = loadList;
  }, [loadList]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const hasRunning = records.some((record) => record.status === 1);

  useEffect(() => {
    if (!hasRunning) return;
    const timer = window.setInterval(() => {
      void loadListRef.current(true);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasRunning]);

  useEffect(() => {
    getProcGroupItemsList()
      .then((res) => {
        const labels: Record<string, string> = {};
        const paths: Record<string, string[]> = {};
        const options: GroupOption[] = (res.data || [])
          .filter((group: any) => group.items?.length)
          .map((group: any) => ({
            value: String(group.id),
            label: group.name,
            children: group.items.map((item: any) => {
              labels[item.code] = item.procName;
              paths[item.code] = [String(group.id), String(item.code)];
              return { value: item.code, label: item.procName };
            }),
          }));
        pathByCode.current = paths;
        setScopeLabels(labels);
        setGroupOptions(options);
      })
      .catch((e: any) => message.error(e?.msg || t('admin.workHandover.fetchGroupsFailed')));
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    form.setFieldsValue({ source: [], target: [], scope: [], timeRange: undefined, reason: '' });
    setIsAllScope(false);
  }, [modalOpen, form]);

  const scopeText = (scope: string[] | null) => {
    if (!scope || scope.length === 0) return t('admin.workHandover.allProcesses');
    return scope.map((code) => scopeLabels[code] || code).join('、');
  };

  const handleOpenCreate = () => setModalOpen(true);

  const handleCreate = async () => {
    let values: HandoverFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const source = values.source?.[0];
    const target = values.target?.[0];
    if (!source || !target) {
      message.warning(t('admin.workHandover.selectBoth'));
      return;
    }
    if (String(source.id) === String(target.id)) {
      message.warning(t('admin.workHandover.samePerson'));
      return;
    }
    const range = values.timeRange;
    setSubmitting(true);
    try {
      await createWorkHandover({
        source: { id: source.id },
        target: { id: target.id },
        scope: isAllScope ? null : values.scope || [],
        timeRange:
          range?.[0] && range[1]
            ? [range[0].format('YYYY-MM-DD HH:mm:ss'), range[1].format('YYYY-MM-DD HH:mm:ss')]
            : null,
        reason: values.reason,
      });
      message.success(t('admin.workHandover.createSuccess'));
      setModalOpen(false);
      if (pagination.pageNo !== 1) setPagination((prev) => ({ ...prev, pageNo: 1 }));
      else void loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.workHandover.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!activateTarget) return;
    if (confirmText !== t('admin.workHandover.confirmWord')) {
      message.warning(t('admin.workHandover.confirmHint').replace('{word}', t('admin.workHandover.confirmWord')));
      return;
    }
    setActivating(true);
    try {
      await activateWorkHandover(activateTarget.id);
      message.success(t('admin.workHandover.activateSuccess'));
      setActivateTarget(null);
      setConfirmText('');
      void loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.workHandover.activateFailed'));
    } finally {
      setActivating(false);
    }
  };

  const handleRetry = (record: HandoverRecord) => {
    Modal.confirm({
      title: t('admin.workHandover.retryTitle'),
      content: t('admin.workHandover.retryContent').replace('{count}', String(record.failedModels?.length || 0)),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await retryWorkHandover(record.id);
          message.success(t('admin.workHandover.retryStarted'));
          void loadList();
        } catch (e: any) {
          message.error(e?.msg || t('admin.workHandover.retryFailed'));
        }
      },
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkHandover(id);
      message.success(t('admin.common.deleteSuccess'));
      if (records.length === 1 && pagination.pageNo > 1) {
        setPagination((prev) => ({ ...prev, pageNo: prev.pageNo - 1 }));
      } else {
        void loadList();
      }
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.deleteFailed'));
    }
  };

  const statusTag = (record: HandoverRecord) => {
    switch (record.status) {
      case 0:
        return <Tag>{t('admin.status.pending')}</Tag>;
      case 1:
        return (
          <Tag color="warning">
            <LoadingOutlined spin style={{ marginRight: 4 }} />
            {t('admin.status.handoverRunning')}
          </Tag>
        );
      case 2:
        return <Tag color="success">{t('admin.status.handoverDone')}</Tag>;
      case 3:
        return (
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('admin.workHandover.failedModels')}</div>
                {(record.failedModels || []).length === 0 ? (
                  <div>{t('admin.workHandover.noFailureDetail')}</div>
                ) : (
                  (record.failedModels || []).map((model) => (
                    <div key={model.id} style={{ fontSize: 12 }}>
                      · {model.name}（v{model.version}）
                      {model.error ? `：${model.error}` : ''}
                    </div>
                  ))
                )}
              </div>
            }
          >
            <Tag color="error" style={{ cursor: 'pointer' }}>
              {t('admin.status.partialFailed')}
            </Tag>
          </Tooltip>
        );
      default:
        return <Tag>{t('admin.status.unknown')}</Tag>;
    }
  };

  const columns: TableColumnsType<HandoverRecord> = [
    {
      title: t('admin.workHandover.source'),
      dataIndex: 'source',
      key: 'source',
      width: 150,
      render: (source: HandoverUser) => (
        <WAvatar id={source?.id} name={source?.name} src={source?.avatar} size={24} />
      ),
    },
    {
      title: t('admin.workHandover.target'),
      dataIndex: 'target',
      key: 'target',
      width: 150,
      render: (target: HandoverUser) => (
        <WAvatar id={target?.id} name={target?.name} src={target?.avatar} size={24} />
      ),
    },
    {
      title: t('admin.workHandover.scope'),
      dataIndex: 'scope',
      key: 'scope',
      ellipsis: { showTitle: false },
      render: (scope: string[] | null) => (
        <Tooltip title={scopeText(scope)} placement="topLeft">
          <span>{scopeText(scope)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('admin.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_: number, record: HandoverRecord) => statusTag(record),
    },
    {
      title: t('admin.workHandover.reason'),
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 200,
    },
    {
      title: t('admin.table.createTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (time: string) => formatTime(time),
    },
    {
      title: t('admin.workHandover.activatedTime'),
      dataIndex: 'activatedTime',
      key: 'activatedTime',
      width: 160,
      render: (time?: string | null) => (time ? formatTime(time) : '-'),
    },
    {
      title: t('admin.table.action'),
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: HandoverRecord) => (
        <Space size={4}>
          {record.status === 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => {
                setActivateTarget(record);
                setConfirmText('');
              }}
            >
              {t('admin.workHandover.activate')}
            </Button>
          )}
          {record.status === 3 && (
            <Button type="link" size="small" icon={<RedoOutlined />} onClick={() => handleRetry(record)}>
              {t('admin.workHandover.retry')}
            </Button>
          )}
          {record.status !== 1 && (
            <Popconfirm
              title={t('admin.workHandover.deleteConfirm')}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          )}
          {record.status === 1 && <span style={{ color: '#faad14', fontSize: 13 }}>{t('admin.workHandover.executing')}</span>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message={t('admin.workHandover.alertTitle')}
        description={t('admin.workHandover.alertDesc')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('admin.workHandover.title')}
        </Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadList()}>
            {t('admin.workHandover.refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            {t('admin.workHandover.create')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={records}
        columns={columns}
        pagination={{
          current: pagination.pageNo,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (value) => t('admin.common.totalRecords').replace('{total}', String(value)),
          onChange: (nextPage, nextSize) => setPagination({ pageNo: nextPage, pageSize: nextSize }),
        }}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={t('admin.workHandover.createTitle')}
        open={modalOpen}
        width={680}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleCreate()}
        destroyOnHidden
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
          <Form.Item
            label={t('admin.workHandover.source')}
            name="source"
            rules={[{ type: 'array', required: true, message: t('admin.workHandover.sourceRequired') }]}
          >
            <WOrgTags type="user" multiple={false} buttonText={t('admin.workHandover.selectSource')} />
          </Form.Item>

          <Form.Item
            label={t('admin.workHandover.target')}
            name="target"
            rules={[
              { type: 'array', required: true, message: t('admin.workHandover.targetRequired') },
              {
                validator: async (_rule, value: OrgTarget[] | undefined) => {
                  const target = value?.[0];
                  if (target && sourceIds.includes(String(target.id))) {
                    throw new Error(t('admin.workHandover.targetSameAsSource'));
                  }
                },
              },
            ]}
          >
            <WOrgTags type="user" multiple={false} excludes={sourceIds} buttonText={t('admin.workHandover.selectTarget')} />
          </Form.Item>

          <Form.Item label={t('admin.workHandover.scope')} required>
            <Radio.Group
              value={isAllScope ? 'all' : 'specified'}
              onChange={(event) => setIsAllScope(event.target.value === 'all')}
            >
              <Radio value="all">{t('admin.workHandover.scopeAll')}</Radio>
              <Radio value="specified">{t('admin.workHandover.scopeSpecified')}</Radio>
            </Radio.Group>
            {isAllScope ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                message={t('admin.workHandover.allScopeWarning')}
              />
            ) : (
              <Form.Item
                name="scope"
                rules={[{ type: 'array', required: true, message: t('admin.workHandover.scopeRequired') }]}
                style={{ marginTop: 8, marginBottom: 0 }}
                getValueProps={(value: string[] | undefined) => ({
                  value: (value || []).map((code) => pathByCode.current[code] || [code]),
                })}
                normalize={(value: Array<Array<string | number>> | undefined) =>
                  (value || []).map((path) => String(path[path.length - 1]))
                }
              >
                <Cascader
                  multiple
                  allowClear
                  showSearch
                  options={groupOptions}
                  placeholder={t('admin.workHandover.scopePlaceholder')}
                  style={{ width: '100%' }}
                  showCheckedStrategy={Cascader.SHOW_CHILD}
                  displayRender={(labels) => labels[labels.length - 1]}
                />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item
            label={t('admin.workHandover.timeRange')}
            name="timeRange"
            tooltip={t('admin.workHandover.timeRangeTip')}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              separator={t('admin.workHandover.timeRangeSeparator')}
              placeholder={[t('admin.workHandover.timeRangeStart'), t('admin.workHandover.timeRangeEnd')]}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label={t('admin.workHandover.reason')}
            name="reason"
            rules={[{ required: true, message: t('admin.workHandover.reasonRequired') }]}
          >
            <Input.TextArea showCount maxLength={100} rows={3} placeholder={t('admin.workHandover.reasonRequired')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('admin.workHandover.riskTitle')}
        open={Boolean(activateTarget)}
        width={480}
        okText={t('admin.workHandover.activateOk')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true, disabled: confirmText !== t('admin.workHandover.confirmWord') }}
        confirmLoading={activating}
        onCancel={() => {
          setActivateTarget(null);
          setConfirmText('');
        }}
        onOk={() => void handleActivate()}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={t('admin.workHandover.riskWarning')}
        />
        <Typography.Paragraph>
          {t('admin.workHandover.activateConfirmHint').replace('{word}', t('admin.workHandover.confirmWord'))}
        </Typography.Paragraph>
        <Input
          value={confirmText}
          placeholder={t('admin.workHandover.confirmWord')}
          onChange={(event) => setConfirmText(event.target.value)}
          onPressEnter={() => void handleActivate()}
        />
      </Modal>
    </div>
  );
};

export default WorkHandover;
