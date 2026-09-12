import React from 'react';
import { Alert, Drawer, Spin, message } from 'antd';
import { WOrgPicker } from '@/components/WOrgPicker';
import { useTranslation } from '@/i18n';
import type { ProcessInstPreviewProps } from './process-inst-preview/helpers';
import { HandlerModal } from './process-inst-preview/HandlerModal';
import { InstSummaryCard } from './process-inst-preview/InstSummaryCard';
import { PreviewDrawerTitle } from './process-inst-preview/PreviewDrawerTitle';
import { PreviewTabs } from './process-inst-preview/PreviewTabs';
import { PrintModal } from './process-inst-preview/PrintModal';
import { ProcessActions } from './process-inst-preview/ProcessActions';
import { ReviseModal } from './process-inst-preview/ReviseModal';
import { UrgingModal } from './process-inst-preview/UrgingModal';
import { useProcessInstPreview } from './process-inst-preview/useProcessInstPreview';

export const ProcessInstPreview: React.FC<ProcessInstPreviewProps> = (props) => {
  const { open, instId, adminMode = false, onClose } = props;
  const { t } = useTranslation();
  const d = useProcessInstPreview(props);

  const copyInstId = async () => {
    try {
      await navigator.clipboard.writeText(instId);
      message.success(t('workspace.preview.copied'));
    } catch {
      message.warning(instId);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={860}
        destroyOnHidden
        title={<PreviewDrawerTitle instance={d.instance} onCopy={copyInstId} />}
        footer={
          <ProcessActions
            hasActions={d.hasActions}
            instance={d.instance}
            op={d.op}
            onPrint={d.openPrint}
            onOpenHandler={d.openHandler}
            onConfirmRevoke={d.confirmRevoke}
            onOpenUrging={() => d.setUrgingOpen(true)}
            onOpenRevise={() => d.setReviseOpen(true)}
          />
        }
      >
        {d.loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip={t('workspace.preview.detailLoading')} />
          </div>
        ) : d.instance ? (
          <div>
            <InstSummaryCard instance={d.instance} />
            <PreviewTabs
              activeTab={d.activeTab}
              onChange={d.setActiveTab}
              hasForm={d.hasForm}
              formSource={d.formSource}
              parentFormSource={d.parentFormSource}
              instance={d.instance}
              parentInst={d.parentInst}
              formRef={d.formRef}
              parentFormRef={d.parentFormRef}
              canHandle={d.canHandle}
              instId={instId}
              adminMode={adminMode}
            />
          </div>
        ) : (
          <Alert message={t('workspace.preview.notFound')} type="warning" showIcon />
        )}
      </Drawer>

      <HandlerModal
        open={d.handlerOpen}
        onCancel={() => d.setHandlerOpen(false)}
        adminMode={adminMode}
        handlerAction={d.handlerAction}
        submitting={d.submitting}
        onOk={d.submitHandler}
        instance={d.instance}
        selectedTaskId={d.selectedTaskId}
        setSelectedTaskId={d.setSelectedTaskId}
        targetUsers={d.targetUsers}
        setTargetUsers={d.setTargetUsers}
        nodeOptions={d.nodeOptions}
        targetNode={d.targetNode}
        setTargetNode={d.setTargetNode}
        commentText={d.commentText}
        setCommentText={d.setCommentText}
        onOpenAtPicker={() => d.setAtPickerOpen(true)}
        commentImages={d.commentImages}
        setCommentImages={d.setCommentImages}
        commentFiles={d.commentFiles}
        setCommentFiles={d.setCommentFiles}
        currentNeedSign={d.currentNeedSign}
        useOldSign={d.useOldSign}
        setUseOldSign={d.setUseOldSign}
        oldSign={d.oldSign}
        signature={d.signature}
        setSignature={d.setSignature}
        saveSignChecked={d.saveSignChecked}
        setSaveSignChecked={d.setSaveSignChecked}
      />

      <ReviseModal
        open={d.reviseOpen}
        onCancel={() => d.setReviseOpen(false)}
        submitting={d.submitting}
        onOk={d.submitRevise}
        formRef={d.formRef}
        formSource={d.formSource}
        instance={d.instance}
        reviseComment={d.reviseComment}
        setReviseComment={d.setReviseComment}
      />

      <UrgingModal
        open={d.urgingOpen}
        onCancel={() => d.setUrgingOpen(false)}
        submitting={d.submitting}
        onOk={d.submitUrging}
        urgingUsers={d.urgingUsers}
        setUrgingUsers={d.setUrgingUsers}
        urgingRemark={d.urgingRemark}
        setUrgingRemark={d.setUrgingRemark}
      />

      <PrintModal
        open={d.printOpen}
        onCancel={() => d.setPrintOpen(false)}
        instance={d.instance}
        printConf={d.printConf}
        customPrint={d.customPrint}
        setCustomPrint={d.setCustomPrint}
        printFields={d.printFields}
        printPermConf={d.printPermConf}
        printRef={d.printRef}
      />

      <WOrgPicker
        open={d.atPickerOpen}
        type="user"
        multiple
        selected={d.atUsers}
        onOk={(users) => {
          d.setAtUsers(users);
          const mention = users.map((user) => `@${user.name} `).join('');
          d.setCommentText((text) => `${text}${text && !text.endsWith(' ') ? ' ' : ''}${mention}`);
          d.setAtPickerOpen(false);
        }}
        onCancel={() => d.setAtPickerOpen(false)}
      />
    </>
  );
};

export default ProcessInstPreview;
