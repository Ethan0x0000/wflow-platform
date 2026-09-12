import React, { useState } from 'react';
import { Avatar, Button, Space, Tag, Typography } from 'antd';
import {
  PlusOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { WOrgPicker } from './WOrgPicker';
import type { WOrgType } from './WOrgPicker';
import { useTranslation } from '@/i18n';
import type { OrgTarget } from '@/types/workflow';

export interface WOrgTagsProps {
  value?: OrgTarget[];
  onChange?: (val: OrgTarget[]) => void;
  type?: WOrgType;
  multiple?: boolean;
  max?: number;
  buttonText?: string;
  disabled?: boolean;
  excludes?: string[];
  size?: number;
}

const shortName = (name = '') => (name.length > 2 ? name.slice(-2) : name);

export const WOrgTags: React.FC<WOrgTagsProps> = ({
  value = [],
  onChange,
  type = 'org',
  multiple = true,
  max,
  buttonText,
  disabled = false,
  excludes = [],
  size = 20,
}) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleValue = value.filter((item) => !excludes.some((id) => String(id) === String(item.id)));

  const handleClose = (removed: OrgTarget) => {
    const next = value.filter((item) => !(item.id === removed.id && item.type === removed.type));
    onChange?.(next);
  };

  const handleOk = (res: OrgTarget[]) => {
    onChange?.(max ? res.slice(0, max) : res);
  };

  const ORG_TYPE_ICONS: Partial<Record<OrgTarget['type'], string>> = {
    dept: '/image/dept.png',
    role: '/image/role.png',
    group: '/image/group.png',
  };

  const renderAvatar = (item: OrgTarget) => {
    if (item.type === 'user') {
      return (
        <Avatar
          size={size}
          src={item.avatar || undefined}
          style={{ backgroundColor: item.avatar ? 'transparent' : '#1677ff', flexShrink: 0 }}
        >
          {shortName(item.name)}
        </Avatar>
      );
    }
    const iconSrc = ORG_TYPE_ICONS[item.type];
    if (iconSrc) {
      return <Avatar size={size} src={iconSrc} style={{ backgroundColor: '#f5f5f5', flexShrink: 0 }} />;
    }
    return (
      <Avatar
        size={size}
        icon={<UsergroupAddOutlined style={{ color: '#595959' }} />}
        style={{ backgroundColor: '#f5f5f5', flexShrink: 0 }}
      />
    );
  };

  return (
    <div>
      <Space wrap size={[4, 8]}>
        {visibleValue.map((item) => (
          <Tag
            key={`${item.type}-${item.id}`}
            closable={!disabled}
            onClose={() => handleClose(item)}
            color={item.type === 'dept' ? 'orange' : item.type === 'role' ? 'purple' : item.type === 'group' ? 'cyan' : 'blue'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, paddingInline: 6 }}
          >
            {renderAvatar(item)}
            <Typography.Text style={{ fontSize: 12 }}>{item.name}</Typography.Text>
          </Tag>
        ))}
        {!disabled && (
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setPickerOpen(true)}
          >
            {buttonText ?? t('workspace.org.selectOrg')}
          </Button>
        )}
      </Space>
      <WOrgPicker
        open={pickerOpen}
        type={type}
        multiple={multiple}
        max={max}
        selected={value}
        excludes={excludes}
        onOk={handleOk}
        onCancel={() => setPickerOpen(false)}
      />
    </div>
  );
};

export default WOrgTags;
