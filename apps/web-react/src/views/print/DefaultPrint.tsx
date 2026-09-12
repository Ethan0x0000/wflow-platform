import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { Spin, message } from 'antd';
import { getInstRecords } from '@/api/instance';
import { useTranslation, t as translate } from '@/i18n';
import { useWflowStore } from '@/stores/wflow';
import { getStatusText } from '@/utils/ProcessUtil';
import { printDom } from '@/utils/printer';
import { ValueType } from '@/views/form/valueType';
import { PrintFormField } from './PrintFormField';
import { interpolate } from './custom-print-designer/helpers';
import './print.css';

export interface PrintHandle {
  doPrint: () => void;
}

interface DefaultPrintProps {
  instance: any;
  formFields: any[];
  permConf?: Record<string, string>;
}

function isEmptyComment(cmt: any): boolean {
  if (!cmt) return true;
  return !cmt.text && (cmt.files || []).length === 0 && (cmt.images || []).length === 0;
}

function getTaskMode(mode: any, t: (key: string) => string): string {
  if (!mode) return '';
  switch (mode.type) {
    case 'AND':
      return t('print.default.taskMode.countersign');
    case 'OR':
      return t('print.default.taskMode.orSign');
    case 'NEXT':
      return t('print.default.taskMode.sequential');
    case 'CUSTOM':
      return `${t('print.default.taskMode.ratioPrefix')}${mode.percentage}${t('print.default.taskMode.ratioSuffix')}`;
    default:
      return '';
  }
}

export const DefaultPrint = forwardRef<PrintHandle, DefaultPrintProps>(({ instance, formFields, permConf = {} }, ref) => {
  const { t } = useTranslation();
  const loginUser = useWflowStore((s) => s.loginUser);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!instance?.instId) return;
    setLoading(true);
    getInstRecords(instance.instId)
      .then((res) => {
        setRecords(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err: any) => {
        message.error(err?.msg || translate('print.error.loadRecordsFailed'));
      })
      .finally(() => setLoading(false));
  }, [instance?.instId]);

  useEffect(() => {
    if (!qrRef.current || !instance?.instId) return;
    const base = (import.meta as any).env?.VITE_MB_BASE_URL || '';
    const url = `${base}/instance?instId=${instance.instId}`;
    QRCode.toCanvas(qrRef.current, url, {
      width: 90,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => undefined);
  }, [instance?.instId]);

  useImperativeHandle(ref, () => ({
    doPrint: () => printDom(rootRef.current),
  }));

  return (
    <div id="default-print" className="w-print" ref={rootRef}>
      <Spin spinning={loading}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 3 }}>{instance?.defineName}</h2>
          <div className="w-print-subtitle">{instance?.title}</div>
        </div>

        <div className="w-print-header">
          <div>{t('print.default.flowNo')}{instance?.instId}</div>
          <div>{t('print.default.submitTime')}{instance?.createTime}</div>
        </div>
        <div className="qr-code">
          <div>{t('print.default.scanQr')}</div>
          <canvas ref={qrRef} />
        </div>
        <div className="w-print-content">
          <table border={0}>
            <tbody>
              {instance?.isAgent && (
                <tr>
                  <th>{t('print.default.agentSubmitter')}</th>
                  <td>{instance?.startUser?.name}</td>
                </tr>
              )}
              <tr>
                <th>{t('print.default.initiator')}</th>
                <td>{instance?.initiator?.name}</td>
              </tr>
              <tr>
                <th>{t('print.default.department')}</th>
                <td>{instance?.startDept}</td>
              </tr>
              <tr className="w-print-split">
                <th style={{ textAlign: 'center' }} colSpan={2}>
                  {t('print.default.formData')}
                </th>
              </tr>
              {formFields.map((field) => {
                if (permConf[field.key] === 'H' || field.valueType === ValueType.none) return null;
                return (
                  <tr key={field.id || field.key}>
                    <th>{field.name}</th>
                    <td>
                      <PrintFormField permConf={permConf} config={field} value={instance?.formData?.[field.key]} />
                    </td>
                  </tr>
                );
              })}
              <tr className="w-print-split">
                <th style={{ textAlign: 'center' }} colSpan={2}>
                  {t('print.default.approvalRecords')}
                </th>
              </tr>
              {records.map((node) => (
                <tr key={node.id}>
                  <th>{node.nodeName}</th>
                  <td>
                    {(node.actualUsers || []).map((user: any) => (
                      <div key={user.taskId} className="w-print-record">
                        <div>
                          <span>
                            {interpolate(t('print.default.assigneeStatus'), {
                              name: user.assignee?.name ?? '',
                              status: getStatusText(user, instance?.isAgent, instance?.initiator?.name),
                            })}
                          </span>
                          <span>{(user.endTime || user.createTime || '').substring(5, 16)}</span>
                        </div>
                        {!isEmptyComment(user.comment) && (
                          <div style={{ marginLeft: 20 }}>
                            <span>{user.comment?.text}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="w-print-footer">
          <div>{t('print.default.printer')}{loginUser?.name}</div>
          <div>{t('print.default.printTime')}{dayjs().format('YYYY-MM-DD HH:mm:ss')}</div>
        </div>
      </Spin>
    </div>
  );
});

DefaultPrint.displayName = 'DefaultPrint';

export default DefaultPrint;
