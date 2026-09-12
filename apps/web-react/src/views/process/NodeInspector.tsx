import React from 'react';
import { Button, Drawer, Empty, Form, Input, Space, Tag } from 'antd';
import { NodeMeta } from './ProcessNodes';
import { NodeTabs } from './node-inspector/NodeTabs';
import { useNodeInspector } from './node-inspector/useNodeInspector';
import { useTranslation } from '@/i18n';

export interface NodeInspectorProps {
  open: boolean;
  node: any | null;
  processNodes: any[];
  formFields?: any[];
  onClose: () => void;
  onSave: (node: any) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ open, node, processNodes, formFields: formFieldsProp, onClose, onSave }) => {
  const { t } = useTranslation();
  const { formFields, draft, mutate, allNodes, beforeNodes, routerTargets, subprocGroups, subprocFields } = useNodeInspector({
    open,
    node,
    processNodes,
    formFields: formFieldsProp,
  });

  if (!open) return null;
  if (!draft) {
    return (
      <Drawer title={t('process.inspector.title')} open={open} onClose={onClose} width={640}>
        <Empty description={t('process.inspector.noNode')} />
      </Drawer>
    );
  }

  const type = draft.type;
  const props = draft.props || {};

  return (
    <Drawer
      title={
        <Space>
          <Tag color={NodeMeta[type]?.color || '#8c8c8c'}>{NodeMeta[type]?.name || type}</Tag>
          <span>{t('process.inspector.title')}</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={640}
      extra={
        <Space>
          <Button onClick={onClose}>{t('process.inspector.cancel')}</Button>
          <Button type="primary" onClick={() => onSave(draft)}>
            {t('process.inspector.save')}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label={t('process.inspector.nodeName')} required>
          <Input value={draft.name || ''} onChange={(e) => mutate((d) => { d.name = e.target.value; })} maxLength={20} showCount />
        </Form.Item>
      </Form>
      <NodeTabs
        type={type}
        draft={draft}
        props={props}
        mutate={mutate}
        formFields={formFields}
        beforeNodes={beforeNodes}
        allNodes={allNodes}
        routerTargets={routerTargets}
        subprocGroups={subprocGroups}
        subprocFields={subprocFields}
      />
    </Drawer>
  );
};

export default NodeInspector;
