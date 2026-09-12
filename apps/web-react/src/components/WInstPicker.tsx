import React, { useEffect, useState } from 'react';
import { Input, Modal, Space, Table, Tabs, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getIdoTasks, getTodoTasks } from '@/api/task';
import { getCcMeInst, getMySubmitInst } from '@/api/instance';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { WAvatar } from './WAvatar';

export type WInstPickerTab = 'todo' | 'submit' | 'ido' | 'cc';

export interface WInstPickerProps {
  open: boolean;
  code?: string;
  title?: string;
  onOk: (record: any) => void;
  onCancel: () => void;
}

const TAB_ITEMS: Array<{ key: WInstPickerTab }> = [
  { key: 'todo' },
  { key: 'submit' },
  { key: 'ido' },
  { key: 'cc' },
];

const rowKey = (record: any) =>
  `${record?.instId ?? record?.id ?? ''}:${record?.taskId ?? ''}:${record?.nodeId ?? ''}`;

export const WInstPicker: React.FC<WInstPickerProps> = ({
  open,
  code,
  title,
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<WInstPickerTab>('todo');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const load = async (tab: WInstPickerTab, page: number, term: string, size = pageSize) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        pageNo: page,
        pageSize: size,
        title: term || undefined,
        code: code || undefined,
      };
      const api =
        tab === 'todo'
          ? getTodoTasks
          : tab === 'submit'
            ? getMySubmitInst
            : tab === 'ido'
              ? getIdoTasks
              : getCcMeInst;
      const res = await api(params);
      const data = res.data || {};
      setRecords(Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : []);
      setTotal(Number(data.total || 0));
    } catch (err: any) {
      message.error(err?.msg || t('workspace.picker.loadFailed'));
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActiveTab('todo');
    setKeyword('');
    setPageNo(1);
    setSelected(null);
    void load('todo', 1, '', 10);
  }, [open]);

  const handleTabChange = (key: string) => {
    const next = key as WInstPickerTab;
    setActiveTab(next);
    setPageNo(1);
    setSelected(null);
    void load(next, 1, '');
  };

  const handleSearch = (value: string) => {
    setKeyword(value);
    setPageNo(1);
    void load(activeTab, 1, value);
  };

  const handleTableChange: TableProps<any>['onChange'] = (pagination) => {
    const nextPage = pagination.current || 1;
    const nextSize = pagination.pageSize || 10;
    setPageNo(nextPage);
    setPageSize(nextSize);
    void load(activeTab, nextPage, keyword, nextSize);
  };

  const rowSelection: TableProps<any>['rowSelection'] = {
    type: 'radio',
    selectedRowKeys: selected ? [rowKey(selected)] : [],
    onChange: (_keys, rows) => setSelected(rows[0] || null),
  };

  const columns: any[] = [
    {
      title: t('workspace.table.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <a onClick={() => setSelected(record)} style={{ fontWeight: 500 }}>
          {text || record.defineName}
        </a>
      ),
    },
    {
      title: t('workspace.table.processType'),
      dataIndex: 'defineName',
      key: 'defineName',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('workspace.table.initiator'),
      dataIndex: 'initiator',
      key: 'initiator',
      width: 130,
      render: (initiator: any) => (
        <Space size={6}>
          <WAvatar id={initiator?.id} name={initiator?.name} size={22} />
          <span>{initiator?.name}</span>
        </Space>
      ),
    },
    {
      title: t('workspace.table.node'),
      key: 'node',
      width: 120,
      render: (_: any, record: any) => (
        <Tag color="blue">{record.currentNodeName || record.nodeName || '-'}</Tag>
      ),
    },
    {
      title: t('workspace.table.time'),
      key: 'createTime',
      width: 170,
      render: (_: any, record: any) => record.createTime || record.endTime || '',
    },
  ];

  return (
    <Modal
      title={title ?? t('workspace.picker.title')}
      open={open}
      width={860}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => {
        if (selected) onOk(selected);
        onCancel();
      }}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !selected }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        size="small"
        items={TAB_ITEMS.map((item) => ({ key: item.key, label: t(`workspace.picker.tabs.${item.key}`) }))}
      />
      <Input
        placeholder={t('workspace.picker.searchTitle')}
        prefix={<SearchOutlined />}
        value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        allowClear
        style={{ marginBottom: 12, width: 260 }}
      />
      <Table
        rowKey={rowKey}
        rowSelection={rowSelection}
        size="small"
        loading={loading}
        dataSource={records}
        columns={columns}
        onRow={(record) => ({ onClick: () => setSelected(record) })}
        pagination={{
          current: pageNo,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => formatMessage(t('workspace.table.totalItems'), { total }),
        }}
        onChange={handleTableChange}
      />
    </Modal>
  );
};

export default WInstPicker;
