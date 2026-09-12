import React from 'react';
import { Collapse, Empty, Modal, Tooltip, Typography } from 'antd';
import { useTranslation } from '@/i18n';
import { CatalogGroups, type CatalogGroup, type CatalogItem } from '../catalog';
import { CatalogIcon } from './CatalogIcon';

export interface PalettePanelProps {
  onPick: (type: string) => void;
  locationText?: string;
  groups?: CatalogGroup[];
}

const CatalogItemButton: React.FC<{ item: CatalogItem; label: string; onClick: () => void }> = ({
  item,
  label,
  onClick,
}) => (
  <Tooltip title={item.type} mouseEnterDelay={0.4}>
    <button type="button" className="fd-palette-item" onClick={onClick}>
      <span className="fd-palette-icon">
        <CatalogIcon type={item.type} />
      </span>
      <span className="fd-palette-name">{label}</span>
    </button>
  </Tooltip>
);

const CatalogGroupList: React.FC<{ groups: CatalogGroup[]; onPick: (type: string) => void }> = ({ groups, onPick }) => {
  const { t } = useTranslation();
  return (
    <>
      {groups.map((group) => (
        <div key={group.labelKey} className="fd-palette-group">
          <div className="fd-palette-group-title">{t(group.labelKey)}</div>
          <div className="fd-palette-grid">
            {group.components.map((item) => (
              <CatalogItemButton key={item.type} item={item} label={t(item.nameKey)} onClick={() => onPick(item.type)} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export const PalettePanel: React.FC<PalettePanelProps> = ({ onPick, locationText, groups = CatalogGroups }) => {
  const { t } = useTranslation();
  return (
    <div className="fd-palette">
      <div className="fd-panel-title">{t('form.designer.palette.title')}</div>
      <div className="fd-palette-location">
        <Typography.Text type="secondary">
          {t('form.designer.palette.addLocation')}
          <Typography.Text strong>{locationText || t('form.designer.palette.topLevel')}</Typography.Text>
        </Typography.Text>
      </div>
      <div className="fd-palette-scroll">
        <Collapse
          ghost
          defaultActiveKey={groups.map((group) => group.labelKey)}
          items={groups.map((group) => ({
            key: group.labelKey,
            label: t(group.labelKey),
            children: (
              <div className="fd-palette-grid">
                {group.components.map((item) => (
                  <CatalogItemButton key={item.type} item={item} label={t(item.nameKey)} onClick={() => onPick(item.type)} />
                ))}
              </div>
            ),
          }))}
        />
        {groups.every((group) => group.components.length === 0) && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('form.designer.palette.empty')} />
        )}
      </div>
    </div>
  );
};

export interface CatalogPickerProps {
  open: boolean;
  title?: string;
  onCancel: () => void;
  onPick: (type: string) => void;
  groups?: CatalogGroup[];
}

export const CatalogPicker: React.FC<CatalogPickerProps> = ({
  open,
  title,
  onCancel,
  onPick,
  groups = CatalogGroups,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      title={title ?? t('form.designer.palette.chooseComponent')}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <div className="fd-catalog-picker">
        <CatalogGroupList groups={groups} onPick={onPick} />
      </div>
    </Modal>
  );
};

export default PalettePanel;
