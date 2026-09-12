import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Cascader,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  addAgentRule,
  deleteAgentRule,
  getAgentRulePage,
  updateAgentRule,
  type AgentRule,
} from '@/api/handover';
import { getProcGroupItemsList } from '@/api/model';
import { WAvatar } from '@/components/WAvatar';
import { WOrgPicker } from '@/components/WOrgPicker';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { useWflowStore } from '@/stores/wflow';
import type { OrgTarget } from '@/types/workflow';

interface GroupOption {
  value: string;
  label: string;
  children: Array<{ value: string; label: string }>;
}

interface AgentFormValues {
  target?: OrgTarget[];
  scope?: string[];
  timeRange?: [Dayjs, Dayjs];
  reason?: string;
}

const TargetPicker: React.FC<{
  value?: OrgTarget[];
  onChange?: (value: OrgTarget[]) => void;
  excludes?: string[];
}> = ({ value = [], onChange, excludes }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Space wrap>
        {value.map((user) => (
          <Tag
            key={user.id}
            color="blue"
            closable
            onClose={(event) => {
              event.preventDefault();
              onChange?.(value.filter((item) => item.id !== user.id));
            }}
          >
            {user.name}
          </Tag>
        ))}
        <Button size="small" type="primary" ghost onClick={() => setOpen(true)}>
          {t('workspace.agent.selectPerson')}
        </Button>
      </Space>
      <WOrgPicker
        open={open}
        title={t('workspace.agent.selectTargetTitle')}
        type="user"
        multiple={false}
        selected={value}
        excludes={excludes}
        onOk={(list) => onChange?.(list)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};

export const ProcAgentPage: React.FC = () => {
  const { t } = useTranslation();
  const { loginUser } = useWflowStore();
  const [form] = Form.useForm<AgentFormValues>();
  const [isAllScope, setIsAllScope] = useState(true);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<AgentRule[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [scopeLabels, setScopeLabels] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentRule | null>(null);

  const loadList = useCallback(async (p: number, s: number) => {
    setLoading(true);
    try {
      const res = await getAgentRulePage({ pageNo: p, pageSize: s });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.agent.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(pageNo, pageSize);
  }, [pageNo, pageSize, loadList]);

  useEffect(() => {
    getProcGroupItemsList()
      .then((res) => {
        const labels: Record<string, string> = {};
        const options: GroupOption[] = (res.data || [])
          .filter((group: any) => group.items?.length)
          .map((group: any) => ({
            value: group.id,
            label: group.name,
            children: group.items.map((item: any) => {
              labels[item.code] = item.procName;
              return { value: item.code, label: item.procName };
            }),
          }));
        setScopeLabels(labels);
        setGroupOptions(options);
      })
      .catch((e: any) => message.error(e?.msg || t('workspace.search.groupFailed')));
  }, []);

  const scopeText = (scope?: string[] | null) => {
    if (!scope || scope.length === 0) return t('workspace.agent.allProcesses');
    return scope.map((code) => scopeLabels[code] || code).join(t('workspace.listSeparator'));
  };

  const statusTag = (timeRange?: string[]) => {
    const start = dayjs(timeRange?.[0]);
    const end = dayjs(timeRange?.[1]);
    const now = dayjs();
    if (now.isBefore(start)) return <Tag color="warning">{t('workspace.agent.notStarted')}</Tag>;
    if (now.isAfter(end)) return <Tag color="default">{t('workspace.agent.expired')}</Tag>;
    return <Tag color="processing">{t('workspace.agent.active')}</Tag>;
  };

  const handleAdd = () => {
    setEditing(null);
    setIsAllScope(true);
    setModalOpen(true);
  };

  const handleEdit = (row: AgentRule) => {
    setEditing(row);
    setIsAllScope(!Array.isArray(row.scope));
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      form.setFieldsValue({
        target: [{ id: editing.target.id, name: editing.target.name || '', type: 'user', avatar: editing.target.avatar }],
        scope: editing.scope || [],
        timeRange:
          editing.timeRange?.length === 2
            ? [dayjs(editing.timeRange[0]), dayjs(editing.timeRange[1])]
            : undefined,
        reason: editing.reason || '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ target: [], scope: [], timeRange: undefined, reason: '' });
    }
  }, [modalOpen, editing, form]);

  const handleSubmit = async () => {
    let values: AgentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const target = values.target?.[0];
    const range = values.timeRange;
    if (!target || !range) {
      message.warning(t('workspace.agent.incomplete'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: AgentRule = {
        ...(editing?.id ? { id: editing.id } : {}),
        target: { id: target.id, name: target.name, avatar: target.avatar, type: target.type },
        scope: isAllScope ? null : values.scope || [],
        timeRange: [range[0].format('YYYY-MM-DD HH:mm:ss'), range[1].format('YYYY-MM-DD HH:mm:ss')],
        reason: values.reason || '',
      };
      const res = editing ? await updateAgentRule(payload) : await addAgentRule(payload);
      message.success(res.data || t('workspace.agent.saveSuccess'));
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      if (!editing && pageNo !== 1) setPageNo(1);
      else void loadList(pageNo, pageSize);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.agent.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      const res = await deleteAgentRule(id);
      message.success(res.data || t('workspace.agent.deleteSuccess'));
      void loadList(pageNo, pageSize);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.agent.deleteFailed'));
    }
  };

  const columns: TableColumnsType<AgentRule> = [
    {
      title: t('workspace.agent.target'),
      dataIndex: 'target',
      key: 'target',
      width: 160,
      render: (_: any, record: AgentRule) => (
        <WAvatar id={record.target?.id} name={record.target?.name} src={record.target?.avatar} size={24} />
      ),
    },
    {
      title: t('workspace.agent.scope'),
      dataIndex: 'scope',
      key: 'scope',
      ellipsis: true,
      render: (_: any, record: AgentRule) => scopeText(record.scope),
    },
    {
      title: t('workspace.table.status'),
      key: 'status',
      width: 100,
      render: (_: any, record: AgentRule) => statusTag(record.timeRange),
    },
    { title: t('workspace.agent.reason'), dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: t('workspace.agent.timeRange'),
      dataIndex: 'timeRange',
      key: 'timeRange',
      ellipsis: true,
      render: (range?: string[]) => (range?.length ? range.join(' ~ ') : '-'),
    },
    {
      title: t('workspace.table.action'),
      key: 'action',
      width: 160,
      render: (_: any, record: AgentRule) => (
        <Space size={4}>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('workspace.agent.deleteConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message={t('workspace.agent.intro')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('workspace.agent.ruleTitle')}
        </Typography.Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('workspace.agent.addRule')}
          </Button>
          <Button icon={<SearchOutlined />} onClick={() => void loadList(pageNo, pageSize)}>
            {t('workspace.agent.query')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={records}
        columns={columns}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (value) => formatMessage(t('workspace.table.totalRecords'), { total: value }),
          onChange: (nextPage, nextSize) => {
            setPageNo(nextPage);
            setPageSize(nextSize);
          },
        }}
      />

      <Modal
        title={t('workspace.agent.modalTitle')}
        open={modalOpen}
        width={650}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
      >
        <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} preserve={false}>
          <Form.Item
            label={t('workspace.agent.targetLabel')}
            name="target"
            rules={[{ required: true, message: t('workspace.agent.targetRule') }]}
          >
            <TargetPicker excludes={loginUser?.id ? [loginUser.id] : []} />
          </Form.Item>

          <Form.Item label={t('workspace.agent.scopeLabel')} style={{ marginBottom: 0 }}>
            <Checkbox checked={isAllScope} onChange={(event) => setIsAllScope(event.target.checked)}>
              {t('workspace.agent.allScope')}
            </Checkbox>
            <Form.Item
              name="scope"
              rules={[{ type: 'array', required: !isAllScope, message: t('workspace.agent.scopeRule') }]}
              style={{ display: isAllScope ? 'none' : 'block' }}
            >
              <Cascader
                multiple
                allowClear
                options={groupOptions}
                placeholder={t('workspace.agent.scopePlaceholder')}
                style={{ width: '100%', marginTop: 8 }}
              />
            </Form.Item>
            {isAllScope && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                message={t('workspace.agent.scopeWarning')}
              />
            )}
          </Form.Item>

          <Form.Item
            label={t('workspace.agent.timeLabel')}
            name="timeRange"
            rules={[{ required: true, message: t('workspace.agent.timeRule') }]}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              separator={t('workspace.agent.timeSeparator')}
              placeholder={[t('workspace.agent.startPlaceholder'), t('workspace.agent.endPlaceholder')]}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label={t('workspace.agent.reasonLabel')} name="reason">
            <Input.TextArea
              showCount
              maxLength={50}
              rows={3}
              placeholder={t('workspace.agent.reasonPlaceholder')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcAgentPage;
