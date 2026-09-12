import React from 'react';
import { Col, Row } from 'antd';
import type { FormItemConfig } from '@/types/workflow';
import { useTranslation } from '@/i18n';
import type { FormComponent } from '../types';

const PLACEHOLDER_STYLE: React.CSSProperties = {
  minHeight: 50,
  border: '1px dashed #d9d9d9',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(0, 0, 0, 0.35)',
  fontSize: 12,
};

/** 分栏布局容器：number 栏，每栏垂直堆叠子组件（默认作用域） */
export const SpanLayout: FormComponent = ({ config, mode, renderField }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const number = Math.min(4, Math.max(1, Math.floor(Number(props.number) || 2)));
  const rawColumns = Array.isArray(props.columns) ? props.columns : [];
  const columns: FormItemConfig[][] = Array.from({ length: number }, (_, index) =>
    Array.isArray(rawColumns[index]) ? (rawColumns[index] as FormItemConfig[]) : []
  );
  const span = Number(props.span) || 24;
  const colSpan = Math.max(1, Math.floor(span / number));
  const gutter =
    props.gutter === undefined || props.gutter === null || props.gutter === '' ? 5 : Number(props.gutter) || 0;

  return (
    <Row gutter={gutter} style={{ width: '100%' }}>
      {columns.map((items, columnIndex) => (
        <Col span={colSpan} key={`span-col-${columnIndex}`}>
          {items.length === 0
            ? mode === 'D' && <div style={PLACEHOLDER_STYLE}>{t('form.designer.canvas.dragHere')}</div>
            : items.map((item, itemIndex) => (
                <div key={`${item.key || item.id}-${itemIndex}`}>{renderField(item)}</div>
              ))}
        </Col>
      ))}
    </Row>
  );
};

export default SpanLayout;
