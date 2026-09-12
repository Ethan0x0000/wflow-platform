import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Space,
  Typography,
  Tag,
  message,
  Badge,
  Drawer,
  Button,
  Empty,
  Spin,
  Pagination,
  notification,
  Switch,
  Dropdown,
  theme,
} from 'antd';
import {
  DashboardOutlined,
  CheckSquareOutlined,
  CheckCircleOutlined,
  SendOutlined,
  ShareAltOutlined,
  UserSwitchOutlined,
  AppstoreOutlined,
  SettingOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SwapOutlined,
  BellOutlined,
  CheckOutlined,
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  InfoCircleFilled,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useWflowStore } from '@/stores/wflow';
import { useTranslation, langOptions } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { login } from '@/api/auth';
import {
  confirmNotify,
  getUnreadNotify,
  subscribeNotify,
  type NotificationItem,
} from '@/api/notify';
import { WAvatar } from '@/components/WAvatar';
import { WUserSwitcher } from '@/components/WUserSwitcher';
import { ProcessInstPreview } from '@/views/workspace/subs/ProcessInstPreview';

const { Header, Sider, Content } = Layout;

const notifyLevelIcon = (level: string) => {
  switch (level) {
    case 'SUCCESS':
      return <CheckCircleFilled style={{ color: '#02b068' }} />;
    case 'WARNING':
      return <WarningFilled style={{ color: '#f78f5f' }} />;
    case 'DANGER':
      return <CloseCircleFilled style={{ color: '#f25643' }} />;
    default:
      return <InfoCircleFilled style={{ color: '#8c8c8c' }} />;
  }
};

export const MenuFrame: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, setLoginUser } = useWflowStore();
  const { token } = theme.useToken();
  const { t, lang, setLang } = useTranslation();
  const mode = useWflowStore((state) => state.theme);
  const setTheme = useWflowStore((state) => state.setTheme);
  const [collapsed, setCollapsed] = useState(false);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyRecords, setNotifyRecords] = useState<NotificationItem[]>([]);
  const [notifyTotal, setNotifyTotal] = useState(0);
  const [notifyPage, setNotifyPage] = useState(1);
  const [notifyPageSize, setNotifyPageSize] = useState(10);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInstId, setPreviewInstId] = useState('');

  const loadNotify = useCallback(async () => {
    setNotifyLoading(true);
    try {
      const res = await getUnreadNotify({ pageNo: notifyPage, pageSize: notifyPageSize });
      setNotifyRecords(res.data?.records || []);
      setNotifyTotal(res.data?.total || 0);
    } catch (e: any) {
      message.error(e?.msg || t('workspace.notify.loadFailed'));
    } finally {
      setNotifyLoading(false);
    }
  }, [notifyPage, notifyPageSize]);

  useEffect(() => {
    void loadNotify();
  }, [loadNotify]);

  useEffect(() => {
    const unsubscribe = subscribeNotify((note) => {
      setNotifyRecords((prev) => [note, ...prev.filter((item) => item.id !== note.id)]);
      setNotifyTotal((prev) => prev + 1);
      const level =
        note.level === 'DANGER'
          ? 'error'
          : note.level === 'WARNING'
            ? 'warning'
            : (note.level as string) === 'SUCCESS'
              ? 'success'
              : 'info';
      notification[level]({
        message: note.title,
        description: note.content,
        placement: 'topRight',
      });
    });
    return unsubscribe;
  }, []);

  const openNote = async (note: NotificationItem) => {
    try {
      await confirmNotify([note.id]);
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
      return;
    }
    setNotifyRecords((prev) => prev.filter((item) => item.id !== note.id));
    setNotifyTotal((prev) => Math.max(0, prev - 1));
    if (note.instId) {
      setPreviewInstId(note.instId);
      setPreviewOpen(true);
    }
  };

  const readPage = async () => {
    if (!notifyRecords.length) return;
    try {
      await confirmNotify(notifyRecords.map((note) => note.id));
      message.success(t('workspace.notify.pageRead'));
      await loadNotify();
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
    }
  };

  const readAll = async () => {
    try {
      await confirmNotify();
      message.success(t('workspace.notify.allRead'));
      setNotifyPage(1);
      await loadNotify();
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await login(userId);
      const data = res.data;
      const user = data?.user || data;
      const token = data?.token;
      setLoginUser(user, token);
      message.success(formatMessage(t('workspace.notify.switchedTo'), { name: user.name }));
      window.location.reload();
    } catch (e: any) {
      message.error(e?.msg || t('workspace.notify.switchFailed'));
    }
  };

  const menuItems = [
    { key: '/workspace/dashboard', icon: <DashboardOutlined />, label: t('menu.workspace') },
    { key: '/workspace/todo', icon: <CheckSquareOutlined />, label: t('menu.todo') },
    { key: '/workspace/ido', icon: <CheckCircleOutlined />, label: t('menu.ido') },
    { key: '/workspace/submitted', icon: <SendOutlined />, label: t('menu.submitted') },
    { key: '/workspace/cc', icon: <ShareAltOutlined />, label: t('menu.ccMe') },
    { key: '/workspace/agent', icon: <UserSwitchOutlined />, label: t('menu.agent') },
    { type: 'divider' as const },
    { key: '/workspace/model', icon: <SettingOutlined />, label: t('menu.modelMg') },
    { key: '/workspace/components', icon: <AppstoreOutlined />, label: t('menu.cpMg') },
    { key: '/workspace/instance', icon: <DatabaseOutlined />, label: t('menu.dataMg') },
    { key: '/workspace/statistics', icon: <BarChartOutlined />, label: t('menu.dataCount') },
    { key: '/workspace/handover', icon: <SwapOutlined />, label: t('menu.handover') },
  ];

  const currentPath = location.pathname;

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme={mode === 'dark' ? 'dark' : 'light'}
        width={220}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            fontWeight: 'bold',
            fontSize: collapsed ? 14 : 18,
            color: token.colorPrimary,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/workspace/dashboard')}
        >
          {collapsed ? 'WF' : 'Workflow-TS'}
        </div>
        <Menu
          mode="inline"
          theme={mode === 'dark' ? 'dark' : 'light'}
          selectedKeys={[currentPath]}
          items={menuItems as any}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            height: 64,
            lineHeight: 'normal',
          }}
        >
          <Space size={20}>
            <Switch
              checked={mode === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              title={t('menu.theme')}
            />

            <Dropdown
              trigger={['click']}
              menu={{
                selectable: true,
                selectedKeys: [lang],
                items: langOptions.map((option) => ({ key: option.value, label: option.label })),
                onClick: ({ key }) => setLang(key),
              }}
            >
              <GlobalOutlined style={{ fontSize: 18, cursor: 'pointer', display: 'flex' }} title={t('menu.language')} />
            </Dropdown>

            <div style={{ display: 'flex' }}>
              <Badge count={notifyTotal} size="small" overflowCount={99}>
                <BellOutlined
                  style={{ fontSize: 18, cursor: 'pointer', display: 'flex' }}
                  onClick={() => setNotifyOpen(true)}
                />
              </Badge>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: 6,
              }}
              onClick={() => setPickerOpen(true)}
            >
              <WAvatar name={loginUser?.name} src={loginUser?.avatar} size={28} showName={false} />
              <div>
                <Typography.Text strong>{loginUser?.name || t('workspace.app.unknownUser')}</Typography.Text>
                {loginUser?.admin && (
                  <Tag color="blue" style={{ marginLeft: 6 }}>
                    {t('workspace.app.admin')}
                  </Tag>
                )}
              </div>
            </div>
          </Space>
        </Header>

        <Content
          style={{
            margin: 16,
            background: token.colorBgContainer,
            borderRadius: 8,
            overflow: 'auto',
            minHeight: 'calc(100vh - 96px)',
          }}
        >
          <div className="w-page" style={{ padding: 20, minHeight: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>

      <Drawer
        title={t('workspace.notify.unread')}
        placement="right"
        width={380}
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button type="link" onClick={() => void readPage()} disabled={notifyRecords.length === 0}>
              {t('workspace.notify.pageReadBtn')}
            </Button>
            <Pagination
              size="small"
              simple
              current={notifyPage}
              pageSize={notifyPageSize}
              total={notifyTotal}
              onChange={(page, size) => {
                setNotifyPage(page);
                setNotifyPageSize(size);
              }}
            />
            <Button type="link" onClick={() => void readAll()} disabled={notifyTotal === 0}>
              {t('workspace.notify.allReadBtn')}
            </Button>
          </div>
        }
      >
        {notifyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : notifyRecords.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('workspace.notify.empty')} />
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {notifyRecords.map((note) => (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: token.colorFillQuaternary,
                  cursor: 'pointer',
                }}
                onClick={() => void openNote(note)}
              >
                <div style={{ marginTop: 2 }}>{notifyLevelIcon(note.level)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                    {note.title}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    {note.content}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {note.createTime?.substring(5, 16)}
                  </Typography.Text>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  title={t('workspace.notify.markRead')}
                  onClick={(event) => {
                    event.stopPropagation();
                    void openNote(note);
                  }}
                />
              </div>
            ))}
          </Space>
        )}
      </Drawer>

      <WUserSwitcher
        open={pickerOpen}
        currentUserId={loginUser?.id}
        onSwitch={(user) => handleSwitchUser(String(user.id))}
        onCancel={() => setPickerOpen(false)}
      />

      <ProcessInstPreview
        open={previewOpen}
        instId={previewInstId}
        onClose={() => setPreviewOpen(false)}
      />
    </Layout>
  );
};

export default MenuFrame;
