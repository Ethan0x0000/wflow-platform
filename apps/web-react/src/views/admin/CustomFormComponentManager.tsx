import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { getFormCps, getFormByType, getFormById, saveFromCp, publishFromCp, disableFromCp } from '@/api/form';
import { useTranslation } from '@/i18n';

interface FormComponent {
  id: string;
  name: string;
  type: string;
  valueType: string;
  version: number;
  status: number;
  createTime: string;
  icon?: string;
  sfc?: any;
  configSfc?: string | null;
}

interface ComponentFormValues {
  name?: string;
  valueType?: string;
  icon?: string;
}

const VALUE_TYPE_OPTIONS = [
  'all',
  'option',
  'options',
  'string',
  'number',
  'bool',
  'time',
  'dateTime',
  'timeRange',
  'dateTimeRange',
  'object',
  'array',
  'org',
  'objArray',
  'orgArray',
  'image',
  'imageArray',
  'fileArray',
].map((value) => ({ label: value, value }));

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  background: '#f6f8fa',
  border: '1px solid #eee',
  borderRadius: 6,
  padding: 12,
  maxHeight: 360,
  overflow: 'auto',
  margin: 0,
};

const toSfcText = (sfc: any): string => {
  if (sfc === null || sfc === undefined) return '';
  if (typeof sfc === 'string') {
    try {
      const parsed = JSON.parse(sfc);
      if (parsed && typeof parsed === 'object') return toSfcText(parsed);
    } catch {
      // not JSON, use the raw string
    }
    return sfc;
  }
  if (typeof sfc === 'object') {
    const pc = typeof sfc.pc === 'string' ? sfc.pc : '';
    const mb = typeof sfc.mb === 'string' ? sfc.mb : '';
    return [pc, mb ? `/* 移动端 */\n${mb}` : ''].filter(Boolean).join('\n\n');
  }
  return String(sfc);
};

export const CustomFormComponentManager: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<ComponentFormValues>();

  const [name, setName] = useState('');
  const [active, setActive] = useState<boolean | undefined>(undefined);
  const filtersRef = useRef<{ name: string; active?: boolean }>({ name: '' });
  filtersRef.current = { name, active };

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FormComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadToken, setReloadToken] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDetail, setEditingDetail] = useState<FormComponent | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [codeType, setCodeType] = useState<'sfc' | 'configSfc'>('sfc');
  const [codeDraft, setCodeDraft] = useState('');
  const [sfc, setSfc] = useState('');
  const [configSfc, setConfigSfc] = useState('');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<FormComponent | null>(null);

  const loadList = useCallback(async (page: number, size: number) => {
    setLoading(true);
    try {
      const current = filtersRef.current;
      const res = await getFormCps({
        pageNo: page,
        pageSize: size,
        ...(current.name ? { name: current.name } : {}),
        ...(current.active !== undefined ? { active: current.active } : {}),
      });
      const data = res.data || {};
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('admin.customComponent.fetchListFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(pageNo, pageSize);
  }, [pageNo, pageSize, reloadToken, loadList]);

  const handleSearch = () => {
    if (pageNo === 1) setReloadToken((token) => token + 1);
    else setPageNo(1);
  };

  const handleReset = () => {
    setName('');
    setActive(undefined);
    setPageNo(1);
    setReloadToken((token) => token + 1);
  };

  const fetchDetail = async (record: FormComponent): Promise<FormComponent> => {
    const res = record.type ? await getFormByType(record.type) : await getFormById(record.id);
    return res.data as FormComponent;
  };

  useEffect(() => {
    if (!modalOpen) return;
    if (editingDetail) {
      form.setFieldsValue({
        name: editingDetail.name,
        valueType: editingDetail.valueType,
        icon: editingDetail.icon || '',
      });
      setSfc(toSfcText(editingDetail.sfc));
      setConfigSfc(editingDetail.configSfc || '');
    } else {
      form.resetFields();
      form.setFieldsValue({ name: '', valueType: undefined, icon: '' });
      setSfc('');
      setConfigSfc('');
    }
  }, [modalOpen, editingDetail, form]);

  const handleOpenAdd = () => {
    setEditingDetail(null);
    setModalOpen(true);
  };

  const handleOpenEdit = async (record: FormComponent) => {
    try {
      const detail = await fetchDetail(record);
      setEditingDetail(detail);
      setModalOpen(true);
    } catch (e: any) {
      message.error(e?.msg || t('admin.customComponent.fetchDetailFailed'));
    }
  };

  const openEditor = (type: 'sfc' | 'configSfc') => {
    setCodeType(type);
    setCodeDraft(type === 'sfc' ? sfc : configSfc);
    setEditorOpen(true);
  };

  const switchCodeType = (next: 'sfc' | 'configSfc') => {
    if (codeType === 'sfc') setSfc(codeDraft);
    else setConfigSfc(codeDraft);
    setCodeType(next);
    setCodeDraft(next === 'sfc' ? sfc : configSfc);
  };

  const confirmEditor = () => {
    if (codeType === 'sfc') setSfc(codeDraft);
    else setConfigSfc(codeDraft);
    setEditorOpen(false);
  };

  const handleSave = async () => {
    let values: ComponentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      message.warning(t('admin.customComponent.completeForm'));
      return;
    }
    if (!sfc.trim()) {
      message.warning(t('admin.customComponent.writeSfc'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: values.name,
        valueType: values.valueType,
        icon: values.icon || '',
        sfc: sfc || '<template><div>自定义组件</div></template>',
        configSfc: configSfc || null,
      };
      if (editingDetail) {
        payload.id = editingDetail.id;
        payload.type = editingDetail.type;
      }
      await saveFromCp(payload);
      message.success(t('admin.common.saveSuccess'));
      setModalOpen(false);
      setEditingDetail(null);
      form.resetFields();
      void loadList(pageNo, pageSize);
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (record: FormComponent) => {
    try {
      const detail = await fetchDetail(record);
      if (detail.status === 1) {
        await disableFromCp(detail.id);
        message.success(t('admin.common.disableSuccess'));
        void loadList(pageNo, pageSize);
      } else if (detail.status === 0) {
        await publishFromCp(detail.id);
        message.success(t('admin.common.publishSuccess'));
        void loadList(pageNo, pageSize);
      } else {
        message.warning(t('admin.customComponent.dataInconsistent'));
      }
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
    }
  };

  const handlePreview = async (record: FormComponent) => {
    try {
      const detail = await fetchDetail(record);
      setPreviewData(detail);
      setPreviewOpen(true);
    } catch (e: any) {
      message.error(e?.msg || t('admin.customComponent.fetchDetailFailed'));
    }
  };

  const columns: TableColumnsType<FormComponent> = [
    {
      title: t('admin.customComponent.componentName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: t('admin.customComponent.typeKey'),
      dataIndex: 'type',
      key: 'type',
      ellipsis: true,
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: t('admin.table.valueType'),
      dataIndex: 'valueType',
      key: 'valueType',
      width: 120,
      render: (value: string) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: t('admin.customComponent.currentVersion'),
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (value: number) =>
        value === undefined || value === null ? '-' : <Tag color="blue">V{value}</Tag>,
    },
    {
      title: t('admin.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: number) =>
        value === 1 ? <Tag color="success">{t('admin.status.published')}</Tag> : <Tag color="default">{t('admin.status.disabled')}</Tag>,
    },
    { title: t('admin.table.createTime'), dataIndex: 'createTime', key: 'createTime', width: 180 },
    {
      title: t('admin.table.action'),
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_: unknown, record: FormComponent) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => void handlePreview(record)}>
            {t('admin.customComponent.preview')}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => void handleOpenEdit(record)}>
            {t('common.edit')}
          </Button>
          {record.status === 0 ? (
            <Tooltip title={t('admin.customComponent.publishTooltip')}>
              <Button type="link" size="small" onClick={() => void handleTogglePublish(record)}>
                {t('admin.customComponent.publish')}
              </Button>
            </Tooltip>
          ) : (
            <Button type="link" size="small" danger onClick={() => void handleTogglePublish(record)}>
              {t('admin.customComponent.disable')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message={t('admin.customComponent.alertTitle')}
        description={t('admin.customComponent.alertDesc')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('admin.customComponent.title')}
        </Typography.Title>
        <Space wrap>
          <Input
            placeholder={t('admin.customComponent.searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onPressEnter={handleSearch}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder={t('admin.customComponent.statusPlaceholder')}
            value={active}
            onChange={(value) => setActive(value)}
            options={[
              { label: t('admin.customComponent.filterPublished'), value: true },
              { label: t('admin.customComponent.filterDisabled'), value: false },
            ]}
            allowClear
            style={{ width: 140 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {t('common.reset')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            {t('admin.customComponent.create')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={records}
        columns={columns}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (value) => t('admin.common.totalComponents').replace('{total}', String(value)),
          onChange: (page, size) => {
            setPageNo(page);
            setPageSize(size);
          },
        }}
      />

      <Modal
        title={editingDetail ? t('admin.customComponent.editTitle') : t('admin.customComponent.createTitle')}
        open={modalOpen}
        width={560}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={() => void handleSave()}
        destroyOnHidden
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form
          form={form}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
        >
          <Form.Item
            label={t('admin.customComponent.componentName')}
            name="name"
            rules={[
              { required: true, message: t('admin.customComponent.nameRequired') },
              { min: 3, max: 255, message: t('admin.customComponent.nameLength') },
            ]}
          >
            <Input placeholder={t('admin.customComponent.namePlaceholder')} allowClear />
          </Form.Item>

          <Form.Item
            label={t('admin.table.valueType')}
            name="valueType"
            rules={[{ required: true, message: t('admin.customComponent.valueTypeRequired') }]}
          >
            <Select placeholder={t('admin.customComponent.valueTypeRequired')} options={VALUE_TYPE_OPTIONS} showSearch optionFilterProp="label" />
          </Form.Item>

          <Form.Item
            label={t('admin.customComponent.icon')}
            name="icon"
            rules={[{ required: true, message: t('admin.customComponent.iconRequired') }]}
          >
            <Input placeholder={t('admin.customComponent.iconPlaceholder')} allowClear />
          </Form.Item>

          <Form.Item label={t('admin.customComponent.designComponent')} required>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Button icon={<EditOutlined />} onClick={() => openEditor('sfc')}>
                {t('admin.customComponent.writeComponent')}
              </Button>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 380 }}>
                {sfc || t('admin.customComponent.notWritten')}
              </Typography.Text>
            </Space>
          </Form.Item>

          <Form.Item label={t('admin.customComponent.componentConfig')}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Button icon={<EditOutlined />} onClick={() => openEditor('configSfc')}>
                {t('admin.customComponent.writeConfig')}
              </Button>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 380 }}>
                {configSfc || t('admin.customComponent.notWritten')}
              </Typography.Text>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('admin.customComponent.writeCode')}
        open={editorOpen}
        width={860}
        onCancel={() => setEditorOpen(false)}
        onOk={confirmEditor}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        destroyOnHidden
      >
        <Radio.Group
          value={codeType}
          onChange={(event) => switchCodeType(event.target.value as 'sfc' | 'configSfc')}
          style={{ marginBottom: 12 }}
        >
          <Radio.Button value="sfc">{t('admin.customComponent.sfcCode')}</Radio.Button>
          <Radio.Button value="configSfc">{t('admin.customComponent.configSfcCode')}</Radio.Button>
        </Radio.Group>
        <Input.TextArea
          rows={20}
          value={codeDraft}
          onChange={(event) => setCodeDraft(event.target.value)}
          placeholder={codeType === 'sfc' ? '<template><div>自定义组件</div></template>' : t('admin.customComponent.configCodePlaceholder')}
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12 }}
        />
      </Modal>

      <Modal
        title={`${t('admin.customComponent.previewTitle')}${previewData?.name ? ` - ${previewData.name}` : ''}`}
        open={previewOpen}
        width={860}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>
            {t('common.close')}
          </Button>,
        ]}
      >
        {previewData && (
          <div>
            <Space direction="vertical" size={4} style={{ marginBottom: 12, display: 'flex' }}>
              <div>
                <Typography.Text type="secondary">{t('admin.customComponent.typeKeyLabel')}</Typography.Text>
                <Tag color="blue">{previewData.type}</Tag>
              </div>
              <div>
                <Typography.Text type="secondary">{t('admin.customComponent.valueTypeLabel')}</Typography.Text>
                <Tag color="cyan">{previewData.valueType}</Tag>
              </div>
              <div>
                <Typography.Text type="secondary">{t('admin.customComponent.iconLabel')}</Typography.Text>
                {previewData.icon || '-'}
              </div>
            </Space>
            <Typography.Title level={5}>{t('admin.customComponent.sfcCode')}</Typography.Title>
            <pre style={codeStyle}>{toSfcText(previewData.sfc) || t('admin.customComponent.none')}</pre>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              {t('admin.customComponent.configSfcCode')}
            </Typography.Title>
            <pre style={codeStyle}>{previewData.configSfc || t('admin.customComponent.none')}</pre>
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message={t('admin.customComponent.reactNote')}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomFormComponentManager;
