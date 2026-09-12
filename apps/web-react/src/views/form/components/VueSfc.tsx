import type { FC } from 'react';
import { useMemo } from 'react';
import { Alert } from 'antd';
import { useTranslation } from '@/i18n';
import { useDefaultValue } from '../runtime';
import { hostComponentCodes, resolveHostFormComponent } from '../hostRegistry';
import type { FormComponentProps } from '../types';

export const VueSfc: FC<FormComponentProps> = (props) => {
  const { t } = useTranslation();
  const { config, mode, value, onChange } = props;
  const configProps = config.props || {};
  const sfc = typeof configProps.sfc === 'string' ? configProps.sfc : '';
  const mbSfc = typeof configProps.mbSfc === 'string' ? configProps.mbSfc : '';

  useDefaultValue(config, mode, value, onChange);

  const HostComponent = useMemo(() => resolveHostFormComponent(config), [config]);
  if (HostComponent) {
    return <HostComponent {...props} />;
  }

  const hasValue = value !== undefined && value !== null && value !== '';
  const candidateCodes = hostComponentCodes(config).filter(
    (code) => code !== sfc && code !== mbSfc && code.length <= 64 && !code.includes('<')
  );

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message={t('form.component.vueSfc.notRegistered')}
        description={
          <div>
            <div>
              {sfc.trim() ? t('form.component.vueSfc.sfcConfigured') : t('form.component.vueSfc.unconfigured')}
            </div>
            {mbSfc.trim() ? <div>{t('form.component.vueSfc.mbSfcConfigured')}</div> : null}
            {candidateCodes.length > 0 ? (
              <div>{t('form.component.vueSfc.unmatchedCodes').replace('{codes}', candidateCodes.join('、'))}</div>
            ) : null}
            <div>
              {t('form.component.vueSfc.registerHint')}
            </div>
          </div>
        }
      />
      {hasValue ? (
        <pre
          style={{
            marginTop: 8,
            marginBottom: 0,
            padding: 8,
            background: '#f5f5f5',
            borderRadius: 4,
            maxHeight: 240,
            overflow: 'auto',
          }}
        >
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </div>
  );
};

export default VueSfc;
