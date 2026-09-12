import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { getProcGroupItemsList, getModelFormFields } from '@/api/model';
import { getInstWithFormByCode, exportInstWithFormByCode } from '@/api/instance';
import { downloadBlob } from '@/api/request';
import { resUrl } from '@/utils/resource';
import { WAvatar } from '@/components/WAvatar';
import { useTranslation } from '@/i18n';

interface GroupOption {
  value: string;
  label: string;
  children: Array<{ value: string; label: string }>;
}

const statusTag = (tr: (key: string) => string, status: string) => {
  switch (status) {
    case 'RUNNING':
      return <Tag color="processing">{tr('admin.status.running')}</Tag>;
    case 'SUSPEND':
      return <Tag color="warning">{tr('admin.status.suspended')}</Tag>;
    case 'REFUSE':
      return <Tag color="error">{tr('admin.status.refused')}</Tag>;
    case 'REVOKED':
      return <Tag color="default">{tr('admin.status.revoked')}</Tag>;
    case 'PASS':
      return <Tag color="success">{tr('admin.status.passed')}</Tag>;
    case 'EXCEPTION':
      return <Tag color="volcano">{tr('admin.status.exception')}</Tag>;
    default:
      return <Tag>{status || tr('admin.status.unknown')}</Tag>;
  }
};

const asAttachment = (tr: (key: string) => string, entry: any, fallbackName?: string) => {
  if (entry && typeof entry === 'object') {
    return { url: String(entry.url ?? ''), name: String(entry.name ?? fallbackName ?? tr('admin.instanceFormData.attachment')) };
  }
  return { url: String(entry ?? ''), name: fallbackName || String(entry ?? tr('admin.instanceFormData.attachment')) };
};

const renderFieldValue = (
  tr: (key: string) => string,
  value: any,
  valueType?: string,
  type?: string
): React.ReactNode => {
  if (value === null || value === undefined || value === '') return '-';
  switch (valueType) {
    case 'option':
      return value?.label ?? value?.name ?? String(value);
    case 'options':
      return (Array.isArray(value) ? value : [value])
        .map((item: any) => item?.label ?? item?.name ?? item)
        .join('、');
    case 'timeRange':
    case 'dateTimeRange':
      return Array.isArray(value) ? `${value[0] ?? ''} ~ ${value[1] ?? ''}` : String(value);
    case 'org':
      return value?.name ?? '-';
    case 'orgArray':
      return (value || [])
        .map((item: any) => item?.name)
        .filter(Boolean)
        .join('、') || '-';
    case 'array':
      return Array.isArray(value)
        ? value.map((item: any) => (item && typeof item === 'object' ? item?.name ?? item?.label ?? '' : item)).join('、')
        : String(value);
    case 'image': {
      const file = asAttachment(tr, value, tr('admin.instanceFormData.image'));
      return <img src={resUrl(file.url)} style={{ width: 50, height: 50, margin: 2, objectFit: 'cover' }} />;
    }
    case 'imageArray':
      return (
        <Space size={2} wrap>
          {(Array.isArray(value) ? value : [value]).map((entry: any, index: number) => {
            const file = asAttachment(tr, entry, tr('admin.instanceFormData.imageName').replace('{index}', String(index + 1)));
            return (
              <a key={`${file.url}-${index}`} href={resUrl(file.url)} target="_blank" rel="noreferrer">
                <img
                  src={resUrl(file.url, { zip: 'true' })}
                  style={{ width: 50, height: 50, margin: 2, objectFit: 'cover' }}
                />
              </a>
            );
          })}
        </Space>
      );
    case 'fileArray':
      return (
        <Space size={4} wrap>
          {(Array.isArray(value) ? value : [value]).map((entry: any, index: number) => {
            const file = asAttachment(tr, entry, tr('admin.instanceFormData.attachmentName').replace('{index}', String(index + 1)));
            return (
              <a key={`${file.url}-${index}`} href={resUrl(file.url, { download: 'true' })} target="_blank" rel="noreferrer">
                {file.name}
              </a>
            );
          })}
        </Space>
      );
    case 'object':
      if (type === 'PhoneNumber') return `+${value?.prefix ?? ''} ${value?.number ?? ''}`.trim();
      return value?.name ?? value?.label ?? JSON.stringify(value);
    default:
      if (typeof value === 'object') return value?.name ?? value?.label ?? JSON.stringify(value);
      return String(value);
  }
};

export const InstanceFormDataManager: React.FC = () => {
  const { t } = useTranslation();
  const statusOptions = [
    { label: t('admin.status.running'), value: 'RUNNING' },
    { label: t('admin.status.suspended'), value: 'SUSPEND' },
    { label: t('admin.status.refused'), value: 'REFUSE' },
    { label: t('admin.status.revoked'), value: 'REVOKED' },
    { label: t('admin.status.passed'), value: 'PASS' },
    { label: t('admin.status.exception'), value: 'EXCEPTION' },
  ];
  const compareOptions = [
    { label: t('admin.instanceFormData.compareLike'), value: 'LIKE' },
    { label: t('admin.instanceFormData.compareEq'), value: 'EQ' },
    { label: t('admin.instanceFormData.compareNeq'), value: 'NEQ' },
    { label: t('admin.instanceFormData.compareGt'), value: 'GT' },
    { label: t('admin.instanceFormData.compareGe'), value: 'GE' },
    { label: t('admin.instanceFormData.compareLt'), value: 'LT' },
    { label: t('admin.instanceFormData.compareLe'), value: 'LE' },
  ];
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [modelKeyword, setModelKeyword] = useState('');

  const [codePath, setCodePath] = useState<string[] | undefined>(undefined);
  const code = codePath && codePath.length > 0 ? String(codePath[codePath.length - 1]) : undefined;
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [startRange, setStartRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [fieldKey, setFieldKey] = useState<string | undefined>(undefined);
  const [compare, setCompare] = useState<string | undefined>('LIKE');
  const [fieldValue, setFieldValue] = useState('');
  const [fieldOptions, setFieldOptions] = useState<Array<{ label: string; value: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadToken, setReloadToken] = useState(0);
  const [detailRecord, setDetailRecord] = useState<any | null>(null);

  const filtersRef = useRef({
    code: undefined as string | undefined,
    status: undefined as string | undefined,
    startRange: null as [Dayjs, Dayjs] | null,
    fieldKey: undefined as string | undefined,
    compare: 'LIKE' as string | undefined,
    fieldValue: '',
  });
  filtersRef.current = { code, status, startRange, fieldKey, compare, fieldValue };

  useEffect(() => {
    getProcGroupItemsList()
      .then((res) => {
        const options: GroupOption[] = (res.data || [])
          .filter((group: any) => group.items?.length)
          .map((group: any) => ({
            value: String(group.id),
            label: group.name,
            children: group.items.map((item: any) => ({ value: String(item.code), label: item.procName })),
          }));
        setGroups(options);
      })
      .catch((e: any) => message.error(e?.msg || t('admin.instanceFormData.fetchGroupsFailed')));
  }, []);

  const cascaderOptions = useMemo(() => {
    const term = modelKeyword.trim();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        children: group.children.filter((item) => item.label.includes(term)),
      }))
      .filter((group) => group.children.length > 0);
  }, [groups, modelKeyword]);

  const dynamicFields = useMemo(() => {
    const map = new Map<string, { key: string; name: string; valueType?: string; type?: string }>();
    records.forEach((record: any) => {
      (record.fieldData || []).forEach((field: any) => {
        if (field?.key && !map.has(field.key)) map.set(field.key, field);
      });
    });
    return Array.from(map.values());
  }, [records]);

  const buildQueryParams = useCallback(() => {
    const f = filtersRef.current;
    const params: Record<string, any> = {};
    if (f.code) params.code = f.code;
    if (f.status) params.status = f.status;
    if (f.startRange?.[0] && f.startRange[1]) {
      params.startRange = `${f.startRange[0].format('YYYY-MM-DD HH:mm')},${f.startRange[1].format('YYYY-MM-DD HH:mm')}`;
    }
    if (f.fieldKey && f.fieldValue) {
      params.fieldKey = f.fieldKey;
      params.compare = f.compare || 'LIKE';
      params.fieldValue = f.fieldValue;
    }
    return params;
  }, []);

  const loadData = useCallback(
    async (page: number, size: number) => {
      if (!code) {
        setRecords([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      try {
        const res = await getInstWithFormByCode({ ...buildQueryParams(), pageNo: page, pageSize: size });
        const data = res.data || {};
        setRecords(data.records || []);
        setTotal(data.total || 0);
      } catch (e: any) {
        message.error(e?.msg || t('admin.instanceFormData.fetchDataFailed'));
      } finally {
        setLoading(false);
      }
    },
    [code, buildQueryParams]
  );

  useEffect(() => {
    void loadData(pageNo, pageSize);
  }, [pageNo, pageSize, code, reloadToken, loadData]);

  const handleCodeChange = async (next?: string[]) => {
    const path = next && next.length > 0 ? next : undefined;
    const value = path ? String(path[path.length - 1]) : undefined;
    setCodePath(path);
    setFieldKey(undefined);
    setCompare('LIKE');
    setFieldValue('');
    setPageNo(1);
    if (!value) {
      setFieldOptions([]);
      return;
    }
    try {
      const res = await getModelFormFields(value);
      const options = (res.data || [])
        .filter((field: any) => !field.parent && field.valueType !== 'none')
        .map((field: any) => ({ label: field.name || field.key, value: String(field.key) }));
      setFieldOptions(options);
    } catch (e: any) {
      setFieldOptions([]);
      message.error(e?.msg || t('admin.instanceFormData.fetchFieldsFailed'));
    }
  };

  const handleSearch = () => {
    if (!code) {
      message.warning(t('admin.instanceFormData.selectProcessType'));
      return;
    }
    if (pageNo === 1) setReloadToken((token) => token + 1);
    else setPageNo(1);
  };

  const handleReset = () => {
    setModelKeyword('');
    setCodePath(undefined);
    setStatus(undefined);
    setStartRange(null);
    setFieldKey(undefined);
    setCompare('LIKE');
    setFieldValue('');
    setFieldOptions([]);
    setRecords([]);
    setTotal(0);
    setPageNo(1);
  };

  const handleExport = async () => {
    if (!code) {
      message.warning(t('admin.instanceFormData.selectProcessType'));
      return;
    }
    setExporting(true);
    try {
      const res: any = await exportInstWithFormByCode(buildQueryParams());
      const disposition = res?.headers?.['content-disposition'] as string | undefined;
      const match = disposition ? /filename\*=UTF-8''([^;]+)/i.exec(disposition) : null;
      const filename = match?.[1] ? decodeURIComponent(match[1]) : t('admin.instanceFormData.exportFileName');
      downloadBlob(res.data as Blob, filename);
      message.success(t('admin.instanceFormData.exportSuccess'));
    } catch (e: any) {
      message.error(e?.msg || t('admin.instanceFormData.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const columns: TableColumnsType<any> = useMemo(
    () => [
      { title: t('admin.table.processType'), dataIndex: 'defineName', key: 'defineName', width: 140, ellipsis: true },
      { title: t('admin.table.title'), dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
      { title: t('admin.table.serialNo'), dataIndex: 'instId', key: 'instId', width: 170, ellipsis: true },
      ...dynamicFields.map((field) => ({
        title: field.name || field.key,
        dataIndex: field.key,
        key: field.key,
        width: 160,
        ellipsis: !['image', 'imageArray', 'fileArray'].includes(String(field.valueType)),
        render: (_: unknown, record: any) => {
          const entry = (record.fieldData || []).find((item: any) => item.key === field.key);
          return renderFieldValue(t, entry?.value, entry?.valueType ?? field.valueType, entry?.type ?? field.type);
        },
      })),
      {
        title: t('admin.table.initiator'),
        dataIndex: 'initiator',
        key: 'initiator',
        width: 150,
        render: (_: unknown, record: any) => (
          <WAvatar
            id={record.initiator?.id}
            name={record.initiator?.name}
            src={record.initiator?.avatar}
            status="agent"
            showStatus={record.isAgent}
            size={24}
          />
        ),
      },
      { title: t('admin.table.initiatorDept'), dataIndex: 'deptName', key: 'deptName', width: 120, ellipsis: true },
      { title: t('admin.table.currentNode'), dataIndex: 'currentNodeName', key: 'currentNodeName', width: 120, ellipsis: true },
      {
        title: t('admin.table.status'),
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: string) => statusTag(t, value),
      },
      { title: t('admin.table.submitTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
      {
        title: t('admin.table.endTime'),
        dataIndex: 'endTime',
        key: 'endTime',
        width: 170,
        render: (time?: string | null) => time || '-',
      },
      {
        title: t('admin.table.action'),
        key: 'action',
        width: 110,
        fixed: 'right',
        render: (_: unknown, record: any) =>
          record.fieldData?.length ? (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDetailRecord(record)}>
              {t('admin.table.fieldDetail')}
            </Button>
          ) : (
            '-'
          ),
      },
    ],
    [dynamicFields, t]
  );

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            placeholder={t('admin.instanceFormData.searchFormName')}
            prefix={<SearchOutlined />}
            value={modelKeyword}
            onChange={(event) => setModelKeyword(event.target.value)}
            allowClear
            style={{ width: 180 }}
          />
          <Cascader
            placeholder={t('admin.table.processType')}
            options={cascaderOptions}
            value={codePath}
            onChange={(value) => void handleCodeChange(value as string[] | undefined)}
            displayRender={(labels) => labels[labels.length - 1]}
            showSearch
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder={t('admin.instanceFormData.processStatus')}
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value)}
            allowClear
            style={{ width: 120 }}
          />
          <DatePicker.RangePicker
            showTime
            format="YYYY-MM-DD HH:mm"
            value={startRange}
            onChange={(value) => setStartRange(value as [Dayjs, Dayjs] | null)}
            placeholder={[t('admin.instanceFormData.submitTimeStart'), t('admin.instanceFormData.submitTimeEnd')]}
            style={{ width: 330 }}
          />
          <Space.Compact>
            <Select
              placeholder={t('admin.instanceFormData.selectField')}
              options={fieldOptions}
              value={fieldKey}
              onChange={(value) => setFieldKey(value)}
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 150 }}
            />
            <Select
              placeholder={t('admin.instanceFormData.compareRelation')}
              options={compareOptions}
              value={compare}
              onChange={(value) => setCompare(value)}
              style={{ width: 110 }}
            />
            <Input
              placeholder={t('admin.instanceFormData.inputValue')}
              value={fieldValue}
              onChange={(event) => setFieldValue(event.target.value)}
              onPressEnter={handleSearch}
              allowClear
              style={{ width: 180 }}
            />
          </Space.Compact>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            {t('common.reset')}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            disabled={!code}
            onClick={() => void handleExport()}
          >
            {t('admin.instanceFormData.exportData')}
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="instId"
        loading={loading}
        dataSource={records}
        columns={columns}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: code ? undefined : t('admin.instanceFormData.emptySelectType') }}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (value) => t('admin.common.totalData').replace('{total}', String(value)),
          onChange: (page, size) => {
            setPageNo(page);
            setPageSize(size);
          },
        }}
      />

      <Modal
        title={
          <span>
            {t('admin.table.fieldDetail')}
            {detailRecord?.title ? ` - ${detailRecord.title}` : detailRecord?.instId ? ` - ${detailRecord.instId}` : ''}
          </span>
        }
        open={Boolean(detailRecord)}
        width={860}
        footer={null}
        onCancel={() => setDetailRecord(null)}
        destroyOnHidden
      >
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={detailRecord?.fieldData || []}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: t('admin.table.fieldKey'), dataIndex: 'key', key: 'key', width: 170 },
            { title: t('admin.table.fieldName'), dataIndex: 'name', key: 'name', width: 170 },
            {
              title: t('admin.table.valueType'),
              dataIndex: 'valueType',
              key: 'valueType',
              width: 130,
              render: (value: string) => <Tag color="cyan">{value}</Tag>,
            },
            {
              title: t('admin.table.fieldValue'),
              key: 'value',
              render: (_: unknown, field: any) => renderFieldValue(t, field.value, field.valueType, field.type),
            },
          ]}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {t('admin.common.totalFields').replace('{total}', String(detailRecord?.fieldData?.length || 0))}
        </Typography.Text>
      </Modal>
    </div>
  );
};

export default InstanceFormDataManager;
