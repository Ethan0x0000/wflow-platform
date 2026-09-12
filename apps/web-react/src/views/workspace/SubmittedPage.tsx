import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table, Tag, Button, Space, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { EyeOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getMySubmitInst } from '@/api/instance';
import { SearchTools, type SearchParams } from '@/components/SearchTools';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { ProcessInstPreview } from './subs/ProcessInstPreview';
import { WAvatar } from '@/components/WAvatar';

export const SubmittedPage: React.FC = () => {
  const navigate = useNavigate();
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
      const res = await getMySubmitInst({ pageNo: p, pageSize: s, ...paramsRef.current });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.submitted.loadFailed'));
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

  const retrySubmit = (row: any) => {
    navigate(`/workspace/startProc?code=${row.code}&instId=${row.instId}`);
  };

  const statusTag = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Tag color="processing">{t('workspace.status.running')}</Tag>;
      case 'SUSPEND':
        return <Tag color="warning">{t('workspace.status.suspended')}</Tag>;
      case 'REFUSE':
        return <Tag color="error">{t('workspace.status.refused')}</Tag>;
      case 'REVOKED':
        return <Tag color="default">{t('workspace.status.revoked')}</Tag>;
      case 'PASS':
        return <Tag color="success">{t('workspace.status.passed')}</Tag>;
      case 'EXCEPTION':
        return <Tag color="volcano">{t('workspace.status.exception')}</Tag>;
      default:
        return <Tag>{status || t('workspace.status.unknown')}</Tag>;
    }
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
          id={record.initiator?.id}
          name={record.initiator?.name}
          src={record.initiator?.avatar}
          status="agent"
          showStatus={record.isAgent}
          size={24}
        />
      ),
    },
    { title: t('workspace.table.currentNode'), dataIndex: 'currentNodeName', key: 'currentNodeName', width: 130 },
    {
      title: t('workspace.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => statusTag(status),
    },
    { title: t('workspace.table.submitTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
    { title: t('workspace.table.finishTime'), dataIndex: 'endTime', key: 'endTime', width: 170 },
    {
      title: t('workspace.table.action'),
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              openInst(record);
            }}
          >
            {t('workspace.table.detail')}
          </Button>
          {(record.status === 'REFUSE' || record.status === 'REVOKED') && (
            <Button
              type="link"
              style={{ color: '#faad14' }}
              icon={<SendOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                retrySubmit(record);
              }}
            >
              {t('workspace.table.resubmit')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SearchTools
        value={params}
        onChange={handleChange}
        onSearch={handleSearch}
        showStatus
        startDesc={t('workspace.search.processStart')}
      />

      <Table
        style={{ marginTop: 10 }}
        rowKey="instId"
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

export default SubmittedPage;
