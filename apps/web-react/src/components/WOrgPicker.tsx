import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CloseOutlined,
  LeftOutlined,
  SearchOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { getOrgTree, getRole, getSysUserGroups, searchOrgs } from '@/api/org';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import type { OrgTarget } from '@/types/workflow';

export type WOrgType = 'org' | 'dept' | 'user' | 'role' | 'group';

export interface WOrgRow {
  id: string;
  name: string;
  type?: WOrgType;
  avatar?: string;
  deptName?: string;
  userCount?: number;
  isLeader?: boolean;
  leader?: string | null;
}

export interface WOrgPickerProps {
  open: boolean;
  title?: string;
  type?: WOrgType | WOrgType[];
  parentId?: string | number;
  multiple?: boolean;
  max?: number;
  selected?: OrgTarget[];
  excludes?: string[];
  onOk: (selected: OrgTarget[]) => void;
  onCancel: () => void;
}

const shortName = (name = '') => (name.length > 2 ? name.slice(-2) : name);

const normalizeRow = (row: any, fallbackType: WOrgType): WOrgRow => ({
  ...row,
  id: String(row?.id ?? ''),
  type: (row?.type as WOrgType) || fallbackType,
  name: String(row?.name ?? ''),
});

const toTarget = (row: WOrgRow): OrgTarget => ({
  id: row.id,
  name: row.name,
  type: (row.type || 'user') as OrgTarget['type'],
  avatar: row.avatar,
});

export const WOrgPicker: React.FC<WOrgPickerProps> = ({
  open,
  title,
  type = 'org',
  parentId = '0',
  multiple = true,
  max,
  selected = [],
  excludes = [],
  onOk,
  onCancel,
}) => {
  const { t } = useTranslation();
  const typeLabels: Record<WOrgType, string> = {
    org: t('workspace.org.org'),
    dept: t('workspace.org.dept'),
    user: t('workspace.org.user'),
    role: t('workspace.org.role'),
    group: t('workspace.org.group'),
  };
  const rootId = String(parentId ?? '0');
  const [loading, setLoading] = useState(false);
  const [currentType, setCurrentType] = useState<WOrgType>('org');
  const [orgPath, setOrgPath] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<WOrgRow[]>([]);
  const [roles, setRoles] = useState<WOrgRow[]>([]);
  const [groups, setGroups] = useState<WOrgRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchRows, setSearchRows] = useState<WOrgRow[]>([]);
  const [currentSelected, setCurrentSelected] = useState<OrgTarget[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const allowedTypes = useMemo<WOrgType[]>(() => {
    if (Array.isArray(type)) return type.length > 0 ? type : ['org'];
    if (type === 'org') return ['org', 'dept', 'user', 'role', 'group'];
    return [type];
  }, [type]);

  const isOrgType = currentType === 'org' || currentType === 'dept' || currentType === 'user';
  const showSearch = keyword.trim() !== '';
  const displayRows = showSearch ? searchRows : rows;

  const loadList = async (activeType: WOrgType, deptId?: string) => {
    setLoading(true);
    try {
      if (activeType === 'role') {
        const res = await getRole();
        const list = Array.isArray(res.data) ? res.data.map((row: any) => normalizeRow(row, 'role')) : [];
        setRoles(list);
        setRows(list);
      } else if (activeType === 'group') {
        const res = await getSysUserGroups();
        const list = Array.isArray(res.data) ? res.data.map((row: any) => normalizeRow(row, 'group')) : [];
        setGroups(list);
        setRows(list);
      } else {
        const targetDeptId = deptId ?? rootId;
        const res = await getOrgTree(targetDeptId, activeType);
        setRows(Array.isArray(res.data) ? res.data.map((row: any) => normalizeRow(row, activeType)) : []);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const first = allowedTypes[0] ?? 'org';
    setCurrentType(first);
    setOrgPath([{ id: rootId, name: '' }]);
    setKeyword('');
    setSearchRows([]);
    setCurrentSelected(selected.map((item) => ({ ...item, id: String(item.id) })));
    void loadList(first, rootId);
  }, [open]);

  const handleTypeChange = (next: WOrgType) => {
    setCurrentType(next);
    setKeyword('');
    setSearchRows([]);
    setOrgPath([{ id: rootId, name: '' }]);
    void loadList(next, rootId);
  };

  const handleSearch = async (value: string) => {
    setKeyword(value);
    const term = value.trim();
    if (!term) {
      setSearchRows([]);
      return;
    }
    if (currentType === 'role') {
      setSearchRows(roles.filter((row) => row.name.includes(term)));
      return;
    }
    if (currentType === 'group') {
      setSearchRows(groups.filter((row) => row.name.includes(term)));
      return;
    }
    setLoading(true);
    try {
      const searchType = currentType === 'user' ? 'user' : currentType === 'dept' ? 'dept' : 'org';
      const res = await searchOrgs(term, searchType);
      setSearchRows(Array.isArray(res.data) ? res.data.map((row: any) => normalizeRow(row, 'user')) : []);
    } catch {
      setSearchRows([]);
    } finally {
      setLoading(false);
    }
  };

  const rowType = (row: WOrgRow): WOrgType => row.type || 'user';

  const isDisabled = (row: WOrgRow) => {
    if (currentType === 'user' && row.type === 'dept') return true;
    return excludes.some((id) => String(id) === row.id);
  };

  const isSelected = (row: WOrgRow) =>
    currentSelected.some((item) => String(item.id) === row.id && item.type === rowType(row));

  const toggleSelect = (row: WOrgRow) => {
    if (isDisabled(row)) return;
    const nextType = rowType(row);
    if (multiple) {
      if (isSelected(row)) {
        setCurrentSelected((prev) =>
          prev.filter((item) => !(String(item.id) === row.id && item.type === nextType))
        );
      } else if (max && currentSelected.length >= max) {
        message.warning(formatMessage(t('workspace.org.maxSelect'), { max }));
      } else {
        setCurrentSelected((prev) => [...prev, toTarget(row)]);
      }
    } else {
      setCurrentSelected([toTarget(row)]);
    }
  };

  const selectableRows = displayRows.filter((row) => !isDisabled(row));
  const allChecked = selectableRows.length > 0 && selectableRows.every((row) => isSelected(row));
  const indeterminate = !allChecked && selectableRows.some((row) => isSelected(row));

  const handleSelectAll = (checked: boolean) => {
    if (!multiple) return;
    if (checked) {
      const additions = selectableRows.filter((row) => !isSelected(row)).map(toTarget);
      setCurrentSelected((prev) => [...prev, ...additions]);
    } else {
      const keys = new Set(selectableRows.map((row) => `${rowType(row)}-${row.id}`));
      setCurrentSelected((prev) => prev.filter((item) => !keys.has(`${item.type}-${item.id}`)));
    }
  };

  const drillIn = (row: WOrgRow) => {
    if (row.type !== 'dept') return;
    setKeyword('');
    setSearchRows([]);
    setOrgPath((prev) => [...prev, { id: row.id, name: row.name }]);
    void loadList(currentType, row.id);
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
    void loadList(currentType, target.id);
  };

  const goParent = () => {
    if (orgPath.length <= 1) return;
    jumpTo(orgPath.length - 2);
  };

  const ORG_TYPE_ICONS: Partial<Record<WOrgType, string>> = {
    dept: '/image/dept.png',
    role: '/image/role.png',
    group: '/image/group.png',
  };

  const renderRowAvatar = (row: WOrgRow) => {
    const nextType = rowType(row);
    if (nextType === 'user') {
      return (
        <Avatar size={32} src={row.avatar || undefined} style={{ backgroundColor: row.avatar ? 'transparent' : '#1677ff', flexShrink: 0 }}>
          {shortName(row.name)}
        </Avatar>
      );
    }
    const iconSrc = ORG_TYPE_ICONS[nextType];
    if (iconSrc) {
      return <Avatar size={32} src={iconSrc} style={{ backgroundColor: '#f5f5f5', flexShrink: 0 }} />;
    }
    return (
      <Avatar
        size={32}
        icon={<UsergroupAddOutlined style={{ color: '#13c2c2' }} />}
        style={{ backgroundColor: '#f5f5f5', flexShrink: 0 }}
      />
    );
  };

  const renderRow = (row: WOrgRow) => {
    const nextType = rowType(row);
    const checked = isSelected(row);
    const disabled = isDisabled(row);
    return (
      <div
        key={`${nextType}-${row.id}`}
        onClick={() => {
          if (disabled) return;
          if (nextType === 'dept' && isOrgType) {
            drillIn(row);
          } else {
            toggleSelect(row);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          borderRadius: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          backgroundColor: checked ? '#e6f4ff' : 'transparent',
        }}
      >
        {multiple ? (
          <Checkbox
            checked={checked}
            disabled={disabled}
            onChange={() => toggleSelect(row)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Radio
            checked={checked}
            disabled={disabled}
            onChange={() => toggleSelect(row)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {renderRowAvatar(row)}
        <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
          {row.name}
        </Typography.Text>
        {row.deptName && <Typography.Text type="secondary">({row.deptName})</Typography.Text>}
        {(row.isLeader || row.leader) && <Tag color="warning">{t('workspace.org.leader')}</Tag>}
        {nextType === 'role' && row.userCount !== undefined && (
          <Tag color="purple">{formatMessage(t('workspace.org.userCount'), { count: row.userCount })}</Tag>
        )}
        {nextType === 'dept' && isOrgType && (
          <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              drillIn(row);
            }}
          >
            {t('workspace.org.sublevel')}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={title ?? t('workspace.org.pickerTitle')}
      open={open}
      width={780}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => {
        onOk(currentSelected);
        onCancel();
      }}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
    >
      {allowedTypes.length > 1 && (
        <Radio.Group
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value as WOrgType)}
          style={{ marginBottom: 12 }}
        >
          {allowedTypes.map((item) => (
            <Radio.Button key={item} value={item}>
              {typeLabels[item]}
            </Radio.Button>
          ))}
        </Radio.Group>
      )}

      <div style={{ display: 'flex', height: 420 }}>
        <div
          style={{
            flex: 1.2,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #f0f0f0',
            paddingRight: 12,
            minWidth: 0,
          }}
        >
          <Input
            placeholder={t('workspace.org.searchName')}
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 8 }}
          />

          {isOrgType && !showSearch && (
            <Space size={2} wrap style={{ padding: '0 4px 8px' }}>
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
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox
              checked={allChecked}
              indeterminate={indeterminate}
              disabled={!multiple || selectableRows.length === 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              {t('workspace.org.selectAll')}
            </Checkbox>
            {isOrgType && (
              <Button
                type="link"
                size="small"
                icon={<LeftOutlined />}
                disabled={showSearch || orgPath.length <= 1}
                onClick={goParent}
              >
                {t('workspace.org.parent')}
              </Button>
            )}
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', marginTop: 4 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin />
              </div>
            ) : displayRows.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('common.noData')} />
            ) : (
              displayRows.map(renderRow)
            )}
          </div>
        </div>

        <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', paddingLeft: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong>
              {formatMessage(t('workspace.org.selectedCount'), { count: currentSelected.length })}
            </Typography.Text>
            {currentSelected.length > 0 && (
              <Button type="link" size="small" danger onClick={() => setCurrentSelected([])}>
                {t('workspace.org.clear')}
              </Button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentSelected.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('workspace.org.selectFromLeft')} />
            ) : (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {currentSelected.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: '#fafafa',
                      borderRadius: 4,
                    }}
                  >
                    {renderRowAvatar({ ...item, type: item.type as WOrgType })}
                    <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
                      {item.name}
                    </Typography.Text>
                    <CloseOutlined
                      style={{ cursor: 'pointer', color: '#999' }}
                      onClick={() => setCurrentSelected((prev) => prev.filter((s) => !(s.id === item.id && s.type === item.type)))}
                    />
                  </div>
                ))}
              </Space>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WOrgPicker;
