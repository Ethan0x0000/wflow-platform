import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table, Tag, Button, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { getIdoTasks } from '@/api/task';
import { SearchTools, type SearchParams } from '@/components/SearchTools';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { ProcessInstPreview } from './subs/ProcessInstPreview';
import { WAvatar } from '@/components/WAvatar';

const ACTION_LABELS: Record<string, { text: string; color: string }> = {
  complete: { text: 'workspace.action.complete', color: 'processing' },
  agree: { text: 'workspace.action.agree', color: 'success' },
  reject: { text: 'workspace.action.reject', color: 'error' },
  forward: { text: 'workspace.action.forward', color: 'default' },
  fallback: { text: 'workspace.action.fallback', color: 'warning' },
  beforeAdd: { text: 'workspace.action.beforeAdd', color: 'processing' },
  afterAdd: { text: 'workspace.action.afterAdd', color: 'processing' },
  revoke: { text: 'workspace.action.revoke', color: 'warning' },
  revise: { text: 'workspace.action.revise', color: 'warning' },
  withdraw: { text: 'workspace.action.withdraw', color: 'warning' },
  comment: { text: 'workspace.action.comment', color: 'default' },
  cancel: { text: 'workspace.action.cancel', color: 'default' },
};

export const IdoPage: React.FC = () => {
  const { t } = useTranslation();
  const [params, setParams] = useState<SearchParams>({});
  const paramsRef = useRef<SearchParams>(params);

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState<any>(null);

  const loadList = useCallback(async (p: number, s: number) => {
    setLoading(true);
    try {
      const res = await getIdoTasks({ pageNo: p, pageSize: s, ...paramsRef.current });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.ido.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(pageNo, pageSize);
  }, [pageNo, pageSize, loadList]);

  const handleChange = (next: SearchParams) => {
    paramsRef.current = next;
    setParams(next);
  };

  const handleSearch = () => {
    if (pageNo === 1) void loadList(1, pageSize);
    else setPageNo(1);
  };

  const openInst = (row: any) => {
    setCurrent(row);
    setPreviewOpen(true);
  };

  const columns: TableColumnsType<any> = [
    {
      title: t('workspace.table.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <a
          onClick={(event) => {
            event.stopPropagation();
            openInst(record);
          }}
        >
          {text || record.defineName}
        </a>
      ),
    },
    { title: t('workspace.table.processType'), dataIndex: 'defineName', key: 'defineName', width: 140 },
    { title: t('workspace.table.serialNumber'), dataIndex: 'instId', key: 'instId', width: 170, ellipsis: true },
    {
      title: t('workspace.table.initiator'),
      dataIndex: 'initiator',
      key: 'initiator',
      width: 130,
      render: (_: any, record: any) => (
        <WAvatar
          id={record.userId}
          name={record.username}
          src={record.avatar}
          status="agent"
          showStatus={record.userId !== record.submitter}
          size={24}
        />
      ),
    },
    { title: t('workspace.table.initiatorDept'), dataIndex: 'deptName', key: 'deptName', width: 120 },
    { title: t('workspace.table.processNode'), dataIndex: 'nodeName', key: 'nodeName', width: 130 },
    {
      title: t('workspace.table.handleAction'),
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (action: string) => {
        const conf = ACTION_LABELS[action];
        return conf ? (
          <Tag color={conf.color}>{t(conf.text)}</Tag>
        ) : (
          <Tag>{action || t('workspace.action.processing')}</Tag>
        );
      },
    },
    { title: t('workspace.table.arriveTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
    { title: t('workspace.table.finishTime'), dataIndex: 'endTime', key: 'endTime', width: 170 },
    {
      title: t('workspace.table.action'),
      key: 'actionView',
      width: 100,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation();
            openInst(record);
          }}
        >
          {t('workspace.table.view')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SearchTools
        value={params}
        onChange={handleChange}
        onSearch={handleSearch}
        showAction
        startDesc={t('workspace.search.taskArrival')}
      />

      <Table
        style={{ marginTop: 10 }}
        rowKey={(record) => record.taskId || `${record.instId}-${record.action}-${record.endTime}`}
        loading={loading}
        dataSource={records}
        columns={columns}
        onRow={(record) => ({ onClick: () => openInst(record) })}
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

      <ProcessInstPreview
        open={previewOpen}
        instId={current?.instId || ''}
        onClose={() => setPreviewOpen(false)}
        onSuccess={() => void loadList(pageNo, pageSize)}
      />
    </div>
  );
};

export default IdoPage;
