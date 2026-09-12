import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Editor, { ControlType, EditorMode, ElementType, ImageDisplay } from '@hufe921/canvas-editor';
import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { Spin, message } from 'antd';
import { getInstRecords } from '@/api/instance';
import { t as translate } from '@/i18n';
import { getStatusText } from '@/utils/ProcessUtil';
import { resUrl } from '@/utils/resource';
import { deepCopy, isEmpty } from '@/views/form/runtime';
import { ValueType } from '@/views/form/valueType';
import { CanvasEditorConfig, getFieldTextVal } from './printConfig';
import './print.css';

export interface PrintHandle {
  doPrint: () => void;
}

interface CustomPrintRenderProps {
  readonly?: boolean;
  permConf?: Record<string, string>;
  formFields: any[];
  config: CanvasEditorConfig;
  instance: any;
  onRenderOk?: () => void;
}

export const CustomPrintRender = forwardRef<PrintHandle, CustomPrintRenderProps>(
  ({ permConf = {}, formFields, config, instance, onRenderOk }, ref) => {
    const printerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);

    useImperativeHandle(ref, () => ({
      doPrint: () => editorRef.current?.command?.executePrint?.(),
    }));

    useEffect(() => {
      if (!printerRef.current || !config) return;
      let cancelled = false;
      setLoading(true);
      const fieldsObj: Record<string, any> = {};
      (formFields || []).forEach((field) => {
        fieldsObj[field.key] = field;
      });

      const recordNodes: Record<string, any[]> = {};
      const records: any[] = [];

      const doFillData = () => {
        if (cancelled || !printerRef.current) return;
        try {
          const editorConfig: CanvasEditorConfig = deepCopy(config);
          if (!editorConfig.data) editorConfig.data = { header: [], main: [], footer: [] };
          const formData = instance?.formData || {};
          const baseInfo = {
            instId: instance?.instId,
            instUserName: instance?.startUser?.name,
            instDeptName: instance?.startDept,
            instName: instance?.defineName,
            instTitle: instance?.title,
            instCode: instance?.code,
            instCreateTime: instance?.createTime,
            instEndTime: instance?.endTime,
            instStatusName: instance?.status,
            instVer: instance?.version,
            instPrintTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          };
          const ctx = { ...formData, ...baseInfo, ...recordNodes, nodeRecords: records };
          handlerDomData(editorConfig.data.main, ctx, fieldsObj);
          handlerDomData(editorConfig.data.header, ctx, fieldsObj);
          handlerDomData(editorConfig.data.footer, ctx, fieldsObj);
          const editor = new Editor(printerRef.current, deepCopy(editorConfig.data), editorConfig.options);
          editor.command.executeMode(EditorMode.PRINT);
          editorRef.current = editor;
          (window as any).wflowPrintRenderEditor = editor;
          setLoading(false);
          onRenderOk?.();
        } catch (error) {
          console.error(error);
          setLoading(false);
          message.error(translate('print.error.initEditorFailed'));
        }
      };

      getInstRecords(instance?.instId)
        .then((res) => {
          if (cancelled) return;
          (Array.isArray(res.data) ? res.data : []).forEach((node: any) => {
            recordNodes[node.id] = (node.actualUsers || []).map((v: any) => {
              const val = {
                nodeName: node.nodeName,
                nodeAssignee: v.assignee?.name,
                nodeComment: v.comment ? v.comment.text : '',
                nodeEndTime: v.endTime,
                nodeSignature: v.signature ? resUrl(v.signature) : '',
                nodeResult: getStatusText(v, instance?.isAgent, instance?.initiator?.name),
              };
              records.push(val);
              return val;
            });
          });
          doFillData();
        })
        .catch((err: any) => {
          if (cancelled) return;
          setLoading(false);
          console.error(err);
          message.error(err?.msg || translate('print.error.loadRecordsFailed'));
        });

      return () => {
        cancelled = true;
        try {
          editorRef.current?.destroy?.();
        } catch {
          /* ignore */
        }
        editorRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config, instance?.instId, formFields]);

    return <Spin spinning={loading}><div ref={printerRef} className="w-print-pages" style={{ width: '100%' }} /></Spin>;
  }
);

CustomPrintRender.displayName = 'CustomPrintRender';

/* ------------------------------------------------------------------ */

function processDynamicArray(
  data: any[],
  callback: (el: any, handler: { delete: () => void; insertAfter: (el: any) => void }, index: number) => void
) {
  if (!Array.isArray(data)) return;
  const initial = data.slice();
  for (let i = 0; i < initial.length; i += 1) {
    const el = initial[i];
    const currentIndex = data.indexOf(el);
    if (currentIndex === -1) continue;
    callback(
      el,
      {
        delete: () => data.splice(currentIndex, 1),
        insertAfter: (newEl: any) => data.splice(currentIndex + 1, 0, newEl),
      },
      currentIndex
    );
  }
}

function handlerDomData(doms: any[], ctx: Record<string, any>, fields: Record<string, any>) {
  if (!Array.isArray(doms)) return;
  processDynamicArray(doms, (el, handler) => {
    switch (el?.type) {
      case ElementType.CONTROL: {
        const val = ctx[el.control?.conceptId];
        if (val) el.control.value = [{ value: getFieldTextVal(val, fields[el.control?.conceptId]) }];
        break;
      }
      case ElementType.TABLE: {
        if (el._type === 'TableList' || el._type === 'FormList') {
          const columns: Record<string, any> = {};
          const data = ctx[el._key];
          const trList: any[] = [];
          (fields[el._key]?.props?.columns || []).forEach((col: any) => {
            columns[col.key] = col;
          });
          if (el.trList.length > 1) {
            (data || []).forEach((rowData: any) => {
              const row = deepCopy(el.trList[el.trList.length - 1]);
              row.tdList.forEach((cell: any) => {
                handlerDomData(cell.value, rowData, columns);
              });
              trList.push(row);
            });
            el.trList = [el.trList[0], ...trList];
          }
        } else if (el._type === 'NodeRecords') {
          const data = ctx.nodeRecords;
          const trList: any[] = [];
          if (el.trList.length > 1) {
            (data || []).forEach((rowData: any) => {
              const row = deepCopy(el.trList[el.trList.length - 1]);
              row.tdList.forEach((cell: any) => {
                handlerDomData(cell.value, rowData, fields);
              });
              trList.push(row);
            });
            el.trList = [el.trList[0], ...trList];
          }
        } else {
          el.trList.forEach((tr: any) => {
            tr.tdList.forEach((cell: any) => {
              handlerDomData(cell.value, ctx, fields);
            });
          });
        }
        break;
      }
      case ElementType.IMAGE: {
        const valImg = ctx[el._key];
        if (el.id === 'instIdQrCode') {
          const base = (import.meta as any).env?.VITE_MB_BASE_URL || '';
          QRCode.toDataURL(`${base}/instance?instId=${ctx.instId}`)
            .then((url) => {
              el.value = url;
            })
            .catch(() => undefined);
        } else if (el._type === ValueType.image) {
          if (isEmpty(valImg)) handler.delete();
          else el.value = resUrl(valImg);
        } else if (el._type === ValueType.imageArray) {
          if (isEmpty(valImg)) {
            handler.delete();
            break;
          }
          el.value = resUrl(valImg[0]?.url);
          const imgs = valImg
            .filter((_v: any, j: number) => j > 0)
            .map((v: any) => {
              const clone = deepCopy(el);
              clone.value = resUrl(v.url);
              return clone;
            });
          imgs.forEach((v: any) => handler.insertAfter(v));
        }
        break;
      }
      default:
        break;
    }
  });
}

export default CustomPrintRender;
