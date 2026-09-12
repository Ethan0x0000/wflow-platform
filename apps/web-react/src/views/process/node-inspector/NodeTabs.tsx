import React from 'react';
import { Alert, Tabs } from 'antd';
import { NodeMeta, START_OPERATION_PERMS, TASK_OPERATION_PERMS, APPROVAL_OPERATION_PERMS, getNodeContent } from '../ProcessNodes';
import { TaskConfig } from '../config/common/TaskConfig';
import { RuleConfig } from '../config/common/RuleConfig';
import { ConditionGroupConfig } from '../config/common/ConditionGroupConfig';
import { EventHandlerConfig } from '../config/common/EventHandlerConfig';
import { FormPermConfig } from '../config/common/FormPermConfig';
import { OperationPermConfig } from '../config/common/OperationPermConfig';
import { RouterConfig } from './RouterConfig';
import { SubprocConfig } from './SubprocConfig';
import { TriggerConfig } from './TriggerConfig';
import { WaitingConfig } from './WaitingConfig';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface NodeTabsProps {
  type: string;
  draft: any;
  props: any;
  mutate: (fn: (node: any) => void) => void;
  formFields: any[];
  beforeNodes: any[];
  allNodes: any[];
  routerTargets: any[];
  subprocGroups: any[];
  subprocFields: any[];
}

export const NodeTabs: React.FC<NodeTabsProps> = ({
  type,
  draft,
  props,
  mutate,
  formFields,
  beforeNodes,
  allNodes,
  routerTargets,
  subprocGroups,
  subprocFields,
}) => {
  const { t } = useTranslation();

  const conditionItems = [
    {
      key: 'condition',
      label: t('process.tabs.condition'),
      children: (
        <ConditionGroupConfig
          groups={props.groups || []}
          logic={props.logic !== false}
          formFields={formFields}
          onChange={(patch) => mutate((d) => { Object.assign(d.props, patch); })}
        />
      ),
    },
  ];

  const tabsForType: Record<string, any[]> = {
    Approval: [
      { key: 'rule', label: t('process.tabs.approvalRule'), children: <TaskConfig node={draft} mutate={mutate} formFields={formFields} beforeNodes={beforeNodes} isApproval /> },
      {
        key: 'form',
        label: t('process.tabs.formPerm'),
        children: <FormPermConfig value={props.formPerms || []} onChange={(formPerms) => mutate((d) => { d.props.formPerms = formPerms; })} formFields={formFields} defaultPerm="R" />,
      },
      {
        key: 'operation',
        label: t('process.tabs.operationPerm'),
        children: <OperationPermConfig value={props.operationPerms || []} defaults={APPROVAL_OPERATION_PERMS} onChange={(operationPerms) => mutate((d) => { d.props.operationPerms = operationPerms; })} />,
      },
      {
        key: 'events',
        label: t('process.tabs.events'),
        children: <EventHandlerConfig value={props.events} onChange={(events) => mutate((d) => { d.props.events = events; })} />,
      },
    ],
    Task: [
      { key: 'rule', label: t('process.tabs.taskRule'), children: <TaskConfig node={draft} mutate={mutate} formFields={formFields} beforeNodes={beforeNodes} /> },
      {
        key: 'form',
        label: t('process.tabs.formPerm'),
        children: <FormPermConfig value={props.formPerms || []} onChange={(formPerms) => mutate((d) => { d.props.formPerms = formPerms; })} formFields={formFields} defaultPerm="R" />,
      },
      {
        key: 'operation',
        label: t('process.tabs.operationPerm'),
        children: <OperationPermConfig value={props.operationPerms || []} defaults={TASK_OPERATION_PERMS} onChange={(operationPerms) => mutate((d) => { d.props.operationPerms = operationPerms; })} />,
      },
      {
        key: 'events',
        label: t('process.tabs.events'),
        children: <EventHandlerConfig value={props.events} onChange={(events) => mutate((d) => { d.props.events = events; })} />,
      },
    ],
    Cc: [
      { key: 'rule', label: t('process.tabs.ccRule'), children: <RuleConfig node={draft} mutate={mutate} formFields={formFields} beforeNodes={beforeNodes} mode="cc" /> },
      {
        key: 'form',
        label: t('process.tabs.formPerm'),
        children: <FormPermConfig value={props.formPerms || []} onChange={(formPerms) => mutate((d) => { d.props.formPerms = formPerms; })} formFields={formFields} defaultPerm="R" showE={false} />,
      },
      {
        key: 'events',
        label: t('process.tabs.events'),
        children: <EventHandlerConfig value={props.events} onChange={(events) => mutate((d) => { d.props.events = events; })} />,
      },
    ],
    Start: [
      {
        key: 'form',
        label: t('process.tabs.formPerm'),
        children: <FormPermConfig value={props.formPerms || []} onChange={(formPerms) => mutate((d) => { d.props.formPerms = formPerms; })} formFields={formFields} defaultPerm="E" />,
      },
      {
        key: 'operation',
        label: t('process.tabs.operationPerm'),
        children: (
          <div>
            <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={t('process.tabs.startOperationTip')} />
            <OperationPermConfig value={props.operationPerms || []} defaults={START_OPERATION_PERMS} onChange={(operationPerms) => mutate((d) => { d.props.operationPerms = operationPerms; })} />
          </div>
        ),
      },
      {
        key: 'events',
        label: t('process.tabs.events'),
        children: <EventHandlerConfig value={props.events} onChange={(events) => mutate((d) => { d.props.events = events; })} type="Start" />,
      },
    ],
    Exclusive: conditionItems,
    Inclusive: conditionItems,
    Router: [
      {
        key: 'router',
        label: t('process.tabs.router'),
        children: (
          <RouterConfig props={props} allNodes={allNodes} routerTargets={routerTargets} formFields={formFields} mutate={mutate} />
        ),
      },
    ],
    Trigger: [
      {
        key: 'trigger',
        label: t('process.tabs.trigger'),
        children: <TriggerConfig props={props} mutate={mutate} />,
      },
    ],
    Waiting: [
      {
        key: 'waiting',
        label: t('process.tabs.waiting'),
        children: <WaitingConfig props={props} mutate={mutate} />,
      },
    ],
    Subproc: [
      {
        key: 'subproc',
        label: t('process.tabs.subproc'),
        children: <SubprocConfig props={props} formFields={formFields} subprocGroups={subprocGroups} subprocFields={subprocFields} mutate={mutate} />,
      },
      {
        key: 'form',
        label: t('process.tabs.formPerm'),
        children: <FormPermConfig value={props.formPerms || []} onChange={(formPerms) => mutate((d) => { d.props.formPerms = formPerms; })} formFields={formFields} defaultPerm="R" showE={false} />,
      },
    ],
  };

  const tabs = tabsForType[type] || [
    {
      key: 'info',
      label: t('process.tabs.nodeInfo'),
      children: <Alert type="info" showIcon message={formatMessage(t('process.tabs.noConfig'), { node: NodeMeta[type]?.name || type })} description={getNodeContent(draft)} />,
    },
  ];

  return <Tabs items={tabs} />;
};

export default NodeTabs;
