import React from 'react';
import { Button, Form, Input, Select, Space, Switch, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { WCodeEditor } from '@/components/WCodeEditor';
import { useTranslation } from '@/i18n';
import { formatMessage } from '@/utils/i18n';

export interface HttpValue {
  url?: string | null;
  method?: string;
  headers?: any[];
  params?: any[];
  bodyForms?: any[];
  dataPath?: string | null;
  label?: string | null;
  value?: string | null;
  data?: string | null;
  isJson?: boolean;
  preJs?: string | null;
  catchJs?: string | null;
  aftJs?: string | null;
  [key: string]: any;
}

export interface HttpConfigPanelProps {
  value?: HttpValue;
  onChange?: (value: HttpValue) => void;
  /** form：流程节点配置的纵向 Form.Item 布局；inline：表单设计器的紧凑布局 */
  layout?: 'form' | 'inline';
  methods?: string[];
  urlPlaceholder?: string;
  urlRequired?: boolean;
  headersLabel?: string;
  paramsLabel?: string;
  bodyFormsLabel?: string;
  showHeaders?: boolean;
  showParams?: boolean;
  showBodyForms?: boolean;
  /** 表单参数仅在 POST/PUT/PATCH 时显示（流程节点配置行为） */
  bodyFormsByMethod?: boolean;
  /** 请求体脚本 + JSON 开关 */
  showData?: boolean;
  showPreJs?: boolean;
  showCatchJs?: boolean;
  showAftJs?: boolean;
  showPath?: boolean;
  showMap?: boolean;
  /** KV 行同时写入 key 与 name（流程 payload 兼容） */
  kvDualKey?: boolean;
  /** 编辑前合并的默认值（流程默认结构） */
  defaults?: Partial<HttpValue>;
}

const mergeHttp = (defaults: Partial<HttpValue> | undefined, value: HttpValue | undefined): HttpValue => ({
  ...(defaults || {}),
  ...(value || {}),
});

/** HTTP 请求配置面板：流程节点与表单设计器共用实现（超集，默认值/布局/字段由 props 控制） */
export const HttpConfigPanel: React.FC<HttpConfigPanelProps> = ({
  value,
  onChange,
  layout = 'inline',
  methods = ['GET', 'POST', 'PUT', 'DELETE'],
  urlPlaceholder,
  urlRequired = false,
  headersLabel,
  paramsLabel,
  bodyFormsLabel,
  showHeaders = false,
  showParams = false,
  showBodyForms = false,
  bodyFormsByMethod = false,
  showData = false,
  showPreJs = false,
  showCatchJs = false,
  showAftJs = false,
  showPath = false,
  showMap = false,
  kvDualKey = false,
  defaults,
}) => {
  const { t } = useTranslation();
  const resolvedUrlPlaceholder = urlPlaceholder ?? t('workspace.http.urlPlaceholder');
  const resolvedHeadersLabel = headersLabel ?? t('workspace.http.headers');
  const resolvedParamsLabel = paramsLabel ?? t('workspace.http.params');
  const resolvedBodyFormsLabel = bodyFormsLabel ?? t('workspace.http.bodyForms');
  const http = mergeHttp(defaults, value);
  const patch = (delta: Partial<HttpValue>) => onChange?.({ ...http, ...delta });
  const methodOptions = methods.map((method) => ({ label: method, value: method }));
  const currentMethod = (http.method || 'GET').toUpperCase();

  const renderKv = (key: 'headers' | 'params' | 'bodyForms', label: string) => {
    const list: any[] = Array.isArray(http[key]) ? (http[key] as any[]) : [];
    const update = (index: number, delta: Record<string, any>) => {
      const next = list.map((item, i) => (i === index ? { ...item, ...delta } : item));
      patch({ [key]: next } as Partial<HttpValue>);
    };
    const add = () =>
      patch({ [key]: [...list, kvDualKey ? { key: '', value: '' } : { name: '', value: '' }] } as Partial<HttpValue>);
    const rows = (
      <>
        {list.map((item, index) => (
          <Space.Compact key={index} style={{ width: '100%' }}>
            <Input
              placeholder={t('workspace.http.name')}
              value={kvDualKey ? item.key ?? item.name ?? '' : item.name ?? ''}
              onChange={(e) =>
                update(index, kvDualKey ? { key: e.target.value, name: e.target.value } : { name: e.target.value })
              }
            />
            <Input placeholder={t('workspace.http.value')} value={item.value ?? ''} onChange={(e) => update(index, { value: e.target.value })} />
            <Button icon={<DeleteOutlined />} onClick={() => patch({ [key]: list.filter((_, i) => i !== index) } as Partial<HttpValue>)} />
          </Space.Compact>
        ))}
      </>
    );

    if (layout === 'form') {
      return (
        <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {rows}
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={add}>
              {formatMessage(t('workspace.http.addLabel'), { label })}
            </Button>
          </Space>
        </Form.Item>
      );
    }

    return (
      <div className="fd-http-section" key={key}>
        <div className="fd-http-section-head">
          <span>{label}</span>
          <Button size="small" type="link" icon={<PlusOutlined />} onClick={add}>
            {t('workspace.http.add')}
          </Button>
        </div>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {rows}
        </Space>
      </div>
    );
  };

  if (layout === 'form') {
    return (
      <Form layout="vertical" size="small">
        <Form.Item label={t('workspace.http.requestUrl')} required={urlRequired} style={{ marginBottom: 12 }}>
          <Input placeholder={resolvedUrlPlaceholder} value={http.url || ''} onChange={(e) => patch({ url: e.target.value })} />
        </Form.Item>
        <Form.Item label={t('workspace.http.requestMethod')} style={{ marginBottom: 12 }}>
          <Select value={http.method || 'GET'} onChange={(method) => patch({ method })} options={methodOptions} />
        </Form.Item>
        {showHeaders && renderKv('headers', resolvedHeadersLabel)}
        {showParams && renderKv('params', resolvedParamsLabel)}
        {showBodyForms && (!bodyFormsByMethod || ['POST', 'PUT', 'PATCH'].includes(currentMethod)) && renderKv('bodyForms', resolvedBodyFormsLabel)}
        {showData && (
          <>
            <Form.Item label={t('workspace.http.bodyScript')} style={{ marginBottom: 12 }}>
              <WCodeEditor
                lang="javascript"
                height={120}
                placeholder="return {}"
                value={http.data || ''}
                onChange={(next) => patch({ data: next })}
              />
            </Form.Item>
            <Form.Item label={t('workspace.http.jsonBody')} style={{ marginBottom: 12 }}>
              <Switch checked={Boolean(http.isJson)} onChange={(isJson) => patch({ isJson })} />
            </Form.Item>
          </>
        )}
        {showPreJs && (
          <Form.Item label={t('workspace.http.preScript')} style={{ marginBottom: 12 }}>
            <WCodeEditor lang="javascript" height={120} value={http.preJs || ''} onChange={(next) => patch({ preJs: next })} />
          </Form.Item>
        )}
        {showCatchJs && (
          <Form.Item label={t('workspace.http.catchScript')} style={{ marginBottom: 12 }}>
            <WCodeEditor lang="javascript" height={120} value={http.catchJs || ''} onChange={(next) => patch({ catchJs: next })} />
          </Form.Item>
        )}
        {showAftJs && (
          <Form.Item
            label={
              <Space>
                {t('workspace.http.aftScript')}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('workspace.http.aftTip')}
                </Typography.Text>
              </Space>
            }
          >
            <WCodeEditor lang="javascript" height={150} value={http.aftJs || ''} onChange={(next) => patch({ aftJs: next })} />
          </Form.Item>
        )}
      </Form>
    );
  }

  return (
    <div className="fd-http-editor">
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Select
          style={{ width: 100 }}
          value={http.method || 'GET'}
          onChange={(method) => patch({ method })}
          options={methodOptions}
        />
        <Input placeholder={resolvedUrlPlaceholder} value={http.url ?? ''} onChange={(e) => patch({ url: e.target.value })} />
      </Space.Compact>
      {showHeaders && renderKv('headers', resolvedHeadersLabel)}
      {showParams && renderKv('params', resolvedParamsLabel)}
      {showBodyForms && renderKv('bodyForms', resolvedBodyFormsLabel)}
      {showPath && (
        <Input
          style={{ marginTop: 8 }}
          placeholder={t('workspace.http.dataPath')}
          value={http.dataPath ?? ''}
          onChange={(e) => patch({ dataPath: e.target.value })}
        />
      )}
      {showMap && (
        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
          <Input
            placeholder={t('workspace.http.labelPath')}
            value={http.label ?? ''}
            onChange={(e) => patch({ label: e.target.value })}
          />
          <Input
            placeholder={t('workspace.http.valuePath')}
            value={http.value ?? ''}
            onChange={(e) => patch({ value: e.target.value })}
          />
        </Space.Compact>
      )}
    </div>
  );
};

const PROCESS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

const defaultHttp = (): HttpValue => ({
  url: '',
  method: 'GET',
  headers: [],
  params: [],
  bodyForms: [],
  data: '',
  isJson: true,
  preJs: null,
  catchJs: null,
  aftJs: null,
});

export interface ProcessHttpConfigProps {
  value?: any;
  onChange?: (value: any) => void;
  showAft?: boolean;
  serverMode?: boolean;
}

/** 流程节点 HTTP 配置：保留原 HttpConfig 的布局、文案与默认结构 */
export const ProcessHttpConfig: React.FC<ProcessHttpConfigProps> = ({ value, onChange, showAft = false, serverMode = false }) => {
  const { t } = useTranslation();
  return (
    <HttpConfigPanel
      value={value}
      onChange={onChange}
      layout="form"
      methods={PROCESS_METHODS}
      urlPlaceholder="https://"
      urlRequired
      headersLabel={t('workspace.http.headers')}
      paramsLabel={t('workspace.http.params')}
      bodyFormsLabel={t('workspace.http.bodyForms')}
      showHeaders
      showParams
      showBodyForms
      bodyFormsByMethod
      showData
      showPreJs={serverMode}
      showCatchJs={serverMode}
      showAftJs={showAft}
      kvDualKey
      defaults={defaultHttp()}
    />
  );
};

export interface FormHttpConfigProps {
  value?: HttpValue;
  onChange: (value: HttpValue) => void;
  showHeaders?: boolean;
  showParams?: boolean;
  showBody?: boolean;
  showPath?: boolean;
  showMap?: boolean;
}

/** 表单设计器 HTTP 配置：保留原 HttpConfigEditor 的布局、文案与 payload */
export const FormHttpConfig: React.FC<FormHttpConfigProps> = ({
  value,
  onChange,
  showHeaders,
  showParams,
  showBody,
  showPath,
  showMap,
}) => {
  const { t } = useTranslation();
  return (
    <HttpConfigPanel
      value={value}
      onChange={onChange}
      layout="inline"
      methods={['GET', 'POST', 'PUT', 'DELETE']}
      urlPlaceholder={t('workspace.http.urlPlaceholder')}
      headersLabel={t('workspace.http.headers')}
      paramsLabel={t('workspace.http.urlParams')}
      bodyFormsLabel={t('workspace.http.bodyForms')}
      showHeaders={showHeaders}
      showParams={showParams}
      showBodyForms={showBody}
      showPath={showPath}
      showMap={showMap}
    />
  );
};

export default HttpConfigPanel;
