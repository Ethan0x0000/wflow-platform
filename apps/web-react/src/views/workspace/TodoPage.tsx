import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table, Tag, Button, Space, Modal, message, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { claimTheTask, getTodoTasks } from '@/api/task';
import { SearchTools, type SearchParams } from '@/components/SearchTools';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { ProcessInstPreview } from './subs/ProcessInstPreview';
import { WAvatar } from '@/components/WAvatar';

export const TodoPage: React.FC = () => {
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
      const res = await getTodoTasks({ pageNo: p, pageSize: s, ...paramsRef.current });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.todo.loadFailed'));
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

  const claimTask = (row: any) => {
    Modal.confirm({
      title: t('common.tip'),
      content: t('workspace.todo.claimConfirm'),
      okText: t('workspace.table.claim'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const res = await claimTheTask(row.taskId);
          message.success(res.data || t('workspace.todo.claimSuccess'));
          void loadList(pageNo, pageSize);
        } catch (e: any) {
          message.error(e?.msg || t('workspace.todo.claimFailed'));
        }
      },
    });
  };

  const columns: TableColumnsType<any> = [
    {
      title: t('workspace.table.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <Typography.Link
          onClick={(event) => {
            event.stopPropagation();
            openInst(record);
          }}
        >
          {text || record.defineName}
        </Typography.Link>
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
          id={record.initiator?.id}
          name={record.initiator?.name}
          src={record.initiator?.avatar}
          status="agent"
          showStatus={record.isAgent}
          size={24}
        />
      ),
    },
    { title: t('workspace.table.initiatorDept'), dataIndex: 'deptName', key: 'deptName', width: 120 },
    { title: t('workspace.table.currentNode'), dataIndex: 'currentNodeName', key: 'currentNodeName', width: 130 },
    {
      title: t('workspace.table.status'),
      key: 'status',
      width: 100,
      render: () => <Tag color="warning">{t('workspace.todo.pending')}</Tag>,
    },
    { title: t('workspace.table.taskArriveTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: t('workspace.table.action'),
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_: any, record: any) =>
        record.candidate === true ? (
          <Space size={4}>
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
            <Button
              type="link"
              style={{ color: '#faad14' }}
              icon={<CheckCircleOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                claimTask(record);
              }}
            >
              {t('workspace.table.claim')}
            </Button>
          </Space>
        ) : (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              openInst(record);
            }}
          >
            {t('workspace.table.handle')}
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
        startDesc={t('workspace.search.taskArrival')}
      />

      <Table
        style={{ marginTop: 10 }}
        rowKey={(record) => record.taskId || record.instId}
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
        taskId={current?.taskId || undefined}
        nodeId={current?.currentNodeId || undefined}
        onClose={() => setPreviewOpen(false)}
        onSuccess={() => void loadList(pageNo, pageSize)}
      />
    </div>
  );
};

export default TodoPage;
