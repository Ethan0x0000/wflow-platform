import React from 'react';
import {
  UserOutlined,
  CheckCircleOutlined,
  SendOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ForkOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  ApartmentOutlined,
  DeploymentUnitOutlined,
  MergeCellsOutlined,
} from '@ant-design/icons';

export const renderNodeIcon = (type: string) => {
  switch (type) {
    case 'Start':
      return <UserOutlined />;
    case 'Approval':
      return <CheckCircleOutlined />;
    case 'Task':
      return <UserOutlined />;
    case 'Cc':
      return <SendOutlined />;
    case 'Waiting':
      return <ClockCircleOutlined />;
    case 'Trigger':
      return <ThunderboltOutlined />;
    case 'Exclusive':
      return <BranchesOutlined />;
    case 'Inclusive':
      return <DeploymentUnitOutlined />;
    case 'Parallel':
      return <NodeIndexOutlined />;
    case 'Subproc':
      return <ApartmentOutlined />;
    case 'Router':
      return <ForkOutlined />;
    case 'Join':
      return <MergeCellsOutlined />;
    default:
      return <ForkOutlined />;
  }
};

export default renderNodeIcon;
