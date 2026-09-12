import React from 'react';
import { Card, Space } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, RetweetOutlined } from '@ant-design/icons';
import { useTranslation } from '@/i18n';
import { NodeMeta, getNodeContent } from '../ProcessNodes';
import { renderNodeIcon } from './nodeIcon';

export interface BranchHeaderProps {
  gateway: any;
  gatewayPath: number[];
  branchIndex: number;
  onMove: (gatewayPath: number[], branchIndex: number, delta: number) => void;
  onCopy: (gatewayPath: number[], branchIndex: number) => void;
  onDelete: (gatewayPath: number[], branchIndex: number) => void;
  onOpen: (node: any, selectable?: boolean) => void;
}

export const BranchHeader: React.FC<BranchHeaderProps> = ({ gateway, gatewayPath, branchIndex, onMove, onCopy, onDelete, onOpen }) => {
  const { t } = useTranslation();
  const header = gateway.props?.branch?.[branchIndex];
  if (!header) return null;
  const isParallel = gateway.props?.type === 'Parallel';
  const isDefault = !isParallel && branchIndex === (gateway.branch || []).length - 1;
  const color = isDefault ? '#898989' : NodeMeta[gateway.props?.type]?.color || '#1BB782';
  const canMoveLeft = branchIndex > 0;
  const canMoveRight = branchIndex < (gateway.branch || []).length - (isParallel ? 1 : 2);
  return (
    <Card
      size="small"
      style={{ width: 240, borderRadius: 8, border: `1px solid ${color}`, cursor: isDefault ? 'default' : 'pointer' }}
      styles={{ header: { background: `${color}22`, minHeight: 32, padding: '4px 8px' } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={4}>
            {renderNodeIcon(gateway.props?.type)}
            <span style={{ fontSize: 12 }}>{header.name}</span>
          </Space>
          <Space size={4}>
            {canMoveLeft && (
              <ArrowLeftOutlined style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onMove(gatewayPath, branchIndex, -1); }} />
            )}
            {canMoveRight && (
              <ArrowRightOutlined style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onMove(gatewayPath, branchIndex, 1); }} />
            )}
            {!isDefault && (
              <>
                <RetweetOutlined style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onCopy(gatewayPath, branchIndex); }} />
                <DeleteOutlined style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onDelete(gatewayPath, branchIndex); }} />
              </>
            )}
          </Space>
        </div>
      }
      onClick={() => onOpen(header, !isDefault)}
    >
      <div style={{ fontSize: 12, color: '#666', minHeight: 28 }}>
        {isDefault ? t('process.designer.branchElse') : header.type === 'Parallel' ? t('process.designer.branchParallel') : getNodeContent(header)}
      </div>
    </Card>
  );
};

export default BranchHeader;
