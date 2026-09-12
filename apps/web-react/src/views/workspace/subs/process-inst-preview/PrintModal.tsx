import React from 'react';
import { Button, Modal, Radio } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { CustomPrintRender } from '@/views/print/CustomPrintRender';
import { DefaultPrint, type PrintHandle } from '@/views/print/DefaultPrint';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import type { InstanceDetail } from '@/types/workflow';

export interface PrintModalProps {
  open: boolean;
  onCancel: () => void;
  instance: InstanceDetail | null;
  printConf: { type: string; template: any } | null;
  customPrint: boolean;
  setCustomPrint: (value: boolean) => void;
  printFields: any[];
  printPermConf: Record<string, string>;
  printRef: React.MutableRefObject<PrintHandle | null>;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  open,
  onCancel,
  instance,
  printConf,
  customPrint,
  setCustomPrint,
  printFields,
  printPermConf,
  printRef,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{formatMessage(t('workspace.print.title'), { name: instance?.defineName || '' })}</span>
          {printConf?.template && (
            <Radio.Group
              size="small"
              value={customPrint}
              onChange={(event) => setCustomPrint(event.target.value)}
              options={[
                { label: t('workspace.print.defaultTemplate'), value: false },
                { label: t('workspace.print.customTemplate'), value: true },
              ]}
            />
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={customPrint ? 900 : 800}
      footer={[
        <Button key="close" onClick={onCancel}>
          {t('workspace.print.close')}
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => printRef.current?.doPrint()}>
          {t('workspace.print.print')}
        </Button>,
      ]}
    >
      {customPrint && printConf?.template ? (
        <CustomPrintRender
          ref={printRef}
          config={printConf.template}
          permConf={printPermConf}
          formFields={printFields}
          instance={instance}
        />
      ) : (
        <DefaultPrint ref={printRef} permConf={printPermConf} formFields={printFields} instance={instance} />
      )}
    </Modal>
  );
};

export default PrintModal;
