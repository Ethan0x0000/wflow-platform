import React, { useEffect, useState } from 'react';
import { Cascader, DatePicker, Input, Select, Space, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getProcGroupItemsList } from '@/api/model';
import { t, useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface SearchParams {
  code?: string;
  status?: string;
  action?: string;
  title?: string;
  startRange?: string;
}

interface SearchToolsProps {
  value: SearchParams;
  onChange: (value: SearchParams) => void;
  onSearch: () => void;
  showStatus?: boolean;
  showAction?: boolean;
  showType?: boolean;
  startDesc?: string;
  endDesc?: string;
}

const statusOption = (value: string, labelKey: string) => ({
  get label() {
    return t(labelKey);
  },
  value,
});

const actionOption = (value: string, labelKey: string) => ({
  get label() {
    return t(labelKey);
  },
  value,
});

export const STATUS_OPTIONS = [
  statusOption('RUNNING', 'workspace.status.running'),
  statusOption('SUSPEND', 'workspace.status.suspended'),
  statusOption('REFUSE', 'workspace.status.refused'),
  statusOption('REVOKED', 'workspace.status.revoked'),
  statusOption('PASS', 'workspace.status.passed'),
  statusOption('EXCEPTION', 'workspace.status.exception'),
];

export const ACTION_OPTIONS = [
  actionOption('complete', 'workspace.actionOption.complete'),
  actionOption('agree', 'workspace.actionOption.agree'),
  actionOption('reject', 'workspace.actionOption.reject'),
  actionOption('forward', 'workspace.actionOption.forward'),
  actionOption('fallback', 'workspace.actionOption.fallback'),
  actionOption('beforeAdd', 'workspace.actionOption.beforeAdd'),
  actionOption('afterAdd', 'workspace.actionOption.afterAdd'),
  actionOption('revoke', 'workspace.actionOption.revoke'),
  actionOption('revise', 'workspace.actionOption.revise'),
  actionOption('withdraw', 'workspace.actionOption.withdraw'),
];

const presetOption = (value: () => [dayjs.Dayjs, dayjs.Dayjs], labelKey: string) => ({
  get label() {
    return t(labelKey);
  },
  value,
});

const rangePresets = [
  presetOption(() => [dayjs().subtract(1, 'hour'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs], 'workspace.search.presetHour'),
  presetOption(() => [dayjs().subtract(1, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs], 'workspace.search.presetDay'),
  presetOption(() => [dayjs().subtract(7, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs], 'workspace.search.presetWeek'),
  presetOption(() => [dayjs().subtract(30, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs], 'workspace.search.presetMonth'),
  presetOption(() => [dayjs().subtract(90, 'day'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs], 'workspace.search.presetQuarter'),
];

export const SearchTools: React.FC<SearchToolsProps> = ({
  value,
  onChange,
  onSearch,
  showStatus = false,
  showAction = false,
  showType = true,
  startDesc = '',
  endDesc = '',
}) => {
  const { t: translate } = useTranslation();
  const [groups, setGroups] = useState<any[]>([]);
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  useEffect(() => {
    getProcGroupItemsList()
      .then((res) => {
        const options = (res.data || [])
          .filter((group: any) => group.items?.length)
          .map((group: any) => ({
            value: group.id,
            label: group.name,
            children: group.items.map((item: any) => ({ value: item.code, label: item.procName })),
          }));
        setGroups(options);
      })
      .catch((error: any) => message.error(error?.msg || translate('workspace.search.groupFailed')));
  }, []);

  const patch = (part: Partial<SearchParams>) => onChange({ ...value, ...part });

  const update = () => {
    const encoded = range?.[0] && range?.[1]
      ? `${range[0].format('YYYY-MM-DD HH:mm:ss')},${range[1].format('YYYY-MM-DD HH:mm:ss')}`
      : undefined;
    onChange({ ...value, startRange: encoded });
    onSearch();
  };

  return (
    <Space wrap className="w-card" style={{ width: 'calc(100% - 40px)' }}>
      {showType && (
        <Cascader
          allowClear
          changeOnSelect
          options={groups}
          placeholder={translate('workspace.search.processType')}
          value={value.code ? [value.code] : undefined}
          displayRender={(labels) => labels[labels.length - 1]}
          onChange={(next) => patch({ code: (next?.[next.length - 1] as string) || undefined })}
          style={{ width: 200 }}
        />
      )}
      {showStatus && (
        <Select
          allowClear
          placeholder={translate('workspace.search.processStatus')}
          options={STATUS_OPTIONS}
          value={value.status}
          onChange={(next) => patch({ status: next })}
          style={{ width: 120 }}
        />
      )}
      {showAction && (
        <Select
          allowClear
          placeholder={translate('workspace.search.handleType')}
          options={ACTION_OPTIONS}
          value={value.action}
          onChange={(next) => patch({ action: next })}
          style={{ width: 130 }}
        />
      )}
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={translate('workspace.search.placeholder')}
        value={value.title}
        onChange={(event) => patch({ title: event.target.value })}
        onPressEnter={update}
        style={{ width: 250 }}
      />
      <DatePicker.RangePicker
        showTime
        allowClear
        presets={rangePresets}
        value={range as any}
        placeholder={[
          formatMessage(translate('workspace.search.rangeStart'), { desc: startDesc }),
          formatMessage(translate('workspace.search.rangeEnd'), { desc: endDesc }),
        ]}
        onChange={(next) => setRange(next as any)}
        style={{ width: 350 }}
      />
      <Button type="primary" icon={<SearchOutlined />} onClick={update}>
        {translate('workspace.search.query')}
      </Button>
    </Space>
  );
};

export default SearchTools;
