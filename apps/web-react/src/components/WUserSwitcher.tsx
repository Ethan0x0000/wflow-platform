import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Empty, Input, Modal, Space, Spin, Tag, Typography, theme } from 'antd';
import { LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { getOrgTree, searchOrgs } from '@/api/org';
import { useTranslation } from '@/i18n';
import './WUserSwitcher.css';

export interface SwitchUserTarget {
  id: string;
  name: string;
  avatar?: string;
}

interface WUserSwitcherProps {
  open: boolean;
  currentUserId?: string | number;
  onSwitch: (user: SwitchUserTarget) => void | Promise<void>;
  onCancel: () => void;
}

interface TreeRow {
  id: string;
  name: string;
  type: 'dept' | 'user';
  avatar?: string;
  isLeader?: boolean;
}

const ROOT_ID = '0';

const shortName = (name = '') => (name.length > 2 ? name.slice(-2) : name);

export const WUserSwitcher: React.FC<WUserSwitcherProps> = ({
  open,
  currentUserId,
  onSwitch,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [orgPath, setOrgPath] = useState<Array<{ id: string; name: string }>>([{ id: ROOT_ID, name: '' }]);
  const [rows, setRows] = useState<TreeRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchRows, setSearchRows] = useState<TreeRow[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const searching = keyword.trim() !== '';

  const loadDept = async (deptId: string) => {
    setLoading(true);
    try {
      const res = await getOrgTree(deptId, 'user');
      const list = Array.isArray(res.data) ? res.data : [];
      setRows(
        list.map((row: any) => ({
          id: String(row.id),
          name: String(row.name ?? ''),
          type: row.type === 'dept' ? 'dept' : 'user',
          avatar: row.avatar,
          isLeader: row.isLeader,
        }))
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setOrgPath([{ id: ROOT_ID, name: '' }]);
    setKeyword('');
    setSearchRows([]);
    setSwitching(false);
    void loadDept(ROOT_ID);
  }, [open]);

  const handleSearch = async (value: string) => {
    setKeyword(value);
    const term = value.trim();
    if (!term) {
      setSearchRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchOrgs(term, 'user');
      const list = Array.isArray(res.data) ? res.data : [];
      setSearchRows(
        list
          .filter((row: any) => row.type === 'user')
          .map((row: any) => ({ id: String(row.id), name: String(row.name ?? ''), type: 'user' as const, avatar: row.avatar }))
      );
    } catch {
      setSearchRows([]);
    } finally {
      setLoading(false);
    }
  };

  const drillIn = (row: TreeRow) => {
    setKeyword('');
    setSearchRows([]);
    setOrgPath((prev) => [...prev, { id: row.id, name: row.name }]);
    void loadDept(row.id);
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
  };

  const jumpTo = (index: number) => {
    const target = orgPath[index];
    if (!target) return;
    setKeyword('');
    setSearchRows([]);
    setOrgPath((prev) => prev.slice(0, index + 1));
    void loadDept(target.id);
  };

  const goParent = () => {
    if (orgPath.length <= 1) return;
    jumpTo(orgPath.length - 2);
  };

  const isCurrent = (row: TreeRow) =>
    row.type === 'user' && currentUserId !== undefined && String(currentUserId) === row.id;

  const handleSwitch = async (row: TreeRow) => {
    if (switching || isCurrent(row)) return;
    setSwitching(true);
    try {
      await onSwitch({ id: row.id, name: row.name, avatar: row.avatar });
    } finally {
      setSwitching(false);
    }
  };

  const renderUser = (row: TreeRow) => {
    const current = isCurrent(row);
    return (
      <div
        key={`user-${row.id}`}
        className={current ? 'w-user-switcher-row is-static' : 'w-user-switcher-row'}
        onClick={() => void handleSwitch(row)}
      >
        <Avatar
          size={32}
          src={row.avatar || undefined}
          style={{ backgroundColor: row.avatar ? 'transparent' : '#1677ff', flexShrink: 0 }}
        >
          {shortName(row.name)}
        </Avatar>
        <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
          {row.name}
        </Typography.Text>
        {row.isLeader && <Tag color="warning">{t('workspace.org.leader')}</Tag>}
        {current && <Tag color="blue">{t('workspace.org.current')}</Tag>}
      </div>
    );
  };

  const renderDept = (row: TreeRow) => (
    <div key={`dept-${row.id}`} className="w-user-switcher-row" onClick={() => drillIn(row)}>
      <Avatar size={32} src="/image/dept.png" style={{ backgroundColor: '#f5f5f5', flexShrink: 0 }} />
      <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
        {row.name}
      </Typography.Text>
      <span className="w-user-switcher-next">
        {t('workspace.org.sublevel')}
        <RightOutlined />
      </span>
    </div>
  );

  const displayRows = searching ? searchRows : rows;

  return (
    <Modal
      title={t('workspace.notify.switchUser')}
      open={open}
      width={520}
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <div
        className="w-user-switcher"
        style={
          {
            '--wush-hover': token.colorFillTertiary,
            '--wush-mask': token.colorBgContainer,
          } as React.CSSProperties
        }
      >
        <Input
          placeholder={t('workspace.org.searchName')}
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => void handleSearch(e.target.value)}
          allowClear
          autoFocus
        />

        {!searching && (
          <div className="w-user-switcher-bar">
            <Space size={2} wrap>
              {orgPath.map((item, index) => (
                <React.Fragment key={`${item.id}-${index}`}>
                  {index > 0 && <Typography.Text type="secondary">/</Typography.Text>}
                  {index === orgPath.length - 1 ? (
                    <Typography.Text>{item.name || t('workspace.org.all')}</Typography.Text>
                  ) : (
                    <Typography.Link onClick={() => jumpTo(index)}>
                      {item.name || t('workspace.org.all')}
                    </Typography.Link>
                  )}
                </React.Fragment>
              ))}
            </Space>
            <Button
              type="link"
              size="small"
              icon={<LeftOutlined />}
              disabled={orgPath.length <= 1}
              onClick={goParent}
            >
              {t('workspace.org.parent')}
            </Button>
          </div>
        )}

        <div className="w-user-switcher-hint" style={{ color: token.colorTextSecondary }}>
          {t('workspace.org.clickToSwitch')}
        </div>

        <div ref={listRef} className="w-user-switcher-list">
          {loading ? (
            <div className="w-user-switcher-center">
              <Spin />
            </div>
          ) : displayRows.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.noData')} />
          ) : (
            displayRows.map((row) => (row.type === 'dept' && !searching ? renderDept(row) : renderUser(row)))
          )}
          {switching && (
            <div className="w-user-switcher-mask">
              <Spin />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WUserSwitcher;
