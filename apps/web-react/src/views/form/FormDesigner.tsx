import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Divider, Popconfirm, Segmented, message } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  MobileOutlined,
  MonitorOutlined,
  SettingOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { FormItemConfig } from '@/types/workflow';
import { createDefaultFormJson } from '@/components/modelDefaults';
import { exportText, resolveFormJson } from '@/utils/ProcessUtil';
import { useTranslation } from '@/i18n';
import { createFieldFromCatalog } from './catalog';
import { Canvas, type CanvasOps } from './designer/Canvas';
import { CatalogPicker, PalettePanel } from './designer/PalettePanel';
import { FieldInspector } from './designer/FieldInspector';
import { FormSettingsDrawer } from './designer/FormSettingsDrawer';
import { PreviewModal } from './designer/PreviewModal';
import {
  ROOT_TARGET,
  appendToTarget,
  cloneWithNewIds,
  deleteFromTarget,
  describeTarget,
  findNode,
  getTargetList,
  insertAfterInTarget,
  isListContainer,
  isSpanLayout,
  isTableLayout,
  mapNode,
  moveInTarget,
  type InsertTarget,
} from './designer/helpers';
import type { DsGroupOption } from './designer/types';
import './designer/designer.css';

export interface FormDesignerHandle {
  /** 展开表单字段（对齐 Vue getFields），deep=false 时不展开表格/多项表单列 */
  getFields: (deep?: boolean) => any[];
  /** 校验字段标识：返回错误信息数组，空数组表示通过 */
  validate: () => string[];
}

export interface FormDesignerProps {
  value?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
}

const SYS_VAR_KEYS = [
  { key: 'isStart', value: 'isStart', valueType: 'bool', type: 'DS' },
  { key: 'startUserId', value: 'startUserId', valueType: 'string', type: 'DS' },
  { key: 'startUsername', value: 'startUsername', valueType: 'string', type: 'DS' },
  { key: 'startUser', value: 'startUser', valueType: 'org', type: 'DS' },
  { key: 'startDeptId', value: 'startDeptId', valueType: 'string', type: 'DS' },
  { key: 'startDeptName', value: 'startDeptName', valueType: 'string', type: 'DS' },
  { key: 'startDept', value: 'startDept', valueType: 'orgArray', type: 'DS' },
];

export const FormDesigner = forwardRef<FormDesignerHandle, FormDesignerProps>(({ value, onChange }, ref) => {
  const { t } = useTranslation();
  const safeValue = useMemo<Record<string, any>>(() => {
    const defaults = createDefaultFormJson();
    const raw = value && typeof value === 'object' ? value : {};
    return {
      ...defaults,
      ...raw,
      conf: { ...defaults.conf, ...((raw as Record<string, any>).conf || {}) },
      datasource: Array.isArray((raw as Record<string, any>).datasource) ? (raw as Record<string, any>).datasource : [],
      components: Array.isArray((raw as Record<string, any>).components) ? (raw as Record<string, any>).components : [],
    };
  }, [value]);

  const components = safeValue.components as FormItemConfig[];
  const conf = safeValue.conf as Record<string, any>;
  const datasource = safeValue.datasource as any[];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<InsertTarget>(ROOT_TARGET);
  const [pickerTarget, setPickerTarget] = useState<InsertTarget | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<'pc' | 'mb'>('pc');
  const [historyLen, setHistoryLen] = useState(0);
  const historyRef = useRef<Record<string, any>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyChange = useCallback(
    (next: Record<string, any>) => {
      historyRef.current.push(safeValue);
      if (historyRef.current.length > 50) historyRef.current.shift();
      setHistoryLen(historyRef.current.length);
      onChange?.(next);
    },
    [onChange, safeValue]
  );

  const updateComponents = useCallback(
    (next: FormItemConfig[]) => applyChange({ ...safeValue, components: next }),
    [applyChange, safeValue]
  );

  const selectedItem = useMemo(
    () => (selectedId ? findNode(components, selectedId) || null : null),
    [components, selectedId]
  );

  const fields = useMemo(() => resolveFormJson(components, true), [components]);

  const duplicateKeys = useMemo(() => {
    const seen = new Set<string>();
    const duplicated = new Set<string>();
    fields.forEach((field: any) => {
      const key = field?.key;
      if (!key) return;
      if (seen.has(key)) duplicated.add(key);
      else seen.add(key);
    });
    return duplicated;
  }, [fields]);

  const dsOptions = useMemo<DsGroupOption[]>(() => {
    const list: DsGroupOption[] = datasource.map((ds) => ({
      label: ds?.name || t('form.designer.unnamedDatasource'),
      value: ds?.id || ds?.name,
      children: (Array.isArray(ds?.handler) ? ds.handler : [])
        .filter((handler: any) => handler?.value)
        .map((handler: any) => ({
          label: handler.label || handler.value,
          value: handler.value,
          valueType: handler.valueType || 'string',
          type: 'DS',
        })),
    }));
    list.push({
      label: t('form.designer.sysVarsTitle'),
      value: 'sysVars',
      children: SYS_VAR_KEYS.map((item) => ({ ...item, label: t(`form.designer.sysVars.${item.key}`) })),
    });
    return list;
  }, [datasource, t]);

  const optionDsOptions = useMemo(
    () =>
      dsOptions.flatMap((group) =>
        group.children
          .filter((child) => child.valueType === 'options')
          .map((child) => ({ label: `${group.label}.${child.label}`, value: child.value }))
      ),
    [dsOptions]
  );

  const handleSelectNode = useCallback((item: FormItemConfig, target: InsertTarget) => {
    setSelectedId(item.id);
    if (isSpanLayout(item)) setActiveTarget({ kind: 'spanCol', containerId: item.id, col: 0 });
    else if (isTableLayout(item)) setActiveTarget({ kind: 'tableCell', containerId: item.id, row: 0, col: 0 });
    else if (isListContainer(item)) setActiveTarget({ kind: 'listColumns', containerId: item.id });
    else setActiveTarget(target);
  }, []);

  const handleAdd = useCallback(
    (type: string, target?: InsertTarget | null) => {
      let useTarget = target || activeTarget;
      if (useTarget.kind !== 'root' && !findNode(components, useTarget.containerId)) useTarget = ROOT_TARGET;
      const item = createFieldFromCatalog(type);
      updateComponents(appendToTarget(components, useTarget, item));
      setSelectedId(item.id);
      if (isSpanLayout(item)) setActiveTarget({ kind: 'spanCol', containerId: item.id, col: 0 });
      else if (isTableLayout(item)) setActiveTarget({ kind: 'tableCell', containerId: item.id, row: 0, col: 0 });
      else if (isListContainer(item)) setActiveTarget({ kind: 'listColumns', containerId: item.id });
      else setActiveTarget(useTarget);
      setPickerTarget(null);
    },
    [activeTarget, components, updateComponents]
  );

  const canvasOps: CanvasOps = {
    selectedId,
    activeTarget,
    onSelect: handleSelectNode,
    onSelectArea: (target) => setActiveTarget(target),
    onRequestAdd: (target) => setPickerTarget(target),
    onMove: (target, index, dir) => updateComponents(moveInTarget(components, target, index, dir)),
    onCopy: (target, index) => {
      const list = getTargetList(components, target);
      const source = list[index];
      if (!source) return;
      updateComponents(insertAfterInTarget(components, target, index, cloneWithNewIds(source)));
    },
    onDelete: (target, index) => {
      updateComponents(deleteFromTarget(components, target, index));
      setSelectedId(null);
    },
    onResizeTableColumns: (containerId, widths) => {
      updateComponents(
        mapNode(components, containerId, (item) => ({ ...item, props: { ...item.props, widths } }))
      );
    },
  };

  const handlePatchNode = useCallback(
    (patch: Partial<FormItemConfig>) => {
      if (!selectedId) return;
      updateComponents(mapNode(components, selectedId, (item) => ({ ...item, ...patch })));
    },
    [components, selectedId, updateComponents]
  );

  const handlePatchProps = useCallback(
    (patch: Record<string, any>) => {
      if (!selectedId) return;
      updateComponents(
        mapNode(components, selectedId, (item) => ({ ...item, props: { ...item.props, ...patch } }))
      );
    },
    [components, selectedId, updateComponents]
  );

  const handlePatchConf = useCallback(
    (patch: Record<string, any>) => applyChange({ ...safeValue, conf: { ...conf, ...patch } }),
    [applyChange, conf, safeValue]
  );

  const handleChangeDatasource = useCallback(
    (next: any[]) => applyChange({ ...safeValue, datasource: next }),
    [applyChange, safeValue]
  );

  const clearForm = () => {
    applyChange(createDefaultFormJson());
    setSelectedId(null);
    setActiveTarget(ROOT_TARGET);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setHistoryLen(historyRef.current.length);
    onChange?.(prev);
  };

  const exportJson = () => {
    exportText(JSON.stringify(safeValue, null, 2), 'wflow-form.json');
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(String(ev.target?.result || ''));
        const defaults = createDefaultFormJson();
        applyChange({
          ...defaults,
          ...json,
          conf: { ...defaults.conf, ...(json?.conf || {}) },
          datasource: Array.isArray(json?.datasource) ? json.datasource : [],
          components: Array.isArray(json?.components) ? json.components : [],
        });
        setSelectedId(null);
        setActiveTarget(ROOT_TARGET);
        message.success(t('form.designer.importSuccess'));
      } catch {
        message.error(t('form.designer.importFailed'));
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  useImperativeHandle(
    ref,
    () => ({
      getFields: (deep = true) => resolveFormJson(components, deep),
      validate: () => {
        const errors: string[] = [];
        if (components.length === 0) return [t('form.designer.validateEmpty')];
        const keyMap = new Map<string, any>();
        resolveFormJson(components, true).forEach((field: any) => {
          const key = field?.key;
          const name = field?.name || field?.title || field?.id;
          if (!key || !String(key).trim()) {
            errors.push(t('form.designer.validateKeyEmpty').replace('{name}', String(name)));
            return;
          }
          if (keyMap.has(key)) {
            errors.push(
              t('form.designer.validateKeyDuplicate')
                .replace('{name}', String(name))
                .replace('{other}', String(keyMap.get(key).name))
                .replace('{key}', String(key))
            );
          } else {
            keyMap.set(key, field);
          }
        });
        return errors;
      },
    }),
    [components, t]
  );

  return (
    <div className="fd-designer">
      <div className="fd-toolbar">
        <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
          {t('form.designer.preview')}
        </Button>
        <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
          {t('form.designer.settings')}
        </Button>
        <Divider type="vertical" />
        <Button icon={<UndoOutlined />} disabled={historyLen === 0} onClick={undo}>
          {t('form.designer.undo')}
        </Button>
        <Divider type="vertical" />
        <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>
          {t('form.designer.importJson')}
        </Button>
        <Button icon={<DownloadOutlined />} onClick={exportJson}>
          {t('form.designer.exportJson')}
        </Button>
        <Popconfirm
          title={t('form.designer.clearConfirmTitle')}
          description={t('form.designer.clearConfirmDesc')}
          okText={t('form.common.confirm')}
          cancelText={t('form.common.cancel')}
          onConfirm={clearForm}
        >
          <Button danger icon={<DeleteOutlined />}>
            {t('form.designer.clear')}
          </Button>
        </Popconfirm>
        <span style={{ flex: 1 }} />
        <Segmented
          value={device}
          onChange={(next) => setDevice(next as 'pc' | 'mb')}
          options={[
            { label: t('form.designer.pc'), value: 'pc', icon: <MonitorOutlined /> },
            { label: t('form.designer.mb'), value: 'mb', icon: <MobileOutlined /> },
          ]}
        />
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>

      <div className="fd-main">
        <PalettePanel
          onPick={(type) => handleAdd(type)}
          locationText={describeTarget(components, activeTarget, ' · ')}
        />
        <div
          className="fd-canvas"
          onClick={() => {
            setSelectedId(null);
            setActiveTarget(ROOT_TARGET);
          }}
        >
          <div className={`fd-canvas-inner ${device === 'mb' ? 'is-phone' : ''}`}>
            <Canvas components={components} ops={canvasOps} />
          </div>
        </div>
        <FieldInspector
          item={selectedItem}
          duplicateKeys={duplicateKeys}
          onChange={handlePatchNode}
          onChangeProps={handlePatchProps}
          datasourceOptions={optionDsOptions}
        />
      </div>

      <CatalogPicker
        open={pickerTarget !== null}
        title={
          pickerTarget
            ? t('form.designer.addComponentWithTarget').replace('{target}', describeTarget(components, pickerTarget, ' · '))
            : t('form.designer.addComponent')
        }
        onCancel={() => setPickerTarget(null)}
        onPick={(type) => handleAdd(type, pickerTarget)}
      />

      <FormSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        conf={conf}
        datasource={datasource}
        fields={fields}
        dsOptions={dsOptions}
        onPatchConf={handlePatchConf}
        onChangeDatasource={handleChangeDatasource}
      />

      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} value={safeValue} />
    </div>
  );
});

FormDesigner.displayName = 'FormDesigner';

export default FormDesigner;
