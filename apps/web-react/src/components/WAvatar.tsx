import React, { useState } from 'react';
import { Avatar, Popover, Tag, Typography, Spin, Space } from 'antd';
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  CloseCircleOutlined,
  ClockCircleFilled,
  ExclamationCircleFilled,
  MessageOutlined,
  QuestionCircleFilled,
  RollbackOutlined,
  SendOutlined,
  UserOutlined,
  UserSwitchOutlined,
  WarningFilled,
  CloseOutlined,
} from '@ant-design/icons';
import { getUserDetail } from '@/api/org';
import { useTranslation } from '@/i18n';

interface WAvatarProps {
  id?: string | number;
  name?: string;
  src?: string;
  size?: number;
  agent?: boolean;
  showY?: boolean;
  closeable?: boolean;
  status?: string;
  showStatus?: boolean;
  showName?: boolean;
  onClose?: () => void;
}

export const WAvatar: React.FC<WAvatarProps> = ({
  id,
  name = '',
  src,
  size = 36,
  agent = false,
  showY = false,
  closeable = false,
  status,
  showStatus = false,
  showName = true,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const { t } = useTranslation();

  const displayName = name.length > 2 ? name.slice(-2) : name;
  const statusVisible = showStatus || agent;

  const loadDetail = () => {
    if (!id || detail) return;
    setLoading(true);
    getUserDetail(String(id))
      .then((res) => {
        setDetail(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const getStatusIcon = () => {
    if (!statusVisible) return null;
    switch (agent ? 'agent' : status) {
      case 'agree':
      case 'pass':
      case 'PASS':
        return <CheckCircleFilled style={{ color: '#52c41a' }} />;
      case 'complete':
      case 'startup':
        return <CheckOutlined style={{ color: '#52c41a' }} />;
      case 'reject':
      case 'refuse':
      case 'REFUSE':
        return <CloseCircleFilled style={{ color: '#ff4d4f' }} />;
      case 'fallback':
        return <ExclamationCircleFilled style={{ color: '#faad14' }} />;
      case 'comment':
        return <MessageOutlined style={{ color: '#1677ff' }} />;
      case 'cc':
        return <SendOutlined style={{ color: '#1677ff' }} />;
      case 'cancel':
        return <CloseCircleOutlined style={{ color: '#8c8c8c' }} />;
      case 'revoke':
        return <RollbackOutlined style={{ color: '#8c8c8c' }} />;
      case 'agent':
        return <UserSwitchOutlined style={{ color: '#faad14' }} />;
      case 'revise':
        return <WarningFilled style={{ color: '#ff4d4f' }} />;
      case 'candidate':
        return <QuestionCircleFilled style={{ color: '#faad14' }} />;
      default:
        return <ClockCircleFilled style={{ color: '#1677ff' }} />;
    }
  };

  const content = (
    <div style={{ width: 220, padding: 4 }}>
      {loading ? (
        <Spin size="small" />
      ) : (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Space>
            <Avatar size={36} src={src} icon={!src && !name ? <UserOutlined /> : undefined} style={{ backgroundColor: src ? 'transparent' : '#1677ff' }}>
              {displayName}
            </Avatar>
            <div>
              <Typography.Text strong>{name}</Typography.Text>
              {detail?.status && (
                <Tag color="success" style={{ marginLeft: 6 }}>
                  {detail.status}
                </Tag>
              )}
            </div>
          </Space>
          {detail?.deptName && <div>{t('workspace.avatar.dept')}: {detail.deptName}</div>}
          {detail?.mobile && <div>{t('workspace.avatar.mobile')}: {detail.mobile}</div>}
          {detail?.email && <div>{t('workspace.avatar.email')}: {detail.email}</div>}
        </Space>
      )}
    </div>
  );

  const avatarNode = (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: showY ? 'column' : 'row',
        alignItems: 'center',
        position: 'relative',
        cursor: id ? 'pointer' : 'default',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size, display: 'flex' }}>
        <Avatar
          size={size}
          src={src}
          icon={!src && !name ? <UserOutlined /> : undefined}
          style={{ backgroundColor: src ? 'transparent' : '#1677ff', fontSize: size * 0.4 }}
        >
          {displayName}
        </Avatar>
        {statusVisible && (
          <div
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              background: '#fff',
              borderRadius: '50%',
              lineHeight: 1,
              fontSize: Math.max(12, Math.round(size * 0.4)),
              display: 'flex',
            }}
          >
            {getStatusIcon()}
          </div>
        )}
        {closeable && (
          <CloseOutlined
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            style={{
              position: 'absolute',
              right: -4,
              top: -4,
              background: '#fff',
              borderRadius: '50%',
              fontSize: 12,
              cursor: 'pointer',
            }}
          />
        )}
      </div>
      {showName && (
        <Typography.Text
          ellipsis
          style={{
            marginLeft: showY ? 0 : 8,
            marginTop: showY ? 4 : 0,
            maxWidth: 100,
            fontSize: size > 32 ? 14 : 12,
          }}
        >
          {name}
        </Typography.Text>
      )}
    </div>
  );

  if (!id) return avatarNode;

  return (
    <Popover content={content} trigger="click" onOpenChange={(next) => next && loadDetail()}>
      {avatarNode}
    </Popover>
  );
};

export default WAvatar;
