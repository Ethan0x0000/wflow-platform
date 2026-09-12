import React, { useRef, useState } from 'react';
import { Alert, Button, Empty, Input, InputNumber, Rate, Select, Space, Tag, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import { isMasterCell, resizeColumnPairByPixels, toGrid } from '../components/table-layout-utils';
import { CatalogIcon } from './CatalogIcon';
import { isContainerItem, isListContainer, isSpanLayout, isTableLayout, sameTarget, type InsertTarget } from './helpers';

export interface CanvasOps {
  selectedId: string | null;
  activeTarget: InsertTarget;
  onSelect: (item: FormItemConfig, target: InsertTarget) => void;
  onSelectArea: (target: InsertTarget) => void;
  onRequestAdd: (target: InsertTarget) => void;
  onMove: (target: InsertTarget, index: number, dir: 'up' | 'down') => void;
  onCopy: (target: InsertTarget, index: number) => void;
  onDelete: (target: InsertTarget, index: number) => void;
  /** 拖动表格布局列宽（一次拖动只提交一次） */
  onResizeTableColumns: (containerId: string, widths: number[]) => void;
}

const staticOptions = (item: FormItemConfig) => {
  const raw = item.props?.static || item.props?.options || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((opt: any) =>
    typeof opt === 'object' && opt !== null
      ? { label: String(opt.label ?? opt.name ?? opt.value ?? ''), value: opt.value ?? opt.name ?? opt.label }
      : { label: String(opt), value: opt }
  );
};

const FieldPreview: React.FC<{ item: FormItemConfig }> = ({ item }) => {
  const { t } = useTranslation();
  const props = item.props || {};
  const rawPh = props.placeholder;
  let ph: string;
  if (Array.isArray(rawPh)) ph = rawPh.filter(Boolean).join(' ~ ');
  else if (rawPh) ph = String(rawPh);
  else ph = t('form.catalog.inputPlaceholder').replace('{name}', String(item.name ?? ''));
  switch (item.type) {
    case 'TextInput':
    case 'PhoneNumber':
    case 'IdCard':
      return <Input disabled placeholder={ph} />;
    case 'TextareaInput':
    case 'RichText':
      return <Input.TextArea disabled rows={2} placeholder={ph} />;
    case 'NumberInput':
      return <InputNumber disabled style={{ width: '100%' }} placeholder={ph} precision={props.precision} />;
    case 'CalcFormula':
      return (
        <Input
          disabled
          value={
            props.explain?.length
              ? t('form.designer.canvas.configuredFormula')
              : t('form.designer.canvas.unconfiguredFormula')
          }
          addonBefore={props.prefix || undefined}
          addonAfter={props.suffix || undefined}
        />
      );
    case 'Score':
      return (
        <Space>
          <Rate disabled count={Number(props.max) || 5} allowHalf={props.enableHalf === true} defaultValue={0} />
          {props.showScore !== false && (
            <Typography.Text type="secondary">{t('form.designer.canvas.score')}</Typography.Text>
          )}
        </Space>
      );
    case 'SinglePicker':
    case 'MultiplePicker':
      return (
        <Select
          disabled
          style={{ width: '100%' }}
          placeholder={ph}
          mode={item.type === 'MultiplePicker' ? 'multiple' : undefined}
          options={staticOptions(item)}
        />
      );
    case 'DateTimePicker':
      return <Input disabled placeholder={ph || props.format || 'YYYY-MM-DD'} />;
    case 'DateTimeRangePicker':
    case 'TimeRangePicker':
      return <Input disabled placeholder={ph} />;
    case 'TimePicker':
      return <Input disabled placeholder={ph || 'HH:mm'} />;
    case 'UserPicker':
    case 'DeptPicker':
      return (
        <Input
          disabled
          placeholder={props.multiple ? t('form.designer.canvas.selectUserDeptMultiple') : t('form.designer.canvas.selectUserDept')}
        />
      );
    case 'ImageUpload':
      return (
        <div className="fd-preview-upload">
          <PlusOutlined /> {t('form.designer.canvas.uploadImageMax').replace('{n}', String(props.maxNumber ?? '-'))}
        </div>
      );
    case 'FileUpload':
      return (
        <div className="fd-preview-upload">
          <PlusOutlined /> {t('form.designer.canvas.uploadFileMax').replace('{n}', String(props.maxNumber ?? '-'))}
        </div>
      );
    case 'Html':
      return (
        <div className="fd-preview-code">
          {String(props.code || '').slice(0, 120) || t('form.designer.canvas.htmlContent')}
        </div>
      );
    case 'LabelText':
      return (
        <div
          className="fd-preview-label-text"
          style={{ color: props.color, background: props.showBgc ? `${props.color}1a` : undefined }}
        >
          {props.placeholder || item.name}
        </div>
      );
    case 'AlertBlock':
      return (
        <Alert
          type={props.type === 'text' ? 'info' : props.type || 'info'}
          message={props.content || t('form.designer.canvas.alertText')}
          showIcon={!props.hideIcon}
          closable={false}
        />
      );
    case 'Text':
      return (
        <div style={{ textAlign: props.align || 'left', color: props.type && props.type !== 'text' ? props.type : undefined }}>
          {props.content || t('form.designer.canvas.staticText')}
        </div>
      );
    case 'Signature':
      return <div className="fd-preview-signature">{props.btnText || t('form.component.signature.defaultBtn')}</div>;
    case 'Provinces':
    case 'Location':
      return <Input disabled placeholder={ph || t('form.designer.canvas.pickPlaceholder')} />;
    case 'InstQuote':
      return (
        <Button disabled icon={<PlusOutlined />}>
          {props.addText || t('form.designer.canvas.selectProcess')}
        </Button>
      );
    case 'WebIframe':
      return (
        <div className="fd-preview-code">
          {t('form.designer.canvas.iframeUrl').replace('{url}', String(props.url || t('form.designer.canvas.noUrl')))}
        </div>
      );
    case 'VueSfc':
      return (
        <div className="fd-preview-code">
          {props.sfc ? t('form.designer.canvas.sfcConfigured') : t('form.designer.canvas.sfcUnconfigured')}
        </div>
      );
    case 'Leave':
      return (
        <Space wrap size={4}>
          {(props.typeOptions || []).map((opt: any) => (
            <Tag key={String(opt.value)}>{opt.label}</Tag>
          ))}
        </Space>
      );
    default:
      return <Input disabled placeholder={ph} />;
  }
};

interface CardHeadProps {
  item: FormItemConfig;
  index: number;
  total: number;
  target: InsertTarget;
  ops: CanvasOps;
}

const CardHead: React.FC<CardHeadProps> = ({ item, index, total, target, ops }) => {
  const { t } = useTranslation();
  return (
    <div
      className="fd-card-head"
      onClick={(e) => {
        e.stopPropagation();
        ops.onSelect(item, target);
      }}
    >
      <span className="fd-card-handle" title={t('form.designer.canvas.dragSort')}>
        <HolderOutlined />
      </span>
      <Tag color={isContainerItem(item) ? 'geekblue' : 'blue'} className="fd-card-type">
        {item.type}
      </Tag>
      <Typography.Text strong ellipsis className="fd-card-name">
        {item.name}
      </Typography.Text>
      {item.props?.required === true && <Tag color="error">{t('form.designer.canvas.required')}</Tag>}
      <Typography.Text type="secondary" className="fd-card-key" ellipsis>
        {item.key || item.id}
      </Typography.Text>
      <span className="fd-card-spacer" />
      <Space size={2} onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          type="text"
          icon={<ArrowUpOutlined />}
          disabled={index <= 0}
          onClick={() => ops.onMove(target, index, 'up')}
        />
        <Button
          size="small"
          type="text"
          icon={<ArrowDownOutlined />}
          disabled={index >= total - 1}
          onClick={() => ops.onMove(target, index, 'down')}
        />
        <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => ops.onCopy(target, index)} />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => ops.onDelete(target, index)} />
      </Space>
    </div>
  );
};

interface ItemCardProps extends CardHeadProps {}

const FieldCard: React.FC<ItemCardProps> = ({ item, index, total, target, ops }) => (
  <div
    className={`fd-card ${ops.selectedId === item.id ? 'fd-card-selected' : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      ops.onSelect(item, target);
    }}
  >
    <CardHead item={item} index={index} total={total} target={target} ops={ops} />
    <div className="fd-card-body">
      <FieldPreview item={item} />
    </div>
  </div>
);

interface CanvasListProps {
  items: FormItemConfig[];
  target: InsertTarget;
  ops: CanvasOps;
}

const CanvasList: React.FC<CanvasListProps> = ({ items, target, ops }) => {
  const { t } = useTranslation();
  return (
    <div
      className="fd-list"
      onClick={(e) => {
        e.stopPropagation();
        ops.onSelectArea(target);
      }}
    >
      {items.map((item, index) =>
        isContainerItem(item) ? (
          <ContainerCard key={item.id} item={item} index={index} total={items.length} target={target} ops={ops} />
        ) : (
          <FieldCard key={item.id} item={item} index={index} total={items.length} target={target} ops={ops} />
        )
      )}
      <button
        type="button"
        className={`fd-add-here ${sameTarget(ops.activeTarget, target) ? 'fd-add-here-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          ops.onSelectArea(target);
          ops.onRequestAdd(target);
        }}
      >
        <PlusOutlined /> {t('form.designer.canvas.addComponent')}
      </button>
    </div>
  );
};

const SpanBody: React.FC<{ item: FormItemConfig; ops: CanvasOps }> = ({ item, ops }) => {
  const columns = Array.isArray(item.props?.columns) ? (item.props.columns as FormItemConfig[][]) : [];
  const number = Math.max(1, Number(item.props?.number) || columns.length || 2);
  const gutter = Number(item.props?.gutter) || 0;
  return (
    <div className="fd-span" style={{ gap: gutter }}>
      {Array.from({ length: number }).map((_, ci) => {
        const list = Array.isArray(columns[ci]) ? columns[ci] : [];
        const target: InsertTarget = { kind: 'spanCol', containerId: item.id, col: ci };
        return (
          <div
            key={ci}
            className={`fd-span-col ${sameTarget(ops.activeTarget, target) ? 'fd-target-active' : ''}`}
          >
            <CanvasList items={list} target={target} ops={ops} />
          </div>
        );
      })}
    </div>
  );
};

const TableBody: React.FC<{ item: FormItemConfig; ops: CanvasOps }> = ({ item, ops }) => {
  const { t } = useTranslation();
  const props = item.props || {};
  const grid = toGrid(props);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const dragRef = useRef<{ index: number; startX: number; widths: number[] } | null>(null);
  const latestWidthsRef = useRef<number[] | null>(null);
  const [dragWidths, setDragWidths] = useState<number[] | null>(null);
  const widths = dragWidths || grid.widths;
  const borderWidth = Number(props.borderWidth) || 1;
  const borderColor = String(props.borderColor || '#d9d9d9');

  if (grid.heights.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('form.designer.canvas.setRowsCols')} />;
  }

  const startColumnResize = (event: React.MouseEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { index, startX: event.clientX, widths: grid.widths };
    const onMove = (moveEvent: MouseEvent) => {
      const start = dragRef.current;
      const table = tableRef.current;
      if (!start || !table) return;
      const next = resizeColumnPairByPixels(
        start.widths,
        start.index,
        moveEvent.clientX - start.startX,
        table.offsetWidth
      );
      latestWidthsRef.current = next;
      setDragWidths(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      dragRef.current = null;
      const latest = latestWidthsRef.current;
      latestWidthsRef.current = null;
      setDragWidths(null);
      if (latest) ops.onResizeTableColumns(item.id, latest);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <table
      ref={tableRef}
      className="fd-table-layout"
      style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        border: `${borderWidth}px solid ${borderColor}`,
      }}
    >
      <colgroup>
        {widths.map((width, index) => (
          <col key={`table-col-${index}`} style={{ width: `${width}%` }} />
        ))}
      </colgroup>
      <tbody>
        {grid.columns.map((cells, ri) => (
          <tr key={ri} style={{ height: grid.heights[ri] }}>
            {cells.map((cell, ci) => {
              const span = grid.cellSpans[ri]?.[ci];
              if (!isMasterCell(span)) return null;
              const target: InsertTarget = { kind: 'tableCell', containerId: item.id, row: ri, col: ci };
              return (
                <td
                  key={ci}
                  colSpan={span.col}
                  rowSpan={span.row}
                  className={sameTarget(ops.activeTarget, target) ? 'fd-target-active' : undefined}
                >
                  <CanvasList
                    items={Array.isArray(cell) ? cell : []}
                    target={target}
                    ops={ops}
                  />
                  {ci < cells.length - 1 ? (
                    <span
                      className="fd-table-col-resize"
                      onMouseDown={(event) => startColumnResize(event, ci)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ListColumnsBody: React.FC<{ item: FormItemConfig; ops: CanvasOps }> = ({ item, ops }) => {
  const { t } = useTranslation();
  const columns = Array.isArray(item.props?.columns) ? (item.props.columns as FormItemConfig[]) : [];
  const target: InsertTarget = { kind: 'listColumns', containerId: item.id };
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {columns.length === 0 && (
        <Typography.Text type="secondary">
          {item.type === 'TableList' ? t('form.designer.canvas.noColumns') : t('form.designer.canvas.noItems')}
        </Typography.Text>
      )}
      <div className="fd-columns">
        {columns.map((col, index) => (
          <div
            key={col.id}
            className={`fd-column-item ${ops.selectedId === col.id ? 'fd-column-selected' : ''}`}
            onClick={() => ops.onSelect(col, target)}
          >
            <CatalogIcon type={col.type || ''} />
            <span className="fd-column-name">{col.name}</span>
            <Tag color="blue">{col.type}</Tag>
            {col.props?.required === true && <Tag color="error">{t('form.designer.canvas.required')}</Tag>}
            <span
              className="fd-column-del"
              onClick={(e) => {
                e.stopPropagation();
                ops.onDelete(target, index);
              }}
            >
              <DeleteOutlined />
            </span>
          </div>
        ))}
      </div>
      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => ops.onRequestAdd(target)}>
        {t('form.designer.canvas.addColumn')}
      </Button>
    </div>
  );
};

interface ContainerCardProps extends CardHeadProps {}

const ContainerCard: React.FC<ContainerCardProps> = ({ item, index, total, target, ops }) => (
  <div
    className={`fd-card fd-card-container ${ops.selectedId === item.id ? 'fd-card-selected' : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      ops.onSelect(item, target);
    }}
  >
    <CardHead item={item} index={index} total={total} target={target} ops={ops} />
    <div className="fd-card-body">
      {isSpanLayout(item) ? (
        <SpanBody item={item} ops={ops} />
      ) : isTableLayout(item) ? (
        <TableBody item={item} ops={ops} />
      ) : isListContainer(item) ? (
        <ListColumnsBody item={item} ops={ops} />
      ) : null}
    </div>
  </div>
);

export interface CanvasProps {
  components: FormItemConfig[];
  ops: CanvasOps;
}

export const Canvas: React.FC<CanvasProps> = ({ components, ops }) => {
  const { t } = useTranslation();
  return (
    <div className="fd-canvas-inner" onClick={() => ops.onSelectArea({ kind: 'root' })}>
      {components.length === 0 ? (
        <Empty description={t('form.designer.canvas.emptyForm')} style={{ marginTop: 80 }} />
      ) : (
        <CanvasList items={components} target={{ kind: 'root' }} ops={ops} />
      )}
    </div>
  );
};

export default Canvas;
