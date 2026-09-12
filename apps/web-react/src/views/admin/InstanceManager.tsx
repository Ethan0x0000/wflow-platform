import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Table, Tabs, Tag, Tooltip, message, Popconfirm, Space } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { getInstList, delInst } from '@/api/instance';
import { getManagerTasks, suspendInst, resumeInst } from '@/api/manager';
import { SearchTools, type SearchParams } from '@/components/SearchTools';
import { ProcessInstPreview } from '@/views/workspace/subs/ProcessInstPreview';
import { WAvatar } from '@/components/WAvatar';
import { useTranslation } from '@/i18n';

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

export const InstanceManager: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('instance');

  // 实例管理
  const [instParams, setInstParams] = useState<SearchParams>({});
  const instParamsRef = useRef<SearchParams>({});
  const [instLoading, setInstLoading] = useState(false);
  const [instRecords, setInstRecords] = useState<any[]>([]);
  const [instTotal, setInstTotal] = useState(0);
  const [instPageNo, setInstPageNo] = useState(1);
  const [instPageSize, setInstPageSize] = useState(10);

  // 任务管理
  const [taskLoaded, setTaskLoaded] = useState(false);
  const [taskParams, setTaskParams] = useState<SearchParams>({});
  const taskParamsRef = useRef<SearchParams>({});
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskRecords, setTaskRecords] = useState<any[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPageNo, setTaskPageNo] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(10);

  // 详情预览
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ instId: string; taskId?: string; nodeId?: string }>({ instId: '' });

  const loadInst = useCallback(async (page: number, size: number) => {
    setInstLoading(true);
    try {
      const res = await getInstList({ pageNo: page, pageSize: size, ...instParamsRef.current });
      const data = res.data || {};
      setInstRecords(data.records || []);
      setInstTotal(data.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('admin.instanceManager.fetchFailed'));
    } finally {
      setInstLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async (page: number, size: number) => {
    setTaskLoading(true);
    try {
      const res = await getManagerTasks({ pageNo: page, pageSize: size, ...taskParamsRef.current });
      const data = res.data || {};
      setTaskRecords(data.records || []);
      setTaskTotal(data.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('admin.instanceManager.taskFetchFailed'));
    } finally {
      setTaskLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInst(instPageNo, instPageSize);
  }, [instPageNo, instPageSize, loadInst]);

  useEffect(() => {
    if (!taskLoaded) return;
    void loadTasks(taskPageNo, taskPageSize);
  }, [taskLoaded, taskPageNo, taskPageSize, loadTasks]);

  const refreshAll = useCallback(() => {
    void loadInst(instPageNo, instPageSize);
    if (taskLoaded) void loadTasks(taskPageNo, taskPageSize);
  }, [loadInst, loadTasks, instPageNo, instPageSize, taskLoaded, taskPageNo, taskPageSize]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'task' && !taskLoaded) setTaskLoaded(true);
  };

  const handleInstChange = (next: SearchParams) => {
    instParamsRef.current = next;
    setInstParams(next);
  };

  const handleInstSearch = () => {
    if (instPageNo === 1) void loadInst(1, instPageSize);
    else setInstPageNo(1);
  };

  const handleTaskChange = (next: SearchParams) => {
    taskParamsRef.current = next;
    setTaskParams(next);
  };

  const handleTaskSearch = () => {
    if (taskPageNo === 1) void loadTasks(1, taskPageSize);
    else setTaskPageNo(1);
  };

  const openPreview = (record: any, withNode = false) => {
    setPreview({
      instId: record.instId,
      taskId: record.taskId || undefined,
      nodeId: withNode ? record.currentNodeId || undefined : undefined,
    });
    setPreviewOpen(true);
  };

  const handleSuspend = async (record: any) => {
    try {
      await suspendInst(record.instId);
      message.success(t('admin.instanceManager.suspendSuccess'));
      refreshAll();
    } catch (e: any) {
      message.error(e?.msg || t('admin.instanceManager.suspendFailed'));
    }
  };

  const handleResume = async (record: any) => {
    try {
      await resumeInst(record.instId);
      message.success(t('admin.instanceManager.resumeSuccess'));
      refreshAll();
    } catch (e: any) {
      message.error(e?.msg || t('admin.instanceManager.resumeFailed'));
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await delInst(record.instId);
      message.success(t('admin.common.deleteSuccess'));
      if (instRecords.length === 1 && instPageNo > 1) {
        setInstPageNo((page) => page - 1);
      } else {
        refreshAll();
      }
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.deleteFailed'));
    }
  };

  const instColumns: TableColumnsType<any> = [
    {
      title: t('admin.table.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <a style={{ fontWeight: 500 }} onClick={() => openPreview(record)}>
          {text || record.defineName}
        </a>
      ),
    },
    { title: t('admin.table.processType'), dataIndex: 'defineName', key: 'defineName', width: 140, ellipsis: true },
    { title: t('admin.table.serialNo'), dataIndex: 'instId', key: 'instId', width: 170, ellipsis: true },
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
    { title: t('admin.table.currentNode'), dataIndex: 'currentNodeName', key: 'currentNodeName', width: 130 },
    {
      title: t('admin.table.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => statusTag(t, status),
    },
    { title: t('admin.table.submitTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: t('admin.table.completedTime'),
      dataIndex: 'endTime',
      key: 'endTime',
      width: 170,
      render: (time?: string | null) => time || '-',
    },
    {
      title: t('admin.table.action'),
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)}>
             {t('admin.table.view')}
          </Button>
          {record.status === 'RUNNING' && (
            <Popconfirm
              title={t('admin.instanceManager.suspendConfirm')}
              okText={t('admin.instanceManager.suspendOk')}
              cancelText={t('common.cancel')}
              onConfirm={() => handleSuspend(record)}
            >
              <Button type="link" size="small" icon={<PauseCircleOutlined />}>
                {t('admin.instanceManager.suspend')}
              </Button>
            </Popconfirm>
          )}
          {record.status === 'SUSPEND' && (
            <Popconfirm
              title={t('admin.instanceManager.resumeConfirm')}
              okText={t('admin.instanceManager.resumeOk')}
              cancelText={t('common.cancel')}
              onConfirm={() => handleResume(record)}
            >
              <Button type="link" size="small" icon={<PlayCircleOutlined />}>
                {t('admin.instanceManager.resume')}
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title={t('admin.instanceManager.deleteConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns: TableColumnsType<any> = [
    {
      title: t('admin.table.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <a style={{ fontWeight: 500 }} onClick={() => openPreview(record)}>
          {text || record.defineName}
        </a>
      ),
    },
    { title: t('admin.table.processType'), dataIndex: 'defineName', key: 'defineName', width: 140, ellipsis: true },
    { title: t('admin.table.serialNo'), dataIndex: 'instId', key: 'instId', width: 170, ellipsis: true },
    { title: t('admin.table.taskNode'), dataIndex: 'currentNodeName', key: 'currentNodeName', width: 140 },
    {
      title: t('admin.table.initiator'),
      dataIndex: 'initiator',
      key: 'initiator',
      width: 150,
      render: (_: unknown, record: any) =>
        record.initiator ? (
          <WAvatar
            id={record.initiator.id}
            name={record.initiator.name}
            src={record.initiator.avatar}
            status="agent"
            showStatus={record.isAgent}
            size={24}
          />
        ) : (
          '-'
        ),
    },
    {
      title: t('admin.table.assignee'),
      dataIndex: 'assignees',
      key: 'assignees',
      width: 150,
      render: (assignees: any[]) => {
        const list = assignees || [];
        if (list.length === 0) return '-';
        return (
          <Tooltip title={list.map((user) => user?.name).filter(Boolean).join('、')}>
            <Space size={2} wrap>
              {list.map((user) => (
                <WAvatar key={user.id} id={user.id} name={user.name} src={user.avatar} size={22} showName={false} />
              ))}
            </Space>
          </Tooltip>
        );
      },
    },
    { title: t('admin.table.initiatorDept'), dataIndex: 'deptName', key: 'deptName', width: 120, ellipsis: true },
    { title: t('admin.table.taskArrivalTime'), dataIndex: 'createTime', key: 'createTime', width: 170 },
    {
      title: t('admin.table.action'),
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openPreview(record)}>
             {t('admin.table.detail')}
          </Button>
          <Button type="link" size="small" icon={<SolutionOutlined />} onClick={() => openPreview(record, true)}>
             {t('admin.table.intervene')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'instance',
            label: t('admin.instanceManager.tabInstance'),
            children: (
              <div>
                <SearchTools
                  value={instParams}
                  onChange={handleInstChange}
                  onSearch={handleInstSearch}
                  showStatus
                  startDesc={t('admin.instanceManager.startProcessDesc')}
                />
                <Table
                  style={{ marginTop: 10 }}
                  rowKey="instId"
                  loading={instLoading}
                  dataSource={instRecords}
                  columns={instColumns}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: instPageNo,
                    pageSize: instPageSize,
                    total: instTotal,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    showTotal: (value) => t('admin.common.totalInstances').replace('{total}', String(value)),
                    onChange: (page, size) => {
                      setInstPageNo(page);
                      setInstPageSize(size);
                    },
                  }}
                />
              </div>
            ),
          },
          {
            key: 'task',
            label: t('admin.instanceManager.tabTask'),
            children: (
              <div>
                <SearchTools
                  value={taskParams}
                  onChange={handleTaskChange}
                  onSearch={handleTaskSearch}
                  showStatus
                  startDesc={t('admin.instanceManager.taskArrivalDesc')}
                />
                <Table
                  style={{ marginTop: 10 }}
                  rowKey={(record: any) => record.taskId || record.instId}
                  loading={taskLoading}
                  dataSource={taskRecords}
                  columns={taskColumns}
                  scroll={{ x: 'max-content' }}
                  pagination={{
                    current: taskPageNo,
                    pageSize: taskPageSize,
                    total: taskTotal,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    showTotal: (value) => t('admin.common.totalTasks').replace('{total}', String(value)),
                    onChange: (page, size) => {
                      setTaskPageNo(page);
                      setTaskPageSize(size);
                    },
                  }}
                />
              </div>
            ),
          },
        ]}
      />

      <ProcessInstPreview
        open={previewOpen}
        instId={preview.instId}
        taskId={preview.taskId}
        nodeId={preview.nodeId}
        adminMode
        onClose={() => setPreviewOpen(false)}
        onSuccess={refreshAll}
      />
    </div>
  );
};

export default InstanceManager;
