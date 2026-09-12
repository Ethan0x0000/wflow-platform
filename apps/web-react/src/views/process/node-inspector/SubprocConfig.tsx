import React from 'react';
import { Button, Checkbox, Form, Input, Radio, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { WOrgTags } from '@/components/WOrgTags';
import { useTranslation } from '@/i18n';

export interface SubprocConfigProps {
  props: any;
  formFields: any[];
  subprocGroups: any[];
  subprocFields: any[];
  mutate: (fn: (node: any) => void) => void;
}

export const SubprocConfig: React.FC<SubprocConfigProps> = ({ props, formFields, subprocGroups, subprocFields, mutate }) => {
  const { t } = useTranslation();
  return (
    <Form layout="vertical">
      <Form.Item label={t('process.subproc.select')} required>
        <Select
          showSearch
          allowClear
          optionFilterProp="label"
          placeholder={t('process.subproc.selectPlaceholder')}
          value={props.code || undefined}
          onChange={(value) => {
            for (const group of subprocGroups) {
              const item = (group.items || []).find((it: any) => it.code === value);
              if (item) {
                mutate((d) => {
                  d.props.code = item.code;
                  d.props.name = item.procName;
                  d.props.version = item.version;
                  d.props.defineId = item.defineId;
                  d.props.contextMap = [];
                });
                return;
              }
            }
          }}
          options={subprocGroups.map((group) => ({
            label: group.name,
            options: (group.items || []).map((item: any) => ({ label: item.procName, value: item.code })),
          }))}
        />
      </Form.Item>
      <Form.Item label={t('process.subproc.initiator')}>
        <Radio.Group value={props.initiatorType || 'PARENT'} onChange={(e) => mutate((d) => { d.props.initiatorType = e.target.value; d.props.fixedDept = null; })}>
          <Radio value="PARENT">{t('process.subproc.sameMain')}</Radio>
          <Radio value="FIXED">{t('process.subproc.fixedUser')}</Radio>
        </Radio.Group>
        {props.initiatorType === 'FIXED' && (
          <div style={{ marginTop: 8 }}>
            <WOrgTags
              type="user"
              multiple={false}
              value={props.fixedUser ? [props.fixedUser] : []}
              onChange={(orgs) => mutate((d) => { d.props.fixedUser = orgs[0] || null; d.props.fixedDept = null; })}
              buttonText={t('process.subproc.selectInitiator')}
            />
          </div>
        )}
      </Form.Item>
      <Form.Item label={t('process.subproc.version')}>
        <Radio.Group value={props.isBindVer || false} onChange={(e) => mutate((d) => { d.props.isBindVer = e.target.value; })}>
          <Radio value={false}>{t('process.subproc.latestVersion')}</Radio>
          <Radio value={true}>{t('process.subproc.boundVersion')}</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item label={t('process.subproc.options')}>
        <Space direction="vertical">
          <Checkbox checked={Boolean(props.formAutoMapping)} onChange={(e) => mutate((d) => { d.props.formAutoMapping = e.target.checked; })}>
            {t('process.subproc.formAutoMapping')}
          </Checkbox>
          <Checkbox checked={Boolean(props.isAsync)} onChange={(e) => mutate((d) => { d.props.isAsync = e.target.checked; })}>
            {t('process.subproc.async')}
          </Checkbox>
          <Checkbox checked={Boolean(props.isSyncAllVar)} onChange={(e) => mutate((d) => { d.props.isSyncAllVar = e.target.checked; })}>
            {t('process.subproc.syncAllVars')}
          </Checkbox>
          <Checkbox checked={Boolean(props.isSyncBizKey)} onChange={(e) => mutate((d) => { d.props.isSyncBizKey = e.target.checked; })}>
            {t('process.subproc.syncBizKey')}
          </Checkbox>
          <Checkbox checked={Boolean(props.statusSync)} onChange={(e) => mutate((d) => { d.props.statusSync = e.target.checked; })}>
            {t('process.subproc.statusSync')}
          </Checkbox>
        </Space>
      </Form.Item>
      <Form.Item
        label={
          <Space>
            {t('process.subproc.contextMap')}
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                mutate((d) => {
                  d.props.contextMap = [
                    ...(d.props.contextMap || []),
                    { isFixed: false, source: null, isVar: false, sync: false, target: null },
                  ];
                })
              }
            >
              {t('process.subproc.addRule')}
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {(props.contextMap || []).map((map: any, index: number) => (
            <Space key={index} wrap align="start">
              <Select
                style={{ width: 90 }}
                value={map.isFixed || false}
                onChange={(isFixed) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], isFixed, source: null }; })}
                options={[
                  { label: t('process.subproc.dynamic'), value: false },
                  { label: t('process.subproc.fixed'), value: true },
                ]}
              />
              {map.isFixed ? (
                <Input
                  style={{ width: 180 }}
                  placeholder={t('process.subproc.fixedPlaceholder')}
                  value={map.source ?? ''}
                  onChange={(e) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], source: e.target.value }; })}
                />
              ) : (
                <Select
                  style={{ width: 180 }}
                  allowClear
                  placeholder={t('process.subproc.sourceField')}
                  value={map.source ?? undefined}
                  onChange={(source) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], source }; })}
                  options={formFields.map((field) => ({ label: field.name || field.title, value: field.key || field.id }))}
                />
              )}
              <Typography.Text>→</Typography.Text>
              <Select
                style={{ width: 180 }}
                allowClear
                placeholder={t('process.subproc.targetField')}
                value={map.target ?? undefined}
                onChange={(target) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], target, source: d.props.contextMap[index].isFixed ? null : d.props.contextMap[index].source }; })}
                options={subprocFields.map((field) => ({ label: field.name || field.title, value: field.key || field.id }))}
              />
              <Checkbox checked={Boolean(map.isVar)} onChange={(e) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], isVar: e.target.checked }; })}>
                {t('process.subproc.isVar')}
              </Checkbox>
              <Checkbox checked={Boolean(map.sync)} onChange={(e) => mutate((d) => { d.props.contextMap[index] = { ...d.props.contextMap[index], sync: e.target.checked }; })}>
                {t('process.subproc.sync')}
              </Checkbox>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => mutate((d) => { d.props.contextMap = d.props.contextMap.filter((_: any, i: number) => i !== index); })}
              />
            </Space>
          ))}
        </Space>
      </Form.Item>
    </Form>
  );
};

export default SubprocConfig;
