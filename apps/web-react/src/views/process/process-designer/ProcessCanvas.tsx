import React, { Fragment } from 'react';
import { Button, Space, message } from 'antd';
import { CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { deepClone } from '../processTree';
import { BranchHeader } from './BranchHeader';
import { InsertNodePopover } from './InsertNodePopover';
import { JoinRow } from './JoinRow';
import { NodeCard } from './NodeCard';
import type { ProcessDesignerApi } from './useProcessDesigner';

export interface ProcessCanvasProps {
  api: ProcessDesignerApi;
}

export const ProcessCanvas: React.FC<ProcessCanvasProps> = ({ api }) => {
  const { t } = useTranslation();
  const renderList = (list: any[], path: number[]): React.ReactNode => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {list.map((node, index) => {
          if (!node) return null;
          const key = node.id || `${path.join('_')}-${index}`;
          if (node.type === 'Join') {
            return (
              <Fragment key={key}>
                <JoinRow />
                {renderInsertButton(path, index)}
              </Fragment>
            );
          }
          if (node.type === 'Gateway') {
            const gatewayPath = [...path, index];
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0' }}>
                <Space size={8}>
                  <Button size="small" shape="round" onClick={() => api.addBranch(gatewayPath)} icon={<PlusOutlined />}>
                    {t('process.designer.addBranch')}
                  </Button>
                  {api.clipboard?.kind === 'branch' && (
                    <Button size="small" shape="round" onClick={() => api.pasteBranch(gatewayPath)}>
                      {t('process.designer.pasteBranch')}
                    </Button>
                  )}
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      api.storeClipboard({ kind: 'node', node: deepClone(node) });
                      message.success(t('process.designer.copyGatewaySuccess'));
                    }}
                  >
                    {t('process.designer.copyGateway')}
                  </Button>
                </Space>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, marginTop: 8 }}>
                  {(node.branch || []).map((body: any[], branchIndex: number) => (
                    <div
                      key={branchIndex}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: '1px dashed #cbd5e1',
                        background: '#fff',
                        minWidth: 280,
                      }}
                    >
                      <BranchHeader
                        gateway={node}
                        gatewayPath={gatewayPath}
                        branchIndex={branchIndex}
                        onMove={api.moveBranch}
                        onCopy={api.copyBranch}
                        onDelete={api.deleteBranch}
                        onOpen={api.openNode}
                      />
                      {renderInsertButton([...gatewayPath, branchIndex], -1)}
                      {renderList(body, [...gatewayPath, branchIndex])}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <Fragment key={key}>
              <NodeCard node={node} path={path} index={index} onOpen={api.openNode} onCopy={api.copyNode} onDelete={api.deleteNode} />
              {renderInsertButton(path, index)}
            </Fragment>
          );
        })}
      </div>
    );
  };

  const renderInsertButton = (path: number[], index: number) => (
    <InsertNodePopover
      path={path}
      index={index}
      openKey={api.insertOpenKey}
      setOpenKey={api.setInsertOpenKey}
      onInsert={api.insertNode}
      onPaste={api.pasteNode}
    />
  );

  return <>{renderList(api.nodes, [])}</>;
};

export default ProcessCanvas;
