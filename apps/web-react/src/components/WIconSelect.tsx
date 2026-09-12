import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Input, Empty, Spin } from 'antd';
import { useTranslation } from '@/i18n';

/** Curated defaults mirrored from the Vue `WIconSelect` preset list. */
export const FIXED_ICONS = [
  'bi:people-fill',
  'gridicons:multiple-users',
  'icon-park-solid:appointment',
  'icon-park-solid:people',
  'fluent:people-add-24-filled',
  'material-symbols:person-cancel-rounded',
  'ph:coffee-fill',
  'ph:sneaker-move-fill',
  'solar:money-bag-bold',
  'healthicons:money-bag',
  'solar:wallet-money-bold',
  'f7:money-yen-circle-fill',
  'entypo:aircraft',
  'entypo:aircraft-take-off',
  'mingcute:bus-2-fill',
  'mingcute:car-fill',
  'mingcute:train-fill',
  'fluent:handshake-20-filled',
  'icon-park-solid:buy',
  'mingcute:hand-card-fill',
  'icon-park-solid:time',
  'mdi:gift',
  'bxs:map',
  'ph:fingerprint-fill',
  'mdi:customer-service',
  'icon-park-solid:general-branch',
  'bx:bxs-purchase-tag',
  'mdi:notebook-edit',
  'simple-icons:opsgenie',
  'streamline:business-user-curriculum-solid',
  'fa6-solid:business-time',
  'mdi:google-my-business',
  'mdi:qqchat',
  'mdi:wechat',
  'bxs:message-square-detail',
  'mingcute:send-plane-fill',
  'tabler:mail-filled',
  'material-symbols:folder-open',
  'icon-park-solid:computer',
  'material-symbols:laptop-mac-outline',
  'fluent:phone-vibrate-20-filled',
  'fluent:form-28-filled',
  'file-icons:omnigraffle',
  'material-symbols:assignment-turned-in',
  'mingcute:card-refund-fill',
  'mingcute:wechat-miniprogram-fill',
  'whh:phonebookalt',
  'ri:database-2-fill',
  'ph:bank-fill',
  'material-symbols:school',
  'iconamoon:smiling-face-fill',
  'solar:sad-circle-bold',
  'ri:hearts-fill',
  'mdi:qrcode-scan',
  'fluent:calendar-cancel-16-filled',
  'ion:videocam',
  'material-symbols:play-circle',
  'jam:unsplash',
  'ph:film-reel-fill',
  'icon-park-solid:noodles',
  'dashicons:food',
  'fluent:food-cake-16-filled',
  'mdi:food',
  'material-symbols:delete',
  'material-symbols:edit-document',
  'material-symbols:chart-data',
  'ph:chart-pie-slice-fill',
];

export interface WIconSelectProps {
  value?: string;
  onChange?: (icon: string) => void;
  width?: number;
  height?: number;
}

export const WIconSelect: React.FC<WIconSelectProps> = ({
  value,
  onChange,
  width = 320,
  height = 400,
}) => {
  const [search, setSearch] = useState('');
  const [remote, setRemote] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!search.trim()) {
      setRemote([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(search.trim())}&limit=200`
        );
        const data = await response.json();
        setRemote(Array.isArray(data?.icons) ? data.icons : []);
      } catch (e) {
        setRemote([]);
      } finally {
        setLoading(false);
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const icons = useMemo(() => (search.trim() ? remote : FIXED_ICONS), [search, remote]);

  return (
    <div style={{ width }}>
      <Input
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('workspace.iconSearch.placeholder')}
      />
      <div style={{ height, overflow: 'auto', marginTop: 6 }} className="w-icon-select">
        {icons.length === 0 ? (
          <Spin spinning={loading}>
            <Empty description={loading ? t('workspace.iconSearch.searching') : t('workspace.iconSearch.empty')} />
          </Spin>
        ) : (
          <div className="w-icon-select-grid">
            {icons.map((icon) => (
              <span
                key={icon}
                className={`w-icon-select-item ${value === icon ? 'is-active' : ''}`}
                title={icon}
                onClick={() => onChange?.(icon)}
              >
                <Icon icon={icon} width={25} height={25} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WIconSelect;
