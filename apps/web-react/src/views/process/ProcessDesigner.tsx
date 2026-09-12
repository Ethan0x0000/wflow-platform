import React from 'react';
import { NodeInspector } from './NodeInspector';
import { ProcessCanvas } from './process-designer/ProcessCanvas';
import { ProcessJsonDrawer } from './process-designer/ProcessJsonDrawer';
import { ProcessToolbar } from './process-designer/ProcessToolbar';
import { ProcessValidateModal } from './process-designer/ProcessValidateModal';
import { useProcessDesigner } from './process-designer/useProcessDesigner';
import { useTranslation } from '@/i18n';
import type { ProcessDesignerProps } from './process-designer/types';

export const ProcessDesigner: React.FC<ProcessDesignerProps> = (props) => {
  const { t } = useTranslation();
  const api = useProcessDesigner(props);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 600, background: '#f8fafc', padding: 24, overflow: 'auto' }}>
      <ProcessToolbar
        scale={api.scale}
        onOpenJson={() => api.setJsonOpen(true)}
        onValidate={api.runValidate}
        onZoomIn={() => api.setScale((s) => Math.min(150, s + 10))}
        onZoomOut={() => api.setScale((s) => Math.max(30, s - 10))}
      />

      <div style={{ transform: `scale(${api.scale / 100})`, transformOrigin: 'top center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ProcessCanvas api={api} />
        <div style={{ padding: '6px 16px', borderRadius: 16, background: '#cbd5e1', color: '#475569', fontSize: 12, fontWeight: 500 }}>{t('process.designer.end')}</div>
      </div>

      <NodeInspector
        open={api.inspectorOpen}
        node={api.activeNode}
        processNodes={api.nodes}
        formFields={api.formFields}
        onClose={() => {
          api.setInspectorOpen(false);
          api.setActiveNode(null);
        }}
        onSave={api.saveNode}
      />

      <ProcessJsonDrawer open={api.jsonOpen} nodes={api.nodes} onClose={() => api.setJsonOpen(false)} />

      <ProcessValidateModal open={api.validateOpen} errors={api.validateErrors} onClose={() => api.setValidateOpen(false)} />
    </div>
  );
};

export default ProcessDesigner;
