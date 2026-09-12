import React, { useState } from 'react';
import { Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { WOrgPicker } from '@/components/WOrgPicker';
import { WOrgTags } from '@/components/WOrgTags';
import { useTranslation } from '@/i18n';
import { useDefaultValue } from '../runtime';
import type { FormComponent } from '../types';
import type { OrgTarget } from '@/types/workflow';

export const DeptPicker: FormComponent = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const fieldId = config.key || config.id;
  const [open, setOpen] = useState(false);
  const selected: OrgTarget[] = Array.isArray(value) ? value : [];

  useDefaultValue(config, mode, value, onChange);

  if (mode === 'V') {
    return (
      <span id={fieldId} aria-label={config.name}>
        {selected.map((item) => item?.name).filter(Boolean).join('、')}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {selected.length > 0 ? (
        <WOrgTags
          value={selected}
          onChange={onChange}
          type="dept"
          multiple={props.multiple}
          disabled={mode === 'R'}
        />
      ) : mode === 'R' ? (
        <Typography.Text type="secondary">{props.placeholder}</Typography.Text>
      ) : (
        <Button
          id={fieldId}
          aria-label={props.placeholder || t('form.component.deptPicker.selectDept')}
          shape="circle"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
        />
      )}
      <WOrgPicker
        open={open}
        type="dept"
        multiple={props.multiple}
        selected={selected}
        onOk={(list) => {
          onChange(list);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
};

export default DeptPicker;
