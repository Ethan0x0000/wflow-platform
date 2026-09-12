import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Divider, Dropdown, Form, Input, InputNumber, Modal, Radio, Space, Switch, Tag, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { DeleteOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import { validateEl } from '@/api/model';
import { CustomPrintDesigner, type PrintDesignerHandle } from '@/views/print/CustomPrintDesigner';
import { CODE_RULE_TOKENS, type FormSyncRule, type ProcSetting } from '@/components/modelDefaults';
import { SYNC_EVENT_OPTIONS } from './constants';
import { useTranslation } from '@/i18n';

export interface PlusPanelProps {
  value: ProcSetting;
  onChange: (value: ProcSetting) => void;
  formFields?: any[];
}

export const PlusPanel: React.FC<PlusPanelProps> = ({ value, onChange, formFields = [] }) => {
  const { t } = useTranslation();
  const patch = (part: Partial<ProcSetting>) => onChange({ ...value, ...part });
  const patchSync = (part: Partial<FormSyncRule>) => onChange({ ...value, formSync: { ...value.formSync, ...part } });
  const rules = Array.isArray(value.code.rules) ? value.code.rules : [];
  const setRules = (next: string[]) => onChange({ ...value, code: { ...value.code, rules: next } });
  const [printDesignerOpen, setPrintDesignerOpen] = useState(false);
  const printDesignerRef = useRef<PrintDesignerHandle | null>(null);
  const printDesignerConfig = useMemo(() => {
    if (!value.print.template) return undefined;
    try {
      return typeof value.print.template === 'string' ? JSON.parse(value.print.template) : (value.print.template as any);
    } catch {
      return undefined;
    }
  }, [value.print.template]);
  const confirmPrintTemplate = () => {
    const config = printDesignerRef.current?.getValue();
    if (config) patch({ print: { ...value.print, template: JSON.stringify(config) } });
    setPrintDesignerOpen(false);
  };

  const ruleMenuItems: MenuProps['items'] = CODE_RULE_TOKENS.map((token) => ({
    key: token.value || 'literal',
    label: token.label,
    onClick: () => setRules([...rules, token.value]),
  }));

  const addMapping = () => {
    patchSync({ fieldMapping: [...value.formSync.fieldMapping, { source: null, type: null, target: null }] });
  };
  const updateMapping = (index: number, part: Record<string, any>) => {
    const next = value.formSync.fieldMapping.map((item, i) => (i === index ? { ...item, ...part } : item));
    patchSync({ fieldMapping: next });
  };
  const removeMapping = (index: number) => {
    patchSync({ fieldMapping: value.formSync.fieldMapping.filter((_, i) => i !== index) });
  };

  const validateElExpression = async () => {
    if (!value.formSync.el) {
      message.error(t('admin.plusPanel.elRequired'));
      return;
    }
    try {
      const res = await validateEl(value.formSync.el);
      message.success(res.data || t('admin.plusPanel.elValid'));
    } catch (e: any) {
      message.error(e?.msg || t('admin.plusPanel.elInvalid'));
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0' }}>
      <Typography.Title level={4}>{t('design.nav.plus')}</Typography.Title>
      <Divider />
      <Form layout="vertical">
        <Card size="small" title={t('admin.plusPanel.serialTitle')} style={{ marginBottom: 16 }}>
          <Radio.Group
            value={value.code.type}
            onChange={(e) => onChange({ ...value, code: { ...value.code, type: e.target.value } })}
          >
            <Space direction="vertical">
              <Radio value="DEFAULT">{t('admin.plusPanel.serialDefault')}</Radio>
              <Radio value="CUSTOM">{t('admin.plusPanel.serialCustom')}</Radio>
            </Space>
          </Radio.Group>
          {value.code.type === 'CUSTOM' && (
            <div style={{ marginTop: 12 }}>
              {rules.map((rule, index) =>
                String(rule).includes('${') ? (
                  <Tag
                    key={`${rule}-${index}`}
                    closable
                    color="blue"
                    style={{ margin: 5, cursor: 'grab' }}
                    onClose={() => setRules(rules.filter((_, i) => i !== index))}
                  >
                    {String(rule).substring(2, String(rule).length - 1)}
                  </Tag>
                ) : (
                  <Input
                    key={`literal-${index}`}
                    size="small"
                    style={{ width: 120, margin: 5 }}
                    value={rule}
                    placeholder={t('admin.plusPanel.literalPlaceholder')}
                    onChange={(e) => setRules(rules.map((item, i) => (i === index ? e.target.value : item)))}
                  />
                )
              )}
              <Dropdown menu={{ items: ruleMenuItems }}>
                <Button size="small" icon={<PlusOutlined />} style={{ margin: 5 }}>
                  {t('admin.plusPanel.rule')}
                </Button>
              </Dropdown>
            </div>
          )}
        </Card>

        <Card size="small" title={t('admin.plusPanel.funcTitle')} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Checkbox checked={value.accessPerm} onChange={(e) => patch({ accessPerm: e.target.checked })}>
                {t('admin.plusPanel.accessPerm')}
              </Checkbox>
              <Typography.Text type="secondary" style={{ display: 'block' }}>
                {t('admin.plusPanel.accessPermDesc')}
              </Typography.Text>
            </div>
            <div>
              <Checkbox
                checked={value.discuss.enable}
                onChange={(e) => patch({ discuss: { ...value.discuss, enable: e.target.checked } })}
              >
                {t('admin.plusPanel.discussEnable')}
              </Checkbox>
              {value.discuss.enable && (
                <Checkbox
                  checked={value.discuss.endEnable}
                  onChange={(e) => patch({ discuss: { ...value.discuss, endEnable: e.target.checked } })}
                >
                  {t('admin.plusPanel.discussEnd')}
                </Checkbox>
              )}
              <Typography.Text type="secondary" style={{ display: 'block' }}>
                {t('admin.plusPanel.discussDesc')}
              </Typography.Text>
            </div>
            <div>
              <Checkbox
                checked={value.comment.enable}
                onChange={(e) => patch({ comment: { ...value.comment, enable: e.target.checked } })}
              >
                {t('admin.plusPanel.commentEnable')}
              </Checkbox>
              {value.comment.enable && (
                <Checkbox
                  checked={value.comment.endEnable}
                  onChange={(e) => patch({ comment: { ...value.comment, endEnable: e.target.checked } })}
                >
                  {t('admin.plusPanel.commentEnd')}
                </Checkbox>
              )}
              <Typography.Text type="secondary" style={{ display: 'block' }}>
                {t('admin.plusPanel.commentDesc')}
              </Typography.Text>
            </div>
            <div>
              <Checkbox checked={value.enableCancel} onChange={(e) => patch({ enableCancel: e.target.checked })}>
                {t('admin.plusPanel.enableCancel')}
              </Checkbox>
            </div>
            <div>
              <Checkbox
                checked={value.cancel.enable}
                onChange={(e) => patch({ cancel: { ...value.cancel, enable: e.target.checked } })}
              >
                {t('admin.plusPanel.cancelEnable')}
              </Checkbox>
              <InputNumber
                size="small"
                min={0}
                value={value.cancel.timeout}
                disabled={!value.cancel.enable}
                style={{ width: 80, margin: '0 6px' }}
                onChange={(val) => patch({ cancel: { ...value.cancel, timeout: Number(val || 0) } })}
              />
              {t('admin.plusPanel.withinDays')}
            </div>
            <div>
              <Checkbox
                checked={value.revise.enable}
                onChange={(e) => patch({ revise: { ...value.revise, enable: e.target.checked } })}
              >
                {t('admin.plusPanel.reviseEnable')}
              </Checkbox>
              <InputNumber
                size="small"
                min={0}
                value={value.revise.timeout}
                disabled={!value.revise.enable}
                style={{ width: 80, margin: '0 6px' }}
                onChange={(val) => patch({ revise: { ...value.revise, timeout: Number(val || 0) } })}
              />
              {t('admin.plusPanel.withinDays')}
            </div>
            <div>
              <Checkbox checked={value.enableAgent} onChange={(e) => patch({ enableAgent: e.target.checked })}>
                {t('admin.plusPanel.enableAgent')}
              </Checkbox>
            </div>
          </Space>
        </Card>

        <Card size="small" title={t('admin.plusPanel.approverTitle')} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Checkbox checked={value.enableUrging} onChange={(e) => patch({ enableUrging: e.target.checked })}>
              {t('admin.plusPanel.enableUrging')}
            </Checkbox>
            <Checkbox checked={value.enableRevoke} onChange={(e) => patch({ enableRevoke: e.target.checked })}>
              {t('admin.plusPanel.enableRevoke')}
            </Checkbox>
            <Checkbox checked={value.agreeSign} onChange={(e) => patch({ agreeSign: e.target.checked })}>
              {t('admin.plusPanel.agreeSign')}
            </Checkbox>
            <Checkbox checked={value.reloadUser} onChange={(e) => patch({ reloadUser: e.target.checked })}>
              {t('admin.plusPanel.reloadUser')}
            </Checkbox>
          </Space>
        </Card>

        <Card size="small" title={t('admin.plusPanel.dedupTitle')} style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">{t('admin.plusPanel.dedupDesc')}</Typography.Text>
          <Radio.Group
            value={value.deduplication.type}
            style={{ display: 'block', marginTop: 8 }}
            onChange={(e) => patch({ deduplication: { ...value.deduplication, type: e.target.value } })}
          >
            <Space direction="vertical">
              <Radio value="NONE">{t('admin.plusPanel.dedupNone')}</Radio>
              <Radio value="ONCE">{t('admin.plusPanel.dedupOnce')}</Radio>
              <Radio value="NEXT">{t('admin.plusPanel.dedupNext')}</Radio>
            </Space>
          </Radio.Group>
          {value.deduplication.type !== 'NONE' && (
            <>
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                {t('admin.plusPanel.dedupSkipDesc')}
              </Typography.Text>
              <Radio.Group
                value={value.deduplication.isSkip}
                onChange={(e) => patch({ deduplication: { ...value.deduplication, isSkip: e.target.value } })}
              >
                <Radio value={false}>{t('admin.plusPanel.skipAutoAgree')}</Radio>
                <Radio value={true}>{t('admin.plusPanel.skipTask')}</Radio>
              </Radio.Group>
            </>
          )}
        </Card>

        <Card size="small" title={t('admin.plusPanel.returnTitle')} style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">{t('admin.plusPanel.returnDesc')}</Typography.Text>
          <Radio.Group value={value.returnSkip} style={{ display: 'block', marginTop: 8 }} onChange={(e) => patch({ returnSkip: e.target.value })}>
            <Radio value={true}>{t('admin.plusPanel.returnContinue')}</Radio>
            <Radio value={false}>{t('admin.plusPanel.returnRestart')}</Radio>
          </Radio.Group>
        </Card>

        <Card size="small" title={t('admin.plusPanel.syncTitle')} style={{ marginBottom: 16 }}>
          <Checkbox checked={value.formSync.enable} onChange={(e) => patchSync({ enable: e.target.checked })}>
            {t('admin.plusPanel.syncEnable')}
          </Checkbox>
          {value.formSync.enable && (
            <div style={{ marginTop: 12 }}>
              <Space align="start" style={{ marginBottom: 12 }}>
                <span>{t('admin.plusPanel.syncTiming')}</span>
                <Checkbox.Group
                  options={SYNC_EVENT_OPTIONS.map((option) => ({ label: t(option.labelKey), value: option.value }))}
                  value={value.formSync.events}
                  onChange={(vals) => patchSync({ events: vals as string[] })}
                />
              </Space>
              <Form layout="vertical">
                <Form.Item label={t('admin.plusPanel.syncType')}>
                  <Radio.Group value={value.formSync.type} onChange={(e) => patchSync({ type: e.target.value })}>
                    <Radio value="DB">{t('admin.plusPanel.syncDb')}</Radio>
                    <Radio value="EL">{t('admin.plusPanel.syncEl')}</Radio>
                    <Radio value="API">{t('admin.plusPanel.syncApi')}</Radio>
                  </Radio.Group>
                  <div style={{ marginTop: 8 }}>
                    {value.formSync.type === 'DB' && (
                      <Input
                        value={value.formSync.tbName || ''}
                        placeholder={t('admin.plusPanel.syncTablePlaceholder')}
                        style={{ width: 360 }}
                        onChange={(e) => patchSync({ tbName: e.target.value || null })}
                      />
                    )}
                    {value.formSync.type === 'EL' && (
                      <Input
                        value={value.formSync.el || ''}
                        placeholder={t('admin.plusPanel.syncElPlaceholder')}
                        style={{ width: 500 }}
                        onChange={(e) => patchSync({ el: e.target.value || null })}
                        addonAfter={<a onClick={validateElExpression}>{t('admin.plusPanel.validate')}</a>}
                      />
                    )}
                    {value.formSync.type === 'API' && (
                      <Input
                        value={value.formSync.apiUrl || ''}
                        placeholder={t('admin.plusPanel.syncApiPlaceholder')}
                        style={{ width: 500 }}
                        addonBefore="POST"
                        addonAfter="/{event}"
                        onChange={(e) => patchSync({ apiUrl: e.target.value || null })}
                      />
                    )}
                  </div>
                </Form.Item>
                <Form.Item label={t('admin.plusPanel.preCover')}>
                  <Switch checked={value.formSync.preCover} onChange={(checked) => patchSync({ preCover: checked })} />
                  <Typography.Text type="secondary" style={{ display: 'block' }}>
                    {t('admin.plusPanel.preCoverDesc')}
                  </Typography.Text>
                  {value.formSync.preCover && (
                    <Input.TextArea
                      rows={6}
                      value={value.formSync.preJs || ''}
                      style={{ marginTop: 8 }}
                      onChange={(e) => patchSync({ preJs: e.target.value })}
                    />
                  )}
                </Form.Item>
                {value.formSync.type === 'DB' && (
                  <>
                    <Form.Item label={t('admin.plusPanel.syncRange')}>
                      <Radio.Group value={value.formSync.range} onChange={(e) => patchSync({ range: e.target.value })}>
                        <Radio value={false}>{t('admin.plusPanel.rangeMapped')}</Radio>
                        <Radio value={true}>{t('admin.plusPanel.rangeAll')}</Radio>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item label={t('admin.plusPanel.fieldMapping')}>
                      <div style={{ width: '100%' }}>
                        <Button type="link" icon={<PlusOutlined />} onClick={addMapping}>
                          {t('admin.plusPanel.addMapping')}
                        </Button>
                        {value.formSync.fieldMapping.map((mapping, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Input
                              style={{ width: 240 }}
                              placeholder={t('admin.plusPanel.mappingSource')}
                              value={mapping.source || ''}
                              onChange={(e) => updateMapping(index, { source: e.target.value || null })}
                            />
                            <span>{t('admin.plusPanel.mappingTo')}</span>
                            <Input
                              style={{ width: 260 }}
                              placeholder={t('admin.plusPanel.mappingTarget').replace('{source}', mapping.source || '')}
                              value={mapping.target || ''}
                              onChange={(e) => updateMapping(index, { target: e.target.value || null })}
                            />
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMapping(index)} />
                          </div>
                        ))}
                      </div>
                    </Form.Item>
                  </>
                )}
              </Form>
            </div>
          )}
        </Card>

        <Card size="small" title={t('admin.plusPanel.printTitle')}>
          <Radio.Group value={value.print.type} onChange={(e) => patch({ print: { ...value.print, type: e.target.value } })}>
            <Radio value="DEFAULT">{t('admin.plusPanel.printDefault')}</Radio>
            <Radio value="CUSTOM">{t('admin.plusPanel.printCustom')}</Radio>
          </Radio.Group>
          {value.print.type === 'CUSTOM' && (
            <>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button icon={<PrinterOutlined />} onClick={() => setPrintDesignerOpen(true)}>
                  {t('admin.plusPanel.openPrintDesigner')}
                </Button>
                <Typography.Text type="secondary">
                  {value.print.template ? t('admin.plusPanel.templateConfigured') : t('admin.plusPanel.templateNotConfigured')}
                </Typography.Text>
              </div>
              <Input.TextArea
                rows={4}
                style={{ marginTop: 12 }}
                placeholder={t('admin.plusPanel.templatePlaceholder')}
                value={value.print.template || ''}
                onChange={(e) => patch({ print: { ...value.print, template: e.target.value || null } })}
              />
            </>
          )}
        </Card>
      </Form>

      <Modal
        title={t('admin.plusPanel.printDesignerTitle')}
        open={printDesignerOpen}
        onCancel={() => setPrintDesignerOpen(false)}
        onOk={confirmPrintTemplate}
        okText={t('admin.plusPanel.saveTemplate')}
        width="95vw"
        style={{ top: 20 }}
        destroyOnHidden
      >
        {printDesignerOpen && (
          <CustomPrintDesigner ref={printDesignerRef} config={printDesignerConfig} formFields={formFields} />
        )}
      </Modal>
    </div>
  );
};

export default PlusPanel;
