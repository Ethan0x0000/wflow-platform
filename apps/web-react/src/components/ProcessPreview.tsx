import React, { useEffect, useState } from 'react';
import { Button, Space, Spin, Tag, Typography, message } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { getInstProcess } from '@/api/instance';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface ProcessPreviewProps {
  instId: string;
}

interface NodeRecord {
  count: number;
  result: string | null;
  endTime: string | null;
}

const nodeTypeLabelKeys: Record<string, string> = {
  Start: 'workspace.preview.start',
  Approval: 'workspace.preview.approval',
  Task: 'workspace.preview.task',
  Cc: 'workspace.preview.cc',
  Gateway: 'workspace.preview.gateway',
  Exclusive: 'workspace.preview.exclusive',
  Inclusive: 'workspace.preview.inclusive',
  Parallel: 'workspace.preview.parallel',
  Router: 'workspace.preview.router',
  Trigger: 'workspace.preview.trigger',
  Waiting: 'workspace.preview.waiting',
  Subproc: 'workspace.preview.subproc',
  Join: 'workspace.preview.join',
};

type Translator = (key: string, fallback?: string) => string;

function getStatus(record: NodeRecord | undefined, t: Translator): { color: string; label: string; count: number } {
  if (!record) return { color: '#d9d9d9', label: t('workspace.preview.statusPending'), count: 0 };
  const count = Number(record.count ?? 0);
  switch (record.result) {
    case 'pass':
    case 'agree':
    case 'complete':
    case 'startup':
      return { color: '#52c41a', label: t('workspace.preview.statusPassed'), count };
    case 'reject':
      return { color: '#ff4d4f', label: t('workspace.preview.statusRefused'), count };
    case 'cancel':
      return { color: '#8c8c8c', label: t('workspace.preview.statusCancelled'), count };
    case 'fallback':
    case 'revoke':
      return { color: '#faad14', label: t('workspace.preview.statusReturned'), count };
    default:
      return record.endTime
        ? { color: '#52c41a', label: t('workspace.preview.statusPassed'), count }
        : { color: '#1677ff', label: t('workspace.preview.statusRunning'), count };
  }
}

export const ProcessPreview: React.FC<ProcessPreviewProps> = ({ instId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
  const [nodeRecords, setNodeRecords] = useState<Record<string, NodeRecord>>({});
  const [instStatusName, setInstStatusName] = useState('');
  const [scale, setScale] = useState(100);

  useEffect(() => {
    if (!instId) return;
    setLoading(true);
    getInstProcess(instId)
      .then((res) => {
        const data = res.data || {};
        let parsed = data.process;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch {
            parsed = [];
          }
        }
        if (!Array.isArray(parsed)) parsed = parsed ? [parsed] : [];
        setNodes(parsed);
        setNodeRecords(data.nodeRecords || {});
        setInstStatusName(data.instStatusName || '');
      })
      .catch((err: any) => {
        message.error(err?.msg || t('workspace.preview.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [instId]);

  const connector = (key: string) => <div key={key} style={{ width: 2, height: 18, background: '#d9d9d9' }} />;

  const renderNode = (node: any, key: string) => {
    const status = getStatus(nodeRecords[node.id], t);
    return (
      <div
        key={key}
        style={{
          minWidth: 170,
          maxWidth: 240,
          padding: '6px 12px',
          border: `2px solid ${status.color}`,
          borderRadius: 8,
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, color: '#999' }}>
          {nodeTypeLabelKeys[node.type] ? t(nodeTypeLabelKeys[node.type]) : node.type}
        </div>
        <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>
          {node.name || node.nodeName || t('workspace.preview.unnamed')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
          <Tag color={status.color} style={{ marginInlineEnd: 0 }}>
            {status.label}
          </Tag>
          {status.count + 1 > 1 && (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              {formatMessage(t('workspace.table.timesCount'), { count: status.count + 1 })}
            </Tag>
          )}
        </div>
      </div>
    );
  };

  const renderChain = (chain: any[], parentKey: string): React.ReactNode => {
    if (!Array.isArray(chain) || chain.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {chain.map((node, index) => {
          const key = `${parentKey}-${node.id || index}`;
          let element: React.ReactNode;
          if (node.type === 'Gateway') {
            const metadata: any[] = Array.isArray(node.props?.branch) ? node.props.branch : [];
            const bodies: any[][] = Array.isArray(node.branch) ? node.branch : [];
            element = (
              <>
                {renderNode(node, `${key}-gateway`)}
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 8 }}>
                  {bodies.map((body, branchIndex) => (
                    <div key={`${key}-branch-${branchIndex}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Tag color="cyan">{metadata[branchIndex]?.name || formatMessage(t('workspace.preview.branch'), { index: branchIndex + 1 })}</Tag>
                      <div style={{ width: 2, height: 12, background: '#d9d9d9' }} />
                      {renderChain(body, `${key}-branch-${branchIndex}`)}
                    </div>
                  ))}
                </div>
              </>
            );
          } else if (node.type === 'Join') {
            element = (
              <div
                style={{
                  width: 26,
                  height: 26,
                  transform: 'rotate(45deg)',
                  background: getStatus(nodeRecords[node.id], t).color,
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 1px #d9d9d9',
                }}
                title={node.name || t('workspace.preview.join')}
              />
            );
          } else {
            element = (
              <>
                {renderNode(node, `${key}-node`)}
                {node.children && renderChain(Array.isArray(node.children) ? node.children : [node.children], `${key}-children`)}
              </>
            );
          }
          return (
            <React.Fragment key={key}>
              {index > 0 && connector(`${key}-line-before`)}
              {element}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin tip={t('workspace.preview.loading')} />
      </div>
    );
  }

  const legend = [
    { color: '#1677ff', label: t('workspace.preview.statusRunning') },
    { color: '#52c41a', label: t('workspace.preview.statusPassed') },
    { color: '#ff4d4f', label: t('workspace.preview.statusRefused') },
    { color: '#8c8c8c', label: t('workspace.preview.statusCancelled') },
    { color: '#d9d9d9', label: t('workspace.preview.statusPending') },
  ];

  return (
    <div style={{ position: 'relative', minHeight: 400, padding: 16, background: '#f5f7fa', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Space size={12} wrap>
          <Typography.Text strong>{instStatusName || t('workspace.preview.runningTitle')}</Typography.Text>
          {legend.map((item) => (
            <Space key={item.label} size={4}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: item.color }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {item.label}
              </Typography.Text>
            </Space>
          ))}
        </Space>
        <Space size={4}>
          <Button size="small" icon={<MinusOutlined />} onClick={() => setScale((prev) => Math.max(50, prev - 5))} />
          <Typography.Text style={{ minWidth: 42, textAlign: 'center' }}>{scale}%</Typography.Text>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setScale((prev) => Math.min(200, prev + 5))} />
        </Space>
      </div>
      <div style={{ overflow: 'auto', paddingBottom: 60 }}>
        <div
          style={{
            transform: `scale(${scale / 100})`,
            transformOrigin: 'top center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'transform 0.2s',
          }}
        >
          {nodes.length > 0 ? (
            <>
              {renderChain(nodes, 'process')}
              {connector('end-line')}
              <div style={{ padding: '6px 14px', borderRadius: 5, background: '#e6e6e6' }}>
                {instStatusName || t('workspace.preview.finished')}
              </div>
            </>
          ) : (
            <Typography.Text type="secondary">{t('workspace.preview.empty')}</Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessPreview;
