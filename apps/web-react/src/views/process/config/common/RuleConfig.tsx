import React from 'react';
import { Button, Divider, Form, Input, InputNumber, Radio, Select, Space, Typography } from 'antd';
import { WOrgTags } from '@/components/WOrgTags';
import { WCodeEditor } from '@/components/WCodeEditor';
import { WExpInput } from '@/components/WExpInput';
import { normalizeValueType } from '@/utils/ConditionCompare';
import { t as translate, useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { HttpConfig } from './HttpConfig';

export type Mutator = (fn: (node: any) => void) => void;

export interface RuleConfigProps {
  node: any;
  mutate: Mutator;
  formFields: any[];
  beforeNodes: any[];
  mode: 'task' | 'cc';
  isApproval?: boolean;
}

export const TASK_RULE_TYPES = [
  { get label() { return translate('process.rule.assignUser'); }, value: 'ASSIGN_USER' },
  { get label() { return translate('process.rule.nodeSelect'); }, value: 'NODE_SELECT' },
  { get label() { return translate('process.rule.rootSelf'); }, value: 'ROOT_SELF' },
  { get label() { return translate('process.rule.leader'); }, value: 'LEADER' },
  { get label() { return translate('process.rule.leaderTop'); }, value: 'LEADER_TOP' },
  { get label() { return translate('process.rule.superior'); }, value: 'SUPERIOR' },
  { get label() { return translate('process.rule.superiorTop'); }, value: 'SUPERIOR_TOP' },
  { get label() { return translate('process.rule.assignGroup'); }, value: 'ASSIGN_GROUP' },
  { get label() { return translate('process.rule.assignRole'); }, value: 'ASSIGN_ROLE' },
  { get label() { return translate('process.rule.assignDept'); }, value: 'ASSIGN_DEPT' },
  { get label() { return translate('process.rule.formDept'); }, value: 'FORM_DEPT' },
  { get label() { return translate('process.rule.formUser'); }, value: 'FORM_USER' },
  { get label() { return translate('process.rule.dynamic'); }, value: 'DYNAMIC' },
  { get label() { return translate('process.rule.custom'); }, value: 'CUSTOM' },
];

export const CC_RULE_TYPES = [
  { get label() { return translate('process.rule.assignUser'); }, value: 'ASSIGN_USER' },
  { get label() { return translate('process.rule.rootSelect'); }, value: 'ROOT_SELECT' },
  { get label() { return translate('process.rule.rootSelf'); }, value: 'ROOT_SELF' },
  { get label() { return translate('process.rule.leader'); }, value: 'LEADER' },
  { get label() { return translate('process.rule.leaderTop'); }, value: 'LEADER_TOP' },
  { get label() { return translate('process.rule.superior'); }, value: 'SUPERIOR' },
  { get label() { return translate('process.rule.superiorTop'); }, value: 'SUPERIOR_TOP' },
  { get label() { return translate('process.rule.assignGroup'); }, value: 'ASSIGN_GROUP' },
  { get label() { return translate('process.rule.assignRole'); }, value: 'ASSIGN_ROLE' },
  { get label() { return translate('process.rule.assignDept'); }, value: 'ASSIGN_DEPT' },
  { get label() { return translate('process.rule.formDept'); }, value: 'FORM_DEPT' },
  { get label() { return translate('process.rule.formUser'); }, value: 'FORM_USER' },
  { get label() { return translate('process.rule.dynamicPlain'); }, value: 'DYNAMIC' },
];

export const isUserField = (field: any) =>
  String(field?.type || '').toLowerCase().includes('user') || normalizeValueType(field?.valueType) === 'user';
export const isDeptField = (field: any) =>
  String(field?.type || '').toLowerCase().includes('dept') || normalizeValueType(field?.valueType) === 'dept';

const DeptRuleEditor: React.FC<{ rule: any; onChange: (rule: any) => void; showFormField?: boolean; deptFields: any[] }> = ({
  rule,
  onChange,
  showFormField,
  deptFields,
}) => {
  const { t } = useTranslation();
  const data = { dept: [], type: 'LEADER', nested: false, roles: [], groups: [], ...(rule || {}) };
  const patch = (delta: Record<string, any>) => onChange({ ...data, ...delta });
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      {showFormField ? (
        <Form.Item label={t('process.rule.formDeptField')} style={{ marginBottom: 0 }}>
          <Select
            allowClear
            placeholder={t('process.rule.formDeptField')}
            value={data.dept?.[0]?.id}
            onChange={(value) => {
              const field = deptFields.find((item) => (item.key || item.id) === value);
              patch({ dept: field ? [field] : [] });
            }}
            options={deptFields.map((field) => ({ label: field.name || field.title, value: field.key || field.id }))}
          />
        </Form.Item>
      ) : (
        <Form.Item label={t('process.rule.assignDept')} style={{ marginBottom: 0 }}>
          <WOrgTags type="dept" value={data.dept || []} onChange={(orgs) => patch({ dept: orgs })} buttonText={t('process.rule.selectDept')} />
        </Form.Item>
      )}
      {(data.dept || []).length > 0 && (
        <>
          <Radio.Group value={data.type} onChange={(e) => patch({ type: e.target.value })}>
            <Radio value="LEADER">{t('process.rule.leader')}</Radio>
            <Radio value="USER">{t('process.rule.deptUsers')}</Radio>
            <Radio value="ROLE">{t('process.rule.deptRoles')}</Radio>
            <Radio value="GROUP">{t('process.rule.deptGroups')}</Radio>
          </Radio.Group>
          {data.type === 'USER' && (
            <Radio.Group value={data.nested} onChange={(e) => patch({ nested: e.target.value })}>
              <Radio value={false}>{t('process.rule.noSubDept')}</Radio>
              <Radio value={true}>{t('process.rule.includeSubDept')}</Radio>
            </Radio.Group>
          )}
          {data.type === 'ROLE' && (
            <WOrgTags type="role" value={data.roles || []} onChange={(orgs) => patch({ roles: orgs })} buttonText={t('process.rule.selectRole')} />
          )}
          {data.type === 'GROUP' && (
            <WOrgTags type="group" value={data.groups || []} onChange={(orgs) => patch({ groups: orgs })} buttonText={t('process.rule.selectGroup')} />
          )}
        </>
      )}
    </Space>
  );
};

const LevelOptions = ({ max = 18 }: { max?: number }) => {
  const { t } = useTranslation();
  return (
    <>
      <Select.Option value={1}>{t('process.rule.levelFirst')}</Select.Option>
      {Array.from({ length: max }, (_, i) => i + 2).map((level) => (
        <Select.Option key={level} value={level}>
          {formatMessage(t('process.rule.levelN'), { level })}
        </Select.Option>
      ))}
    </>
  );
};

export const RuleConfig: React.FC<RuleConfigProps> = ({ node, mutate, formFields, beforeNodes, mode, isApproval }) => {
  const { t } = useTranslation();
  const props = node?.props || {};
  const ruleType = props.ruleType || 'ASSIGN_USER';
  const action = isApproval ? t('process.action.approve') : t('process.action.handle');
  const ruleTypes = mode === 'cc' ? CC_RULE_TYPES : TASK_RULE_TYPES;

  const userFields = formFields.filter(isUserField);
  const deptFields = formFields.filter(isDeptField);

  return (
    <div>
      <Typography.Text>{formatMessage(t('process.rule.title'), { target: mode === 'cc' ? t('process.rule.targetCc') : isApproval ? t('process.rule.targetApprover') : t('process.rule.targetHandler') })}</Typography.Text>
      <div style={{ marginTop: 8 }}>
        <Radio.Group
          value={ruleType}
          onChange={(e) => mutate((draft) => { draft.props.ruleType = e.target.value; })}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {ruleTypes.map((type) => (
            <Radio key={type.value} value={type.value}>
              {type.label}
            </Radio>
          ))}
        </Radio.Group>
      </div>
      <Divider style={{ margin: '12px 0' }}>{t('process.rule.settings')}</Divider>

      {ruleType === 'ASSIGN_USER' && (
        <WOrgTags
          type="user"
          value={props.assignUser || []}
          onChange={(orgs) => mutate((draft) => { draft.props.assignUser = orgs; })}
          buttonText={formatMessage(t('process.rule.addAssignees'), { action })}
        />
      )}

      {ruleType === 'NODE_SELECT' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder={t('process.rule.selectUpstream')}
            value={props.nodeAssign?.nodeIds || []}
            onChange={(nodeIds) => mutate((draft) => { draft.props.nodeAssign = { ...draft.props.nodeAssign, nodeIds }; })}
            options={beforeNodes.map((item) => ({ label: item.name, value: item.id }))}
          />
          <Radio.Group
            value={props.nodeAssign?.multiple || false}
            onChange={(e) => mutate((draft) => { draft.props.nodeAssign = { ...draft.props.nodeAssign, multiple: e.target.value }; })}
          >
            <Radio value={false}>{t('process.rule.onePerson')}</Radio>
            <Radio value={true}>{t('process.rule.multiplePeople')}</Radio>
          </Radio.Group>
        </Space>
      )}

      {ruleType === 'ROOT_SELF' && (
        <Typography.Text>{formatMessage(t('process.rule.rootSelfAs'), { target: mode === 'cc' ? t('process.rule.targetCcDoing') : isApproval ? t('process.rule.targetApproverDoing') : t('process.rule.targetHandlerDoing') })}</Typography.Text>
      )}

      {ruleType === 'ROOT_SELECT' && (
        <Radio.Group
          value={props.rootAssign?.multiple || false}
          onChange={(e) => mutate((draft) => { draft.props.rootAssign = { ...draft.props.rootAssign, multiple: e.target.value }; })}
        >
          <Radio value={false}>{t('process.rule.rootSelectOne')}</Radio>
          <Radio value={true}>{t('process.rule.rootSelectMany')}</Radio>
        </Radio.Group>
      )}

      {ruleType === 'LEADER' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label={t('process.rule.leaderLevel')} style={{ marginBottom: 0 }}>
            <Select
              style={{ width: '100%' }}
              value={props.leader?.level || 1}
              onChange={(level) => mutate((draft) => { draft.props.leader = { ...draft.props.leader, level }; })}
            >
              <LevelOptions />
            </Select>
          </Form.Item>
          <Form.Item label={t('process.rule.leaderEmpty')} style={{ marginBottom: 0 }}>
            <Radio.Group
              value={props.leader?.emptySkip || false}
              onChange={(e) => mutate((draft) => { draft.props.leader = { ...draft.props.leader, emptySkip: e.target.value }; })}
            >
              <Radio value={false}>{t('process.rule.countAsLevel')}</Radio>
              <Radio value={true}>{t('process.rule.onlyIfExists')}</Radio>
            </Radio.Group>
          </Form.Item>
        </Space>
      )}

      {ruleType === 'LEADER_TOP' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item label={t('process.rule.leaderTopEnd')} style={{ marginBottom: 0 }}>
            <Space>
              <Radio.Group
                value={props.leaderTop?.toEnd || false}
                onChange={(e) => mutate((draft) => { draft.props.leaderTop = { ...draft.props.leaderTop, toEnd: e.target.value }; })}
              >
                <Radio value={false}>{t('process.rule.untilLevel')}</Radio>
                <Radio value={true}>{t('process.rule.toTopDept')}</Radio>
              </Radio.Group>
              {!props.leaderTop?.toEnd && (
                <InputNumber
                  min={1}
                  max={50}
                  value={props.leaderTop?.level || 1}
                  onChange={(level) => mutate((draft) => { draft.props.leaderTop = { ...draft.props.leaderTop, level: level || 1 }; })}
                />
              )}
            </Space>
          </Form.Item>
          <Form.Item label={t('process.rule.leaderEmpty')} style={{ marginBottom: 0 }}>
            <Radio.Group
              value={props.leaderTop?.emptySkip || false}
              onChange={(e) => mutate((draft) => { draft.props.leaderTop = { ...draft.props.leaderTop, emptySkip: e.target.value }; })}
            >
              <Radio value={false}>{t('process.rule.countAsLevel')}</Radio>
              <Radio value={true}>{t('process.rule.onlyIfExists')}</Radio>
            </Radio.Group>
          </Form.Item>
        </Space>
      )}

      {ruleType === 'SUPERIOR' && (
        <Form.Item label={t('process.rule.superiorLevel')} style={{ marginBottom: 0 }}>
          <Select
            style={{ width: '100%' }}
            value={props.superior?.level || 1}
            onChange={(level) => mutate((draft) => { draft.props.superior = { ...draft.props.superior, level }; })}
          >
            <LevelOptions />
          </Select>
        </Form.Item>
      )}

      {ruleType === 'SUPERIOR_TOP' && (
        <Form.Item label={t('process.rule.superiorTopEnd')} style={{ marginBottom: 0 }}>
          <Space>
            <Radio.Group
              value={props.superiorTop?.toEnd || false}
              onChange={(e) => mutate((draft) => { draft.props.superiorTop = { ...draft.props.superiorTop, toEnd: e.target.value }; })}
            >
              <Radio value={false}>{t('process.rule.untilLevel')}</Radio>
              <Radio value={true}>{t('process.rule.toTopSuperior')}</Radio>
            </Radio.Group>
            {!props.superiorTop?.toEnd && (
              <InputNumber
                min={1}
                max={50}
                value={props.superiorTop?.level || 1}
                onChange={(level) => mutate((draft) => { draft.props.superiorTop = { ...draft.props.superiorTop, level: level || 1 }; })}
              />
            )}
          </Space>
        </Form.Item>
      )}

      {ruleType === 'ASSIGN_DEPT' && (
        <DeptRuleEditor
          rule={props.assignDept}
          deptFields={deptFields}
          onChange={(assignDept) => mutate((draft) => { draft.props.assignDept = assignDept; })}
        />
      )}

      {ruleType === 'FORM_DEPT' && (
        <DeptRuleEditor
          rule={props.formDept}
          deptFields={deptFields}
          showFormField
          onChange={(formDept) => mutate((draft) => { draft.props.formDept = formDept; })}
        />
      )}

      {ruleType === 'FORM_USER' && (
        <Form.Item label={t('process.rule.formUserField')} style={{ marginBottom: 0 }}>
          <Select
            allowClear
            placeholder={t('process.rule.formUserField')}
            value={props.formUser?.id}
            onChange={(value) => {
              const field = userFields.find((item) => (item.key || item.id) === value);
              mutate((draft) => { draft.props.formUser = field || null; });
            }}
            options={userFields.map((field) => ({ label: field.name || field.title, value: field.key || field.id }))}
          />
        </Form.Item>
      )}

      {ruleType === 'ASSIGN_GROUP' && (
        <WOrgTags
          type="group"
          value={props.assignGroup || []}
          onChange={(orgs) => mutate((draft) => { draft.props.assignGroup = orgs; })}
          buttonText={t('process.rule.selectGroup')}
        />
      )}

      {ruleType === 'ASSIGN_ROLE' && (
        <WOrgTags
          type="role"
          value={props.assignRole || []}
          onChange={(orgs) => mutate((draft) => { draft.props.assignRole = orgs; })}
          buttonText={t('process.rule.selectSystemRole')}
        />
      )}

      {ruleType === 'DYNAMIC' && (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Radio.Group
            value={props.dynamic?.type || 'EL'}
            onChange={(e) => mutate((draft) => {
              draft.props.dynamic = { type: e.target.value, el: '', script: 'return []', http: {}, ...(draft.props.dynamic || {}) };
              draft.props.dynamic.type = e.target.value;
            })}
          >
            <Radio value="EL">{t('process.common.el')}</Radio>
            <Radio value="JS">{t('process.common.script')}</Radio>
            <Radio value="HTTP">{t('process.common.http')}</Radio>
          </Radio.Group>
          {props.dynamic?.type === 'EL' && (
            <WExpInput
              value={props.dynamic?.el || ''}
              onChange={(next) => mutate((draft) => { draft.props.dynamic = { ...draft.props.dynamic, el: next }; })}
              variables={formFields.map((field) => ({
                label: field.name || field.key || field.id,
                value: field.key || field.id,
              }))}
              placeholder={t('process.rule.elPlaceholder')}
            />
          )}
          {props.dynamic?.type === 'JS' && (
            <WCodeEditor
              lang="javascript"
              height={160}
              value={props.dynamic?.script || ''}
              onChange={(next) => mutate((draft) => { draft.props.dynamic = { ...draft.props.dynamic, script: next }; })}
            />
          )}
          {props.dynamic?.type === 'HTTP' && (
            <HttpConfig
              value={props.dynamic?.http || {}}
              onChange={(http) => mutate((draft) => { draft.props.dynamic = { ...draft.props.dynamic, http }; })}
              showAft
            />
          )}
        </Space>
      )}

      {ruleType === 'CUSTOM' && (
        <Space>
          <Select style={{ width: 240 }} placeholder={t('process.rule.customRulePlaceholder')} value={props.customRuleType} onChange={(customRuleType) => mutate((draft) => { draft.props.customRuleType = customRuleType; })} options={[]} />
          <Typography.Link>{t('process.rule.customRuleLink')}</Typography.Link>
        </Space>
      )}
    </div>
  );
};

export default RuleConfig;
