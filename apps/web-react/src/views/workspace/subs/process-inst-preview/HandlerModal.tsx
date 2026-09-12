import React from 'react';
import { Alert, Button, Checkbox, Divider, Input, Modal, Select, Space, Tag } from 'antd';
import { WOrgTags } from '@/components/WOrgTags';
import { WResUpload, type ResFile } from '@/components/WResUpload';
import { WSignature } from '@/components/WSignature';
import type { FallbackNode } from '@/api/task';
import type { InstanceDetail, OrgTarget } from '@/types/workflow';
import { resUrl } from '@/utils/resource';
import { useTranslation } from '@/i18n';
import { actionTitleKeys, quickCommentKeys, type ActionKind } from './helpers';

export interface HandlerModalProps {
  open: boolean;
  onCancel: () => void;
  adminMode: boolean;
  handlerAction: ActionKind;
  submitting: boolean;
  onOk: () => void;
  instance: InstanceDetail | null;
  selectedTaskId: string | undefined;
  setSelectedTaskId: (value?: string) => void;
  targetUsers: OrgTarget[];
  setTargetUsers: (users: OrgTarget[]) => void;
  nodeOptions: FallbackNode[];
  targetNode: string | undefined;
  setTargetNode: (value?: string) => void;
  commentText: string;
  setCommentText: (value: string) => void;
  onOpenAtPicker: () => void;
  commentImages: ResFile[];
  setCommentImages: (images: ResFile[]) => void;
  commentFiles: ResFile[];
  setCommentFiles: (files: ResFile[]) => void;
  currentNeedSign: boolean;
  useOldSign: boolean;
  setUseOldSign: (checked: boolean) => void;
  oldSign: string;
  signature: string;
  setSignature: (value: string) => void;
  saveSignChecked: boolean;
  setSaveSignChecked: (checked: boolean) => void;
}

export const HandlerModal: React.FC<HandlerModalProps> = ({
  open,
  onCancel,
  adminMode,
  handlerAction,
  submitting,
  onOk,
  instance,
  selectedTaskId,
  setSelectedTaskId,
  targetUsers,
  setTargetUsers,
  nodeOptions,
  targetNode,
  setTargetNode,
  commentText,
  setCommentText,
  onOpenAtPicker,
  commentImages,
  setCommentImages,
  commentFiles,
  setCommentFiles,
  currentNeedSign,
  useOldSign,
  setUseOldSign,
  oldSign,
  signature,
  setSignature,
  saveSignChecked,
  setSaveSignChecked,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={`${adminMode ? t('workspace.handler.adminPrefix') : ''}${t(actionTitleKeys[handlerAction])}`}
      open={open}
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={onOk}
      destroyOnHidden
      width={560}
    >
      <div style={{ padding: '12px 0' }}>
        {instance?.todoTasks && instance.todoTasks.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>{t('workspace.handler.selectTask')}</div>
            <Select
              value={selectedTaskId}
              onChange={setSelectedTaskId}
              options={instance.todoTasks.map((task) => ({
                label: task.taskName || task.nodeName || task.taskId,
                value: task.taskId,
              }))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {['forward', 'beforeAdd', 'afterAdd'].includes(handlerAction) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>
              {t('workspace.handler.selectTarget')}
              {handlerAction === 'forward' ? t('workspace.handler.forwardHint') : t('workspace.handler.addSignHint')}:
            </div>
            <WOrgTags
              value={targetUsers}
              onChange={setTargetUsers}
              max={1}
              excludes={[]}
              buttonText={t('workspace.agent.selectPerson')}
            />
          </div>
        )}

        {['fallback', 'withdraw'].includes(handlerAction) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>{t('workspace.handler.selectNode')}</div>
            {nodeOptions.length === 0 ? (
              <Alert type="warning" showIcon message={t('workspace.handler.noNodes')} />
            ) : (
              <Select
                value={targetNode}
                onChange={setTargetNode}
                options={nodeOptions.map((node) => ({ label: node.name || node.nodeName, value: node.nodeId }))}
                style={{ width: '100%' }}
              />
            )}
          </div>
        )}

        {handlerAction !== 'revoke' && (
          <>
            <div style={{ marginBottom: 6, fontWeight: 500 }}>{t('workspace.handler.comment')}</div>
            <Input.TextArea
              rows={4}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={t('workspace.handler.commentPlaceholder')}
              maxLength={250}
              showCount
            />
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <Space size={8} wrap>
                {quickCommentKeys.map((key) => (
                  <Tag key={key} style={{ cursor: 'pointer' }} onClick={() => setCommentText(t(key))}>
                    {t(key)}
                  </Tag>
                ))}
                <Button size="small" type="link" onClick={onOpenAtPicker}>
                  {t('workspace.handler.mention')}
                </Button>
              </Space>
            </div>
            <WResUpload
              value={{ images: commentImages, files: commentFiles }}
              onChange={(next) => {
                setCommentImages(next.images || []);
                setCommentFiles(next.files || []);
              }}
            />
          </>
        )}

        {currentNeedSign && (handlerAction === 'agree' || handlerAction === 'complete') && (
          <div style={{ marginTop: 16 }}>
            <Divider orientation="left" plain>
              {t('workspace.sign.label')}
            </Divider>
            <Checkbox checked={useOldSign} onChange={(event) => setUseOldSign(event.target.checked)}>
              {t('workspace.sign.useLast')}
            </Checkbox>
            {useOldSign && oldSign ? (
              <div style={{ marginTop: 8 }}>
                <img src={resUrl(oldSign, { isSign: 'true' })} alt={t('workspace.sign.alt')} style={{ maxWidth: 200, border: '1px solid #eee' }} />
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <WSignature value={signature} onChange={setSignature} height={140} />
              </div>
            )}
            <Checkbox
              style={{ marginTop: 8 }}
              checked={saveSignChecked}
              onChange={(event) => setSaveSignChecked(event.target.checked)}
            >
              {t('workspace.sign.saveDefault')}
            </Checkbox>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HandlerModal;
