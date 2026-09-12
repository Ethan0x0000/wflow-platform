import React from 'react';
import { useTranslation } from '@/i18n';

export interface PrintFieldPaletteProps {
  fieldGroups: any[];
  onDragField: (field: any) => void;
}

export const PrintFieldPalette: React.FC<PrintFieldPaletteProps> = ({ fieldGroups, onDragField }) => {
  const { t } = useTranslation();

  return (
    <div className="w-print-vars">
      {fieldGroups.map((group, i) => (
        <div key={i} style={{ paddingBottom: 10 }}>
          <div className="w-print-vars-group-title">{group.name}</div>
          <div className="w-print-fields">
            {group.fields.map((field: any) => (
              <div key={field.symbol} draggable onDragEnd={() => onDragField(field)} title={t('print.designer.palette.dragHint')}>
                {field.name}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintFieldPalette;
