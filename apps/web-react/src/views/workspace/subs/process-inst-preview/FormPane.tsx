import React from 'react';
import { Alert, Empty } from 'antd';
import { FormRender } from '@/views/form/FormRender';
import { useTranslation } from '@/i18n';
import type { FormItemConfig, InstanceDetail } from '@/types/workflow';

export interface FormPaneProps {
  source: { components: FormItemConfig[] };
  inst: InstanceDetail | null;
  formRef: React.Ref<any>;
  readOnly: boolean;
}

export const FormPane: React.FC<FormPaneProps> = ({ source, inst, formRef: ref, readOnly }) => {
  const { t } = useTranslation();
  if (inst?.formType === 1) {
    return (
      <Alert
        type="info"
        showIcon
        message={t('workspace.formPane.codeForm')}
        description={t('workspace.formPane.codeFormDesc')}
      />
    );
  }
  if (!source.components.length) return <Empty description={t('workspace.formPane.noFields')} />;
  return (
    <FormRender
      ref={ref}
      config={source.components}
      value={inst?.formData || {}}
      permConf={(inst?.fieldPerm || {}) as Record<string, 'R' | 'E' | 'H' | 'D'>}
      readOnly={readOnly}
    />
  );
};

export default FormPane;
