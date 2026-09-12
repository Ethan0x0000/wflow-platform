import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Row, Col, Statistic, Typography, Space, Spin, Tag, Empty } from 'antd';
import {
  CheckSquareOutlined,
  SendOutlined,
  ShareAltOutlined,
  RightOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined,
  MoneyCollectOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  FormOutlined,
  TeamOutlined,
  BellOutlined,
  CarOutlined,
  DatabaseOutlined,
  ToolOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  HomeOutlined,
  SwapOutlined,
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons';
import { getInstCount } from '@/api/instance';
import { getProcModelByUser } from '@/api/model';
import { confirmNotify, getUnreadNotify, type NotificationItem } from '@/api/notify';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { ProcessInstPreview } from './subs/ProcessInstPreview';

interface AppLogo {
  bgc?: string;
  color?: string;
  name?: string;
  icon?: string;
}

const iconMatchers: Array<[RegExp, React.ReactNode]> = [
  [/calendar|date|schedule/, <CalendarOutlined />],
  [/file|document|description|article/, <FileTextOutlined />],
  [/user|person|account|profile/, <UserOutlined />],
  [/money|currency|coin|pay|finance/, <MoneyCollectOutlined />],
  [/cart|shop|order|trade/, <ShoppingCartOutlined />],
  [/cog|setting|gear|config/, <SettingOutlined />],
  [/edit|form|write|pen/, <FormOutlined />],
  [/team|group|people|users/, <TeamOutlined />],
  [/bell|notice|notification/, <BellOutlined />],
  [/car|vehicle|travel/, <CarOutlined />],
  [/data|database|storage/, <DatabaseOutlined />],
  [/tool|build|wrench/, <ToolOutlined />],
  [/mail|email|message/, <MailOutlined />],
  [/phone|mobile|call/, <PhoneOutlined />],
  [/check|done|approve/, <CheckCircleOutlined />],
  [/clock|time|history/, <ClockCircleOutlined />],
  [/bank|office|company/, <BankOutlined />],
  [/home|house/, <HomeOutlined />],
  [/swap|transfer|exchange/, <SwapOutlined />],
];

function parseLogo(raw: unknown): AppLogo {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as AppLogo;
  try {
    const parsed = JSON.parse(String(raw));
    return typeof parsed === 'object' && parsed ? (parsed as AppLogo) : {};
  } catch {
    return {};
  }
}

const AppIcon: React.FC<{ logo: AppLogo }> = ({ logo }) => {
  const iconName = `${logo.name || logo.icon || ''}`.toLowerCase();
  const matched = iconMatchers.find(([pattern]) => pattern.test(iconName));
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: logo.bgc || '#1677ff',
        color: logo.color || '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 20,
      }}
    >
      {matched ? matched[1] : <AppstoreOutlined />}
    </div>
  );
};

const levelMeta = (level: string) => {
  switch (level) {
    case 'SUCCESS':
      return { color: '#02b068', icon: <CheckCircleFilled style={{ color: '#02b068' }} /> };
    case 'WARNING':
      return { color: '#f78f5f', icon: <WarningFilled style={{ color: '#f78f5f' }} /> };
    case 'DANGER':
      return { color: '#f25643', icon: <CloseCircleFilled style={{ color: '#f25643' }} /> };
    default:
      return { color: '#8c8c8c', icon: <InfoCircleFilled style={{ color: '#8c8c8c' }} /> };
  }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ todo: 0, mySubmit: 0, ccMe: 0 });
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInstId, setPreviewInstId] = useState('');

  const loadCount = () => {
    getInstCount()
      .then((res) => {
        if (res.data) setCounts(res.data);
      })
      .catch(() => undefined);
  };

  const loadNotifications = () => {
    getUnreadNotify({ pageNo: 1, pageSize: 10 })
      .then((res) => setNotifications(res.data?.records || []))
      .catch(() => undefined);
  };

  useEffect(() => {
    loadCount();
    loadNotifications();
    setLoading(true);
    getProcModelByUser()
      .then((res) => {
        if (Array.isArray(res.data)) {
          setGroups(
            res.data
              .filter((group: any) => group.items && group.items.length > 0)
              .map((group: any) => ({
                ...group,
                items: group.items.map((app: any) => ({ ...app, logo: parseLogo(app.logo) })),
              }))
          );
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const openNote = async (note: NotificationItem) => {
    try {
      await confirmNotify([note.id]);
    } catch {
      /* keep the note visible if marking read fails */
    }
    setNotifications((prev) => prev.filter((item) => item.id !== note.id));
    if (note.instId) {
      setPreviewInstId(note.instId);
      setPreviewOpen(true);
    }
  };

  const scrollToGroup = (groupId: string) => {
    document.getElementById(`g${groupId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ padding: 8 }}>
      <Row gutter={16}>
        <Col span={18}>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card
                hoverable
                style={{ borderRadius: 10, background: '#e6f4ff', borderColor: '#91caff' }}
                onClick={() => navigate('/workspace/todo')}
              >
                <Statistic
                  title={<Typography.Text strong style={{ color: '#0958d9' }}>{t('workspace.dashboard.todo')}</Typography.Text>}
                  value={counts.todo}
                  prefix={<CheckSquareOutlined style={{ color: '#1677ff' }} />}
                  valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                style={{ borderRadius: 10, background: '#f6ffed', borderColor: '#b7eb8f' }}
                onClick={() => navigate('/workspace/submitted')}
              >
                <Statistic
                  title={<Typography.Text strong style={{ color: '#389e0d' }}>{t('workspace.dashboard.submitted')}</Typography.Text>}
                  value={counts.mySubmit}
                  prefix={<SendOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                style={{ borderRadius: 10, background: '#f9f0ff', borderColor: '#d3adf7' }}
                onClick={() => navigate('/workspace/cc')}
              >
                <Statistic
                  title={<Typography.Text strong style={{ color: '#531dab' }}>{t('workspace.dashboard.ccMe')}</Typography.Text>}
                  value={counts.ccMe}
                  prefix={<ShareAltOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            {t('workspace.dashboard.quickStart')}
          </Typography.Title>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin tip={t('workspace.dashboard.loadingApps')} />
            </div>
          ) : groups.length === 0 ? (
            <Empty description={t('workspace.dashboard.noApps')} />
          ) : (
            <Row gutter={12}>
              <Col span={4}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      type="text"
                      block
                      style={{ textAlign: 'left', paddingLeft: 8 }}
                      onClick={() => scrollToGroup(String(group.id))}
                    >
                      {group.name}
                    </Button>
                  ))}
                </Space>
              </Col>
              <Col span={20}>
                <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: 8 }}>
                  {groups.map((group) => (
                    <div key={group.id} id={`g${group.id}`} style={{ marginBottom: 24, scrollMarginTop: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                        {group.name}
                      </div>
                      <Row gutter={[16, 16]}>
                        {group.items.map((app: any) => (
                          <Col span={6} key={app.code}>
                            <Card
                              hoverable
                              size="small"
                              style={{ borderRadius: 8, cursor: 'pointer' }}
                              onClick={() => navigate(`/workspace/startProc?code=${app.code}`)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                                <AppIcon logo={app.logo || {}} />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                  <Typography.Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                                    {app.procName || app.name}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                                    {app.remark || t('workspace.dashboard.clickToStart')}
                                  </Typography.Text>
                                </div>
                                <RightOutlined style={{ color: '#ccc', fontSize: 12 }} />
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          )}
        </Col>

        <Col span={6}>
          <Card
            title={t('workspace.dashboard.activity')}
            size="small"
            style={{ borderRadius: 10 }}
            extra={
              <Typography.Text type="secondary">
                {formatMessage(t('workspace.dashboard.unreadCount'), { count: notifications.length })}
              </Typography.Text>
            }
          >
            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('workspace.dashboard.noActivity')} />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {notifications.map((note) => {
                    const meta = levelMeta(note.level);
                    return (
                      <div
                        key={note.id}
                        onClick={() => void openNote(note)}
                        style={{
                          display: 'flex',
                          gap: 8,
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: '#fafafa',
                        }}
                      >
                        <div style={{ marginTop: 2 }}>{meta.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                            {note.title}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            ellipsis
                            style={{ display: 'block', fontSize: 12 }}
                          >
                            {note.content}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {note.createTime?.substring(5, 16)}
                          </Typography.Text>
                        </div>
                        {note.instId && <Tag color="blue">{t('workspace.table.process')}</Tag>}
                      </div>
                    );
                  })}
                </Space>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <ProcessInstPreview
        open={previewOpen}
        instId={previewInstId}
        onClose={() => setPreviewOpen(false)}
        onSuccess={() => {
          loadCount();
          loadNotifications();
        }}
      />
    </div>
  );
};

export default Dashboard;
