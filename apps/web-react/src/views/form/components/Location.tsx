import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Space, Typography, message } from 'antd';
import { AimOutlined, CloseCircleFilled, EnvironmentOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { isEmpty } from '../runtime';
import type { FormComponentProps } from '../types';
import {
  loadAMap,
  readLngLat,
  resolveAMapKey,
  type AMapGeocoderInstance,
  type AMapMapInstance,
  type AMapMarkerInstance,
} from '../amapLoader';

export interface LocationValue {
  label: string;
  value: string;
}

/** 与 Vue 版一致的默认中心点（上海） */
const DEFAULT_CENTER: [number, number] = [121.59996, 31.197646];

function parseCoords(text?: string): [number, number] | null {
  if (!text) return null;
  const parts = text.split(',');
  if (parts.length !== 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

export const Location: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const placeholder = props.placeholder || t('form.component.location.placeholder');
  const amapKey = resolveAMapKey(props);
  const current: LocationValue | undefined =
    value && typeof value === 'object' ? (value as LocationValue) : undefined;
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [coords, setCoords] = useState('');
  const [locating, setLocating] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const coordsRef = useRef('');
  coordsRef.current = coords;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const markerRef = useRef<AMapMarkerInstance | null>(null);
  const geocoderRef = useRef<AMapGeocoderInstance | null>(null);

  const reverseGeocode = useCallback((lng: number, lat: number) => {
    geocoderRef.current?.getAddress([lng, lat], (status, result) => {
      if (status === 'complete' && result?.regeocode?.formattedAddress) {
        setLabel(result.regeocode.formattedAddress);
      }
    });
  }, []);

  const applyMapPosition = useCallback(
    (lng: number, lat: number) => {
      setCoords(`${lng},${lat}`);
      mapRef.current?.setCenter([lng, lat]);
      markerRef.current?.setPosition([lng, lat]);
      reverseGeocode(lng, lat);
    },
    [reverseGeocode]
  );

  /* 打开弹窗时懒加载高德地图；无 Key 或加载失败时保持原有回退交互 */
  useEffect(() => {
    if (!open || !amapKey) return;
    let cancelled = false;
    loadAMap(amapKey)
      .then((AMap) => {
        if (cancelled) return;
        const container = mapContainerRef.current;
        if (!container) return;
        const center = parseCoords(coordsRef.current) || DEFAULT_CENTER;
        const map = new AMap.Map(container, { center, zoom: 14 });
        const marker = new AMap.Marker({ position: center, draggable: true, cursor: 'move' });
        map.add(marker);
        map.on('click', (event) => {
          const next = readLngLat(event?.lnglat);
          if (next) applyMapPosition(next[0], next[1]);
        });
        marker.on('dragend', () => {
          const next = readLngLat(marker.getPosition());
          if (next) applyMapPosition(next[0], next[1]);
        });
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new AMap.Geocoder();
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, amapKey, applyMapPosition]);

  /* 关闭弹窗销毁地图实例，避免内存泄漏 */
  useEffect(() => {
    if (open) return;
    mapRef.current?.destroy();
    mapRef.current = null;
    markerRef.current = null;
    geocoderRef.current = null;
  }, [open]);

  const openModal = () => {
    setLabel(current?.label || '');
    setCoords(current?.value || '');
    setMapFailed(false);
    setOpen(true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      message.warning(t('form.component.location.unsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setCoords(`${longitude},${latitude}`);
        if (mapRef.current && markerRef.current) {
          mapRef.current.setCenter([longitude, latitude]);
          markerRef.current.setPosition([longitude, latitude]);
          reverseGeocode(longitude, latitude);
        }
        setLocating(false);
      },
      () => {
        message.warning(t('form.component.location.locateFailed'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOk = () => {
    const nextLabel = label.trim();
    if (isEmpty(nextLabel)) {
      message.warning(t('form.component.location.addressRequired'));
      return;
    }
    onChange({ label: nextLabel, value: coords.trim() });
    setOpen(false);
  };

  if (mode === 'V' || mode === 'R') {
    return <Typography.Text>{current?.label ? String(current.label) : ''}</Typography.Text>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {current?.label ? (
        <Typography.Text>{current.label}</Typography.Text>
      ) : (
        <Typography.Text type="secondary">{placeholder}</Typography.Text>
      )}
      {mode === 'E' && current?.label ? (
        <CloseCircleFilled
          style={{ color: '#bfbfbf', cursor: 'pointer' }}
          onClick={() => onChange(null)}
        />
      ) : null}
      <Button icon={<EnvironmentOutlined />} shape="round" size="small" onClick={openModal}>
        {t('form.component.location.choose')}
      </Button>
      <Modal
        title={t('form.component.location.modalTitle')}
        open={open}
        onOk={handleOk}
        onCancel={() => setOpen(false)}
        okText={t('form.common.confirm')}
        cancelText={t('form.common.cancel')}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {amapKey && !mapFailed ? (
            <div
              ref={mapContainerRef}
              style={{ height: 320, width: '100%', borderRadius: 6, overflow: 'hidden', background: '#f5f5f5' }}
            />
          ) : null}
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t('form.component.location.addressPlaceholder')}
            prefix={<EnvironmentOutlined />}
          />
          <Space size={8} wrap>
            <Button size="small" icon={<AimOutlined />} loading={locating} onClick={handleLocate}>
              {t('form.component.location.useBrowserLocation')}
            </Button>
            <Typography.Text type="secondary">
              {coords
                ? t('form.component.location.coords').replace('{coords}', coords)
                : t('form.component.location.noCoords')}
            </Typography.Text>
          </Space>
        </Space>
      </Modal>
    </div>
  );
};

export default Location;
