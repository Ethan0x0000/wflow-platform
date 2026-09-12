import React from 'react';
import { Card, Space, Tooltip } from 'antd';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { NodeMeta, getNodeContent } from '../ProcessNodes';
import { renderNodeIcon } from './nodeIcon';

export interface NodeCardProps {
  node: any;
  path: number[];
  index: number;
  onOpen: (node: any) => void;
  onCopy: (node: any) => void;
  onDelete: (path: number[], index: number) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, path, index, onOpen, onCopy, onDelete }) => {
  const { t } = useTranslation();
  const color = NodeMeta[node.type]?.color || '#8c8c8c';
  const isStart = node.type === 'Start';
  return (
    <Card
      hoverable
      size="small"
      style={{ width: 250, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
      styles={{ header: { background: color, color: '#fff', minHeight: 34, padding: '6px 10px' } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={6}>
            {renderNodeIcon(node.type)}
            <span style={{ fontSize: 13 }}>{node.name}</span>
          </Space>
          {!isStart && (
            <Space size={6}>
              <Tooltip title={t('process.designer.copyNode')}>
                <CopyOutlined
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(node);
                  }}
                />
              </Tooltip>
              <Tooltip title={t('process.designer.deleteNode')}>
                <DeleteOutlined
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(path, index);
                  }}
                />
              </Tooltip>
            </Space>
          )}
        </div>
      }
      onClick={() => onOpen(node)}
    >
      <div style={{ fontSize: 12, color: '#666', minHeight: 30 }}>{getNodeContent(node) || t('process.designer.configureHint')}</div>
    </Card>
  );
};

export default NodeCard;
