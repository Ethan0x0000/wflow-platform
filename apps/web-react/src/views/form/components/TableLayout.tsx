import React from 'react';
import type { FormItemConfig } from '@/types/workflow';
import type { FormComponent } from '../types';
import { isMasterCell, toGrid } from './table-layout-utils';

const EMPTY_CELL_STYLE: React.CSSProperties = { minHeight: 40 };

/**
 * 表格布局容器：`columns[row][col]` 为单元格内子组件数组。
 * 通过 `cellSpans[row][col]` 支持 colspan/rowspan 合并（0 表示被合并覆盖），
 * `widths` 为列宽百分比，`heights` 为行高像素。
 */
export const TableLayout: FormComponent = ({ config, mode, renderField }) => {
  const props = config.props || {};
  const grid = toGrid(props);
  const borderWidthRaw = Number(props.borderWidth);
  const borderWidth = Number.isFinite(borderWidthRaw) && borderWidthRaw >= 0 ? borderWidthRaw : 1;
  const borderColor = String(props.borderColor || '#3C3F41');
  const fonts = Array.isArray(props.fonts) ? props.fonts.filter(Boolean) : [];
  const fontFamily = fonts.length > 0 ? String(fonts) : undefined;

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        marginBottom: 20,
        fontFamily,
      }}
    >
      <colgroup>
        {grid.widths.map((width, index) => (
          <col key={`table-col-${index}`} style={{ width: `${width}%` }} />
        ))}
      </colgroup>
      <tbody>
        {grid.columns.map((cells, rowIndex) => (
          <tr key={`table-row-${rowIndex}`} style={{ height: grid.heights[rowIndex] }}>
            {cells.map((cell, cellIndex) => {
              const span = grid.cellSpans[rowIndex]?.[cellIndex];
              if (!isMasterCell(span)) return null;
              const items: FormItemConfig[] = Array.isArray(cell) ? cell : [];
              return (
                <td
                  key={`table-cell-${rowIndex}-${cellIndex}`}
                  colSpan={span.col}
                  rowSpan={span.row}
                  style={{
                    border: `${borderWidth}px solid ${borderColor}`,
                    verticalAlign: 'top',
                    padding: 6,
                  }}
                >
                  {items.length > 0
                    ? items.map((item, itemIndex) => (
                        <div key={`${item.key || item.id}-${itemIndex}`}>{renderField(item)}</div>
                      ))
                    : mode === 'D' && <div style={EMPTY_CELL_STYLE} />}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableLayout;
