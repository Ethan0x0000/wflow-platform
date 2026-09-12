import React from 'react';
import { Checkbox, Divider, Form, InputNumber, Radio, Select, Space, Typography } from 'antd';
import { WOrgTags } from '@/components/WOrgTags';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import type { Mutator } from './RuleConfig';
import { RuleConfig } from './RuleConfig';

export interface TaskConfigProps {
  node: any;
  mutate: Mutator;
  formFields: any[];
  beforeNodes: any[];
  isApproval?: boolean;
}

export const TaskConfig: React.FC<TaskConfigProps> = ({ node, mutate, formFields, beforeNodes, isApproval }) => {
  const { t } = useTranslation();
  const props = node?.props || {};
  const mode = props.mode || 'USER';
  const action = isApproval ? t('process.action.approve') : t('process.action.handle');

  return (
    <div>
      {isApproval && (
        <Form.Item style={{ marginBottom: 12 }}>
          <Radio.Group value={mode} onChange={(e) => mutate((draft) => { draft.props.mode = e.target.value; })}>
            <Radio value="USER">{t('process.task.manual')}</Radio>
            <Radio value="AUTO_PASS">{t('process.task.autoPass')}</Radio>
            <Radio value="AUTO_REFUSE">{t('process.task.autoRefuse')}</Radio>
          </Radio.Group>
          {mode === 'AUTO_PASS' && (
            <Typography.Text type="success" style={{ display: 'block', marginTop: 8 }}>
              {t('process.task.autoPassTip')}
            </Typography.Text>
          )}
          {mode === 'AUTO_REFUSE' && (
            <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>
              {t('process.task.autoRefuseTip')}
            </Typography.Text>
          )}
        </Form.Item>
      )}

      {(!isApproval || mode === 'USER') && (
        <>
          <RuleConfig node={node} mutate={mutate} formFields={formFields} beforeNodes={beforeNodes} mode="task" isApproval={isApproval} />

          <Form.Item label={t('process.task.assignMode')} style={{ marginTop: 16 }}>
            <Radio.Group
              value={props.candidate || false}
              onChange={(e) => mutate((draft) => { draft.props.candidate = e.target.value; })}
            >
              <Radio value={false}>{t('process.task.directAssign')}</Radio>
              <Radio value={true}>{t('process.task.claimFirst')}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label={formatMessage(t('process.task.multiAction'), { action })}>
            <Space direction="vertical" size={4}>
              <Radio.Group
                value={props.taskMode?.type || 'AND'}
                onChange={(e) => mutate((draft) => { draft.props.taskMode = { ...draft.props.taskMode, type: e.target.value }; })}
              >
                <Radio value="NEXT">{t('process.task.signNext')}</Radio>
                <Radio value="AND">{t('process.task.signAnd')}</Radio>
                <Radio value="OR">{t('process.task.signOr')}</Radio>
                <Radio value="CUSTOM">{t('process.task.signCustom')}</Radio>
              </Radio.Group>
              {props.taskMode?.type === 'CUSTOM' && (
                <InputNumber
                  min={1}
                  max={100}
                  precision={0}
                  value={props.taskMode?.percentage || 100}
                  onChange={(percentage) => mutate((draft) => { draft.props.taskMode = { ...draft.props.taskMode, percentage: percentage || 1 }; })}
                />
              )}
            </Space>
          </Form.Item>

          <Form.Item label={formatMessage(t('process.task.sameRoot'), { action })}>
            <Radio.Group
              value={props.sameRoot?.type || 'TO_SELF'}
              onChange={(e) => mutate((draft) => { draft.props.sameRoot = { ...draft.props.sameRoot, type: e.target.value }; })}
            >
              <Radio value="TO_SELF">{isApproval ? t('process.task.selfApproval') : t('process.task.selfHandling')}</Radio>
              <Radio value="TO_LEADER">{t('process.task.toLeader')}</Radio>
              <Radio value="TO_SKIP">{t('process.task.skip')}</Radio>
              <Radio value="TO_ADMIN">{t('process.task.toAdmin')}</Radio>
              <Radio value="TO_USER">{t('process.task.toUser')}</Radio>
            </Radio.Group>
            {props.sameRoot?.type === 'TO_USER' && (
              <div style={{ marginTop: 8 }}>
                <WOrgTags
                  type="user"
                  value={props.sameRoot?.assigned || []}
                  onChange={(orgs) => mutate((draft) => { draft.props.sameRoot = { ...draft.props.sameRoot, assigned: orgs }; })}
                  buttonText={t('process.task.selectTransferUser')}
                />
              </div>
            )}
          </Form.Item>

          {isApproval && (
            <Form.Item label={t('process.task.needSign')}>
              <Radio.Group
                value={props.needSign || false}
                onChange={(e) => mutate((draft) => { draft.props.needSign = e.target.value; })}
              >
                <Radio value={true}>{t('process.task.signYes')}</Radio>
                <Radio value={false}>{t('process.task.signNo')}</Radio>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item label={formatMessage(t('process.task.noUser'), { action })}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Group
                value={props.noUserHandler?.type || 'TO_NEXT'}
                onChange={(e) => mutate((draft) => { draft.props.noUserHandler = { ...draft.props.noUserHandler, type: e.target.value }; })}
              >
                <Radio value="TO_NEXT">{t('process.task.skipNode')}</Radio>
                <Radio value="TO_ADMIN">{t('process.task.toAdmin')}</Radio>
                <Radio value="TO_USER">{t('process.task.toUser')}</Radio>
                <Radio value="TO_END">{t('process.task.endProcess')}</Radio>
              </Radio.Group>
              {props.noUserHandler?.type === 'TO_USER' && (
                <WOrgTags
                  type="user"
                  value={props.noUserHandler?.assigned || []}
                  onChange={(orgs) => mutate((draft) => { draft.props.noUserHandler = { ...draft.props.noUserHandler, assigned: orgs }; })}
                  buttonText={t('process.task.selectTransferUser')}
                />
              )}
            </Space>
          </Form.Item>

          {isApproval && props.rejectRule && (
            <Form.Item label={t('process.task.reject')}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio.Group
                  value={props.rejectRule?.type || 'END'}
                  onChange={(e) => mutate((draft) => { draft.props.rejectRule = { ...draft.props.rejectRule, type: e.target.value }; })}
                >
                  <Radio value="END">{t('process.task.rejectEnd')}</Radio>
                  <Radio value="NEXT">{t('process.task.rejectNext')}</Radio>
                  <Radio value="SKIP">{t('process.task.rejectSkip')}</Radio>
                </Radio.Group>
                {props.rejectRule?.type === 'SKIP' && (
                  <Select
                    style={{ width: '100%' }}
                    placeholder={t('process.task.selectTarget')}
                    value={props.rejectRule?.target || undefined}
                    onChange={(target) => mutate((draft) => { draft.props.rejectRule = { ...draft.props.rejectRule, target }; })}
                    options={beforeNodes.map((item) => ({ label: item.name, value: item.id }))}
                  />
                )}
              </Space>
            </Form.Item>
          )}

          <Divider>{t('process.task.extensions')}</Divider>
          <Form.Item label={formatMessage(t('process.task.timeout'), { action })}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox
                checked={Boolean(props.timeout?.enable)}
                onChange={(e) => mutate((draft) => { draft.props.timeout = { ...draft.props.timeout, enable: e.target.checked }; })}
              >
                {formatMessage(t('process.task.enableTimeout'), { action })}
              </Checkbox>
              {props.timeout?.enable && (
                <>
                  <Space>
                    <Typography.Text>{t('process.task.duration')}</Typography.Text>
                    <InputNumber
                      min={1}
                      value={props.timeout?.time || 1}
                      onChange={(time) => mutate((draft) => { draft.props.timeout = { ...draft.props.timeout, time: time || 1 }; })}
                    />
                    <Select
                      style={{ width: 90 }}
                      value={props.timeout?.timeUnit || 'M'}
                      onChange={(timeUnit) => mutate((draft) => { draft.props.timeout = { ...draft.props.timeout, timeUnit }; })}
                      options={[
                        { label: t('process.unit.minute'), value: 'M' },
                        { label: t('process.unit.hour'), value: 'H' },
                        { label: t('process.unit.day'), value: 'D' },
                      ]}
                    />
                  </Space>
                  <Radio.Group
                    value={props.timeout?.type || 'TO_PASS'}
                    onChange={(e) => mutate((draft) => { draft.props.timeout = { ...draft.props.timeout, type: e.target.value }; })}
                  >
                    <Radio value="TO_PASS">{isApproval ? t('process.task.autoApprove') : t('process.task.autoHandle')}</Radio>
                    {isApproval && <Radio value="TO_REFUSE">{t('process.task.autoRefuse')}</Radio>}
                    <Radio value="NOTIFY">{t('process.task.notify')}</Radio>
                  </Radio.Group>
                </>
              )}
            </Space>
          </Form.Item>
        </>
      )}
    </div>
  );
};

export default TaskConfig;
