import React from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from '@/i18n';
import { ValueType } from '@/views/form/valueType';
import { resUrl } from '@/utils/resource';

interface PrintFormFieldProps {
  config: any;
  permConf?: Record<string, string>;
  value: any;
}

export const PrintFormField: React.FC<PrintFormFieldProps> = ({ config, permConf = {}, value }) => {
  const { t } = useTranslation();
  const valueType = config?.valueType;
  if (value === undefined || value === null) {
    return <span />;
  }
  switch (valueType) {
    case ValueType.option:
      return <span>{value?.label}</span>;
    case ValueType.options:
      return <span>{(value || []).map((v: any) => v.label).join(t('print.common.listSeparator'))}</span>;
    case ValueType.timeRange:
    case ValueType.dateTimeRange:
      return <span>{(value || []).join(' ~ ')}</span>;
    case ValueType.orgArray:
      return <span>{(value || []).map((v: any) => v.name).join(t('print.common.listSeparator'))}</span>;
    case ValueType.imageArray:
      return (
        <span>
          {(value || []).map((img: any, index: number) => (
            <img key={index} style={{ marginRight: 5 }} src={`${resUrl(img.url)}?zip=true`} width={80} height={60} alt="" />
          ))}
        </span>
      );
    case ValueType.fileArray:
      return (
        <span>
          {(value || []).map((file: any, index: number) => (
            <a key={index} href={`${resUrl(file.url)}?name=${encodeURIComponent(file.name || '')}&download=true`} style={{ marginRight: 8 }}>
              {file.name}
            </a>
          ))}
        </span>
      );
    case ValueType.image:
      return value ? <img src={resUrl(value)} style={{ width: '20%' }} alt="" /> : <span />;
    case ValueType.array:
      return <span>{Array.isArray(value) ? value.join(t('print.common.listSeparator')) : value || ''}</span>;
    default:
      break;
  }
  if (config?.type === 'PhoneNumber') {
    return (
      <span>
        +{value?.prefix} {value?.number}
      </span>
    );
  }
  if (config?.type === 'TableList' || config?.type === 'FormList') {
    if (!(value || []).length) return <span />;
    const columns: any[] = config.props?.columns || [];
    return (
      <table className="w-print-subtable">
        <tbody>
          <tr>
            {columns.map((col) => (permConf[col.key] !== 'H' ? <td key={col.key}>{col.name}</td> : null))}
          </tr>
          {(value || []).map((row: any, index: number) => (
            <tr key={index}>
              {columns.map((col) =>
                permConf[col.key] !== 'H' ? (
                  <td key={col.key}>
                    <PrintFormField config={col} permConf={permConf} value={row[col.key]} />
                  </td>
                ) : null
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (config?.type === 'RichText' && value) {
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(value)) }} />;
  }
  return <span>{value || ''}</span>;
};

export default PrintFormField;
