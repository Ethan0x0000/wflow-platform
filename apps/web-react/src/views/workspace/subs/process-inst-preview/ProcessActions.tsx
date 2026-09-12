import React from 'react';
import { Button, Space, Typography } from 'antd';
import {
  ClockCircleOutlined,
  CommentOutlined,
  EditOutlined,
  PrinterOutlined,
  RollbackOutlined,
  StopOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import type { InstanceDetail, OperationPerm } from '@/types/workflow';
import type { ActionKind } from './helpers';

export interface ProcessActionsProps {
  hasActions: boolean;
  instance: InstanceDetail | null;
  op: OperationPerm;
  onPrint: () => void;
  onOpenHandler: (action: ActionKind) => void;
  onConfirmRevoke: () => void;
  onOpenUrging: () => void;
  onOpenRevise: () => void;
}

export const ProcessActions: React.FC<ProcessActionsProps> = ({
  hasActions,
  instance,
  op,
  onPrint,
  onOpenHandler,
  onConfirmRevoke,
  onOpenUrging,
  onOpenRevise,
}) => {
  const { t } = useTranslation();
  const actionButtons: React.ReactNode[] = [];
  if (op.comment?.enable) actionButtons.push(
    <Button key="comment" icon={<CommentOutlined />} onClick={() => onOpenHandler('comment')}>
      {op.comment.alisa || t('workspace.actionButton.comment')}
    </Button>
  );
  if (op.forward?.enable) actionButtons.push(
    <Button key="forward" icon={<SwapOutlined />} onClick={() => onOpenHandler('forward')}>
      {op.forward.alisa || t('workspace.actionButton.forward')}
    </Button>
  );
  if (op.fallback?.enable) actionButtons.push(
    <Button key="fallback" icon={<RollbackOutlined />} onClick={() => onOpenHandler('fallback')}>
      {op.fallback.alisa || t('workspace.actionButton.fallback')}
    </Button>
  );
  if (op.beforeAdd?.enable) actionButtons.push(
    <Button key="beforeAdd" icon={<UserAddOutlined />} onClick={() => onOpenHandler('beforeAdd')}>
      {op.beforeAdd.alisa || t('workspace.actionButton.beforeAdd')}
    </Button>
  );
  if (op.afterAdd?.enable) actionButtons.push(
    <Button key="afterAdd" icon={<UserAddOutlined />} onClick={() => onOpenHandler('afterAdd')}>
      {op.afterAdd.alisa || t('workspace.actionButton.afterAdd')}
    </Button>
  );
  if (op.withdraw?.enable) actionButtons.push(
    <Button key="withdraw" icon={<UndoOutlined />} onClick={() => onOpenHandler('withdraw')}>
      {op.withdraw.alisa || t('workspace.actionButton.withdraw')}
    </Button>
  );
  if (op.urging?.enable) actionButtons.push(
    <Button key="urging" icon={<ThunderboltOutlined />} onClick={onOpenUrging}>
      {op.urging.alisa || t('workspace.actionButton.urging')}
    </Button>
  );
  if (op.revise?.enable) actionButtons.push(
    <Button key="revise" icon={<EditOutlined />} onClick={onOpenRevise}>
      {op.revise.alisa || t('workspace.actionButton.revise')}
    </Button>
  );
  if (op.revoke?.enable) actionButtons.push(
    <Button key="revoke" icon={<StopOutlined />} danger onClick={onConfirmRevoke}>
      {op.revoke.alisa || t('workspace.actionButton.revoke')}
    </Button>
  );
  if (op.complete?.enable) actionButtons.push(
    <Button key="complete" type="primary" onClick={() => onOpenHandler('complete')}>
      {op.complete.alisa || t('workspace.actionButton.submit')}
    </Button>
  );
  if (op.reject?.enable) actionButtons.push(
    <Button key="reject" danger onClick={() => onOpenHandler('reject')}>
      {op.reject.alisa || t('workspace.actionButton.reject')}
    </Button>
  );
  if (op.agree?.enable) actionButtons.push(
    <Button key="agree" type="primary" onClick={() => onOpenHandler('agree')}>
      {op.agree.alisa || t('workspace.actionButton.agree')}
    </Button>
  );

  if (hasActions) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0' }}>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={onPrint}>
            {t('workspace.preview.print')}
          </Button>
          {actionButtons}
        </Space>
      </div>
    );
  }
  if (instance) {
    return (
      <Typography.Text type="secondary">
        <ClockCircleOutlined /> {t('workspace.preview.noActions')}
      </Typography.Text>
    );
  }
  return null;
};

export default ProcessActions;
