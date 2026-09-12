import React, { useEffect, useMemo, useState } from 'react';
import { Button, Image, Popover, Space, Spin, Tag, Timeline, Typography, message } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  LinkOutlined,
  LoadingOutlined,
  RollbackOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getInstRecords } from '@/api/instance';
import { getCandidates } from '@/api/task';
import { useTranslation } from '@/i18n';
import { WAvatar } from './WAvatar';
import { getStatusText } from '@/utils/ProcessUtil';
import { formatMessage } from '@/utils/i18n';
import { downloadResUrl, resUrl } from '@/utils/resource';
import type { OrgUser } from '@/types/workflow';
import type { ResFile } from './WResUpload';

export interface ProcessInstRecordProps {
  instId: string;
  isAgent?: boolean;
  initiator?: OrgUser;
  status?: string;
  statusName?: string;
  onOpenChild?: (instId: string) => void;
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function isEmptyComment(comment: any): boolean {
  return !comment || (isEmpty(comment.text) && (comment.files || []).length === 0 && (comment.images || []).length === 0);
}

function formatSize(size?: number): string {
  if (size === undefined || size === null) return '';
  if (size > 1048576) return `${(size / 1048576).toFixed(1)}MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${size}B`;
}

function formatTime(value?: string | null): string {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
}

const typeLabelKeys: Record<string, string> = {
  Start: 'workspace.record.start',
  Approval: 'workspace.record.approval',
  Task: 'workspace.record.task',
  Cc: 'workspace.record.cc',
  Subproc: 'workspace.record.subproc',
  Gateway: 'workspace.record.gateway',
  Exclusive: 'workspace.record.exclusive',
  Inclusive: 'workspace.record.inclusive',
  Parallel: 'workspace.record.parallel',
  Other: 'workspace.record.other',
};

const typeColors: Record<string, string> = {
  Start: 'green',
  Approval: 'orange',
  Task: 'blue',
  Cc: 'purple',
  Subproc: 'cyan',
  Gateway: 'gold',
  Exclusive: 'gold',
  Inclusive: 'gold',
  Parallel: 'geekblue',
  Other: 'default',
};

type Translator = (key: string, fallback?: string) => string;

function getTaskMode(mode: any, t: Translator): string {
  if (!mode) return '';
  switch (mode.type) {
    case 'AND':
      return t('workspace.record.modeAnd');
    case 'OR':
      return t('workspace.record.modeOr');
    case 'NEXT':
      return t('workspace.record.modeNext');
    case 'CUSTOM':
      return formatMessage(t('workspace.record.modeCustom'), { percentage: mode.percentage });
    default:
      return '';
  }
}

function getReasonDesc(node: any, t: Translator): string {
  switch (node.reason) {
    case 'SKIP_EMPTY':
      return t('workspace.record.skipEmpty');
    case 'SKIP_DISTINCT':
      return t('workspace.record.skipDistinct');
    default:
      return '';
  }
}

function getNodeColor(node: any): string {
  if (!node.endTime) return 'blue';
  if (node.modeType === 'AUTO_REFUSE') return 'red';
  if (node.reason === 'SKIP_EMPTY' || node.reason === 'SKIP_DISTINCT') return 'gray';
  const results = (node.actualUsers || []).map((item: any) => item.result || item.action);
  if (results.some((result: string) => result === 'reject' || result === 'refuse' || result === 'REFUSE')) return 'red';
  if (results.length > 0 && results.every((result: string) => result === 'cancel')) return 'gray';
  return 'green';
}

const statusMetaKeys: Record<string, { key: string; color: string }> = {
  RUNNING: { key: 'workspace.status.running', color: 'blue' },
  SUSPEND: { key: 'workspace.status.suspended', color: 'orange' },
  PASS: { key: 'workspace.status.passed', color: 'green' },
  REFUSE: { key: 'workspace.status.refused', color: 'red' },
  REVOKED: { key: 'workspace.status.revoked', color: 'gray' },
  EXCEPTION: { key: 'workspace.status.exception', color: 'red' },
};

function transformRecords(list: any[], t: Translator): any[] {
  return list.map((node) => {
    const actualUsers: any[] = Array.isArray(node.actualUsers) ? [...node.actualUsers] : [];
    actualUsers.forEach((item) => {
      item.result = node.endTime && !item.result ? 'cancel' : item.result;
    });
    const recordItems = (Array.isArray(node.recordItems) ? [...node.recordItems] : []).sort(
      (left: any, right: any) => Date.parse(left.endTime || 0) - Date.parse(right.endTime || 0)
    );
    recordItems.forEach((item) => {
      item.comment = { text: '', images: [], files: [], ...(item.comment || {}) };
      item.comment.imageList = (item.comment.images || []).map((img: any) => resUrl(img.url));
    });
    if (actualUsers.length === 0) {
      if (node.nodeType === 'Other' && recordItems[0]) {
        const actu = recordItems[0];
        actualUsers.push({
          assignee: actu.assignee || actu.source,
          result: actu.result,
          endTime: actu.endTime,
        });
      } else if (node.modeType && node.modeType !== 'USER') {
        actualUsers.push({
          assignee: { id: '', name: t('workspace.record.systemAuto'), avatar: '' },
          result: node.modeType === 'AUTO_PASS' ? 'pass' : 'refuse',
          endTime: node.endTime,
        });
      }
    }
    return { ...node, actualUsers, recordItems };
  });
}

export const ProcessInstRecord: React.FC<ProcessInstRecordProps> = ({
  instId,
  isAgent = false,
  initiator,
  status,
  statusName,
  onOpenChild,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [candidateState, setCandidateState] = useState<{ key: string; list: any[]; loading: boolean }>({
    key: '',
    list: [],
    loading: false,
  });

  useEffect(() => {
    if (!instId) return;
    setLoading(true);
    getInstRecords(instId)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRecords(transformRecords(list, t));
      })
      .catch((err: any) => {
        message.error(err?.msg || t('workspace.record.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [instId]);

  const loadCandidates = (user: any) => {
    if (!user?.taskId) return;
    const key = user.taskId;
    setCandidateState({ key, list: [], loading: true });
    getCandidates(user.taskId)
      .then((res) => {
        setCandidateState({ key, list: Array.isArray(res.data) ? res.data : [], loading: false });
      })
      .catch((err: any) => {
        message.error(err?.msg || t('workspace.record.candidatesFailed'));
        setCandidateState({ key, list: [], loading: false });
      });
  };

  const getStatus = (node: any): string => {
    const users: any[] = node.actualUsers || [];
    if (users.length === 1) {
      const item = users[0];
      const name = item.assignee?.name || t('workspace.record.unclaimed');
      const statusText = getStatusText(item, isAgent, initiator?.name || '');
      switch (node.nodeType) {
        case 'Start':
          if (node.endTime && item.action === 'complete') {
            return `${name} (${t('workspace.statusText.submitted')})`;
          }
          return `${name} (${statusText})`;
        case 'Task':
        case 'Approval':
        case 'Other':
          return `${name} (${statusText})`;
        case 'Cc':
          return formatMessage(t('workspace.record.ccTo'), { name });
        default:
          break;
      }
    } else {
      const userNum = users.length;
      switch (node.nodeType) {
        case 'Task':
          return formatMessage(t('workspace.record.nHandlers'), { count: userNum });
        case 'Approval':
          if (node.modeType === 'AUTO_PASS') return t('workspace.record.autoPass');
          if (node.modeType === 'AUTO_REFUSE') return t('workspace.record.autoRefuse');
          return userNum > 0
            ? formatMessage(t('workspace.record.nApprovers'), { count: userNum })
            : getReasonDesc(node, t);
        case 'Cc':
          return formatMessage(t('workspace.record.ccCount'), { count: userNum });
        default:
          break;
      }
    }
    return '';
  };

  const getTimeDesc = (node: any): string => {
    switch (node.nodeType) {
      case 'Task':
      case 'Approval':
      case 'Cc':
        return node.actualUsers.length > 0
          ? formatTime(node.endTime) || t('workspace.record.processing')
          : formatTime(node.startTime);
      case 'Subproc':
        return formatTime(node.endTime) || t('workspace.record.running');
      default:
        return formatTime(node.endTime);
    }
  };

  const renderComment = (comment: any) => {
    if (isEmptyComment(comment)) return null;
    const commentImages: ResFile[] = comment.images || [];
    const commentFiles: ResFile[] = comment.files || [];
    return (
      <div style={{ marginTop: 4, padding: '6px 8px', background: '#fafafa', borderRadius: 6 }}>
        {comment.text && <div style={{ fontSize: 13 }}>{comment.text}</div>}
        {commentImages.length > 0 && (
          <Image.PreviewGroup>
            <Space wrap size={4} style={{ marginTop: 4 }}>
              {commentImages.map((img: any, index: number) => (
                <Image
                  key={img.id || index}
                  src={resUrl(img.url, { zip: 'true' })}
                  preview={{ src: resUrl(img.url) }}
                  width={80}
                  height={60}
                  style={{ objectFit: 'cover', borderRadius: 5 }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        )}
        {commentFiles.length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
            {commentFiles.map((file: any, index: number) => (
              <a
                key={file.id || index}
                href={downloadResUrl(file.url, file.name)}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, textDecoration: 'underline' }}
              >
                {file.name}
                {formatSize(file.size) && <Tag style={{ marginLeft: 4 }}>{formatSize(file.size)}</Tag>}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderActualUser = (user: any, index: number) => {
    const assignee: OrgUser = user.assignee || {};
    const unclaimed = assignee.id === '';
    return (
      <div key={`${assignee.id || 'user'}-${index}`} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <WAvatar
          id={assignee.id || undefined}
          name={unclaimed ? t('workspace.record.unclaimed') : assignee.name}
          src={assignee.avatar}
          status={user.result || user.action}
          size={32}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Typography.Text style={{ fontSize: 13 }}>
              {unclaimed ? t('workspace.record.unclaimed') : assignee.name}
            </Typography.Text>
            <Tag color={user.result === 'reject' || user.result === 'refuse' ? 'red' : user.result === 'cancel' ? 'default' : 'blue'}>
              {getStatusText(user, isAgent, initiator?.name || '')}
            </Tag>
            {user.result === 'candidate' && (
              <Popover
                trigger="click"
                placement="bottom"
                onOpenChange={(open) => {
                  if (open) loadCandidates(user);
                }}
                content={
                  <div style={{ maxWidth: 260, maxHeight: 220, overflowY: 'auto' }}>
                    {candidateState.loading ? (
                      <Spin size="small" />
                    ) : candidateState.key === user.taskId && candidateState.list.length > 0 ? (
                      <Space wrap size={6}>
                        {candidateState.list.map((candidate: OrgUser) => (
                          <WAvatar
                            key={candidate.id}
                            id={candidate.id}
                            name={candidate.name}
                            src={candidate.avatar}
                            size={32}
                          />
                        ))}
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">{t('workspace.record.noCandidates')}</Typography.Text>
                    )}
                  </div>
                }
              >
                <Button type="link" size="small">
                  {t('workspace.record.viewCandidates')}
                </Button>
              </Popover>
            )}
            {(user.endTime || user.createTime) && (
              <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
                {formatTime(user.endTime || user.createTime)}
              </Typography.Text>
            )}
          </div>
          {renderComment(user.comment)}
        </div>
        {!isEmpty(user.signature) && (
          <img src={resUrl(user.signature)} alt="signature" style={{ width: 80, marginLeft: 8 }} />
        )}
      </div>
    );
  };

  const renderRecordItem = (item: any, index: number) => {
    const showHeader =
      (item.assignee || item.source) && (item.operator || item.target || item.result);
    return (
      <div key={`item-${index}`} style={{ marginTop: 6 }}>
        {showHeader && (
          <Space size={4} wrap style={{ fontSize: 12 }}>
            <Tag>{item.assignee?.name || item.source?.name}</Tag>
            {item.operator && (
              <>
                <Tag color="orange">{item.operator.name}</Tag>
                <Typography.Text type="warning" style={{ fontSize: 12 }}>
                  {t('workspace.record.intervene')}
                </Typography.Text>
              </>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {getStatusText(item)}
            </Typography.Text>
            {item.target && <Tag>{item.target.name}</Tag>}
            {!isEmpty(item.signature) && <img src={resUrl(item.signature)} alt="signature" style={{ width: 60 }} />}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatTime(item.endTime)}
            </Typography.Text>
          </Space>
        )}
        {renderComment(item.comment)}
      </div>
    );
  };

  const items = useMemo(() => {
    const result: any[] = records.map((node, index) => {
      const content = node.content || {};
      const subInitiator =
        content.initiator && typeof content.initiator === 'object'
          ? content.initiator.name
          : node.actualUsers[0]?.assignee?.name || content.initiator || '';
      const dot = !node.endTime ? (
        <ClockCircleFilled style={{ color: '#1677ff' }} />
      ) : node.nodeType === 'Start' ? (
        <SendOutlined style={{ color: '#52c41a' }} />
      ) : node.modeType === 'AUTO_REFUSE' || getNodeColor(node) === 'red' ? (
        <CloseCircleFilled style={{ color: '#ff4d4f' }} />
      ) : getNodeColor(node) === 'gray' ? (
        <RollbackOutlined style={{ color: '#8c8c8c' }} />
      ) : (
        <CheckCircleFilled style={{ color: '#52c41a' }} />
      );
      const count = Number(node.count ?? 1);
      return {
        key: node.id || node.nodeId || index,
        color: getNodeColor(node),
        dot,
        children: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Typography.Text strong>{node.nodeName}</Typography.Text>
              <Tag color={typeColors[node.nodeType] || 'default'}>
                {typeLabelKeys[node.nodeType] ? t(typeLabelKeys[node.nodeType]) : node.nodeType}
              </Tag>
              {count > 1 && (
                <Tag color="blue">{formatMessage(t('workspace.table.timesCount'), { count })}</Tag>
              )}
            </div>
            {node.nodeType === 'Subproc' ? (
              <div style={{ fontSize: 13, marginTop: 2 }}>
                {formatMessage(t('workspace.record.subprocStart'), { name: subInitiator })} [
                <a onClick={() => content.subInstId && onOpenChild?.(content.subInstId)}>
                  <LinkOutlined /> {content.name}
                </a>
                ]
              </div>
            ) : (
              <div style={{ fontSize: 14, marginTop: 2 }}>
                {getStatus(node)}
                {node.actualUsers.length > 1 && node.taskMode && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                    ({getTaskMode(node.taskMode, t)})
                  </Typography.Text>
                )}
              </div>
            )}
            {!!getReasonDesc(node, t) && (
              <Typography.Text type="warning" style={{ fontSize: 12 }}>
                {getReasonDesc(node, t)}
              </Typography.Text>
            )}
            {getTimeDesc(node) && (
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {getTimeDesc(node)}
              </Typography.Text>
            )}
            {node.actualUsers.map((user: any, userIndex: number) => renderActualUser(user, userIndex))}
            {node.recordItems.length > 0 && node.recordItems.map((item: any, itemIndex: number) => renderRecordItem(item, itemIndex))}
          </div>
        ),
      };
    });
    if (status || statusName) {
      const meta = statusMetaKeys[status || ''];
      const metaText = meta ? t(meta.key) : statusName || status || '';
      const metaColor = meta?.color || 'gray';
      result.push({
        key: '__status',
        color: metaColor,
        dot: status === 'RUNNING' ? <LoadingOutlined spin style={{ color: '#1677ff' }} /> : undefined,
        children: (
          <Typography.Text strong style={{ color: metaColor }}>
            {statusName || metaText}
          </Typography.Text>
        ),
      });
    }
    return result;
  }, [records, status, statusName, isAgent, initiator, candidateState, t]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip={t('workspace.record.loading')} />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <Timeline items={items} />
    </div>
  );
};

export default ProcessInstRecord;
