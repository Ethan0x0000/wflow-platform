import React, { useEffect, useRef, useState } from 'react';
import { Button, Spin, Tag, Timeline, Typography } from 'antd';
import { CloseCircleFilled, PlusOutlined } from '@ant-design/icons';
import { WAvatar } from './WAvatar';
import { WOrgPicker } from './WOrgPicker';
import { useTranslation } from '@/i18n';
import type { OrgTarget, OrgUser } from '@/types/workflow';

export interface ForecastNode {
  nodeId: string;
  nodeName: string;
  type: string;
  mode?: string;
  icon?: string;
  orgs?: OrgUser[];
  enableAddNum?: number;
  reason?: string;
}

export interface ProcessForecastProps {
  nodes?: ForecastNode[];
  process?: ForecastNode[];
  value?: Record<string, string[]>;
  onChange?: (processData: Record<string, string[]>) => void;
  loading?: boolean;
}

const typeLabelKeys: Record<string, string> = {
  Start: 'workspace.forecast.start',
  Approval: 'workspace.forecast.approval',
  Task: 'workspace.forecast.task',
  Cc: 'workspace.forecast.cc',
  Waiting: 'workspace.forecast.waiting',
};

const typeColors: Record<string, string> = {
  Start: 'green',
  Approval: 'orange',
  Task: 'blue',
  Cc: 'purple',
  Waiting: 'gold',
};

type Translator = (key: string, fallback?: string) => string;

function getAddTip(node: ForecastNode, t: Translator): string {
  switch (node.type) {
    case 'Approval':
      return t('workspace.forecast.addApprover');
    case 'Task':
      return t('workspace.forecast.addHandler');
    case 'Cc':
      return t('workspace.forecast.addCc');
    default:
      return t('workspace.forecast.addPerson');
  }
}

function getReasonDesc(node: ForecastNode, t: Translator): string {
  switch (node.reason) {
    case 'SKIP_EMPTY':
      return t('workspace.forecast.skipEmpty');
    case 'SKIP_DISTINCT':
      return t('workspace.forecast.skipDistinct');
    default:
      return t('workspace.forecast.systemAssigned');
  }
}

function buildOrgsMap(
  list: ForecastNode[],
  selected: Record<string, string[]>
): Record<string, OrgUser[]> {
  const next: Record<string, OrgUser[]> = {};
  for (const node of list) {
    const source = Array.isArray(node.orgs) ? node.orgs : [];
    const ids = selected[node.nodeId];
    if (ids) {
      const byId = new Map(source.map((user) => [user.id, user]));
      next[node.nodeId] = ids.map((id) => byId.get(id) || { id, name: id });
    } else {
      next[node.nodeId] = [...source];
    }
  }
  return next;
}

export const ProcessForecast: React.FC<ProcessForecastProps> = ({
  nodes,
  process,
  value,
  onChange,
  loading = false,
}) => {
  const { t } = useTranslation();
  const list = process ?? nodes ?? [];
  const [selectedIds, setSelectedIds] = useState<Record<string, string[]>>(value || {});
  const [orgsMap, setOrgsMap] = useState<Record<string, OrgUser[]>>(() => buildOrgsMap(list, value || {}));
  const [pickerNode, setPickerNode] = useState<ForecastNode | null>(null);
  const selectedRef = useRef<Record<string, string[]>>(selectedIds);
  selectedRef.current = selectedIds;

  useEffect(() => {
    setOrgsMap(buildOrgsMap(list, selectedRef.current));
  }, [JSON.stringify(list)]);

  useEffect(() => {
    if (value) setSelectedIds({ ...value });
  }, [JSON.stringify(value)]);

  const emit = (nodeId: string, users: OrgUser[]) => {
    const nextIds = { ...selectedRef.current, [nodeId]: users.map((user) => user.id) };
    setSelectedIds(nextIds);
    selectedRef.current = nextIds;
    onChange?.(nextIds);
  };

  const handlePick = (picked: OrgTarget[]) => {
    if (!pickerNode) return;
    const users: OrgUser[] = picked.map((user) => ({ id: user.id, name: user.name, avatar: user.avatar }));
    setOrgsMap((prev) => ({ ...prev, [pickerNode.nodeId]: users }));
    emit(pickerNode.nodeId, users);
    setPickerNode(null);
  };

  const removeUser = (node: ForecastNode, index: number) => {
    const users = [...(orgsMap[node.nodeId] || [])];
    users.splice(index, 1);
    setOrgsMap((prev) => ({ ...prev, [node.nodeId]: users }));
    emit(node.nodeId, users);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin tip={t('workspace.forecast.loading')} />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <Typography.Text type="secondary">{t('workspace.forecast.empty')}</Typography.Text>
    );
  }

  const items = list.map((node, index) => {
    const users = orgsMap[node.nodeId] || [];
    const enableAddNum = Number(node.enableAddNum || 0);
    const editable = enableAddNum > 0;
    const empty = users.length === 0;
    const skipped = empty && (node.reason === 'SKIP_EMPTY' || node.reason === 'SKIP_DISTINCT');

    let tip: React.ReactNode = null;
    if (empty) {
      if (editable) {
        tip = (
          <Typography.Text type="warning" style={{ fontSize: 12 }}>
            {getAddTip(node, t)}
          </Typography.Text>
        );
      } else if (node.mode === 'AUTO_PASS') {
        tip = (
          <Typography.Text type="success" style={{ fontSize: 12 }}>
            {t('workspace.forecast.autoPass')}
          </Typography.Text>
        );
      } else if (node.mode === 'AUTO_REFUSE') {
        tip = (
          <Typography.Text type="danger" style={{ fontSize: 12 }}>
            {t('workspace.forecast.autoRefuse')}
          </Typography.Text>
        );
      } else {
        tip = (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {skipped ? getReasonDesc(node, t) : t('workspace.forecast.systemAssigned')}
          </Typography.Text>
        );
      }
    }

    return {
      key: node.nodeId || index,
      color: skipped ? 'gray' : empty ? 'gray' : 'blue',
      children: (
        <div style={{ opacity: skipped ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Typography.Text strong>{node.nodeName}</Typography.Text>
            <Tag color={typeColors[node.type] || 'default'}>
              {typeLabelKeys[node.type] ? t(typeLabelKeys[node.type]) : node.type}
            </Tag>
            {node.mode === 'candidate' && <Tag color="cyan">{t('workspace.forecast.candidate')}</Tag>}
            {node.type === 'Cc' && <Tag color="purple">{t('workspace.forecast.ccTag')}</Tag>}
          </div>
          {tip && <div style={{ marginTop: 2 }}>{tip}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {users.map((user, userIndex) => (
              <span key={user.id || userIndex} style={{ position: 'relative', display: 'inline-flex' }}>
                <WAvatar id={user.id} name={user.name} src={user.avatar} size={32} />
                {editable && (
                  <CloseCircleFilled
                    onClick={() => removeUser(node, userIndex)}
                    style={{
                      position: 'absolute',
                      right: -6,
                      top: -6,
                      background: '#fff',
                      borderRadius: '50%',
                      color: '#ff4d4f',
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  />
                )}
              </span>
            ))}
            {editable && (
              <Button
                size="small"
                shape="circle"
                icon={<PlusOutlined />}
                title={getAddTip(node, t)}
                onClick={() => setPickerNode(node)}
              />
            )}
          </div>
        </div>
      ),
    };
  });

  return (
    <div>
      <Timeline items={items} />
      <WOrgPicker
        open={!!pickerNode}
        type="user"
        multiple={Number(pickerNode?.enableAddNum || 0) > 1}
        selected={
          pickerNode
            ? (orgsMap[pickerNode.nodeId] || []).map((user) => ({
                id: user.id,
                name: user.name,
                type: 'user' as const,
                avatar: user.avatar,
              }))
            : []
        }
        onOk={handlePick}
        onCancel={() => setPickerNode(null)}
      />
    </div>
  );
};

export default ProcessForecast;
