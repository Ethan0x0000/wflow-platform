import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { MenuFrame } from '@/views/layout/MenuFrame';

const Dashboard = lazy(() => import('@/views/workspace/Dashboard'));
const TodoPage = lazy(() => import('@/views/workspace/TodoPage'));
const IdoPage = lazy(() => import('@/views/workspace/IdoPage'));
const SubmittedPage = lazy(() => import('@/views/workspace/SubmittedPage'));
const CcPage = lazy(() => import('@/views/workspace/CcPage'));
const ProcAgentPage = lazy(() => import('@/views/workspace/ProcAgentPage'));
const InitiateProcess = lazy(() => import('@/views/workspace/subs/InitiateProcess'));
const ModelManager = lazy(() => import('@/views/admin/ModelManager'));
const InstanceManager = lazy(() => import('@/views/admin/InstanceManager'));
const InstanceFormDataManager = lazy(() => import('@/views/admin/InstanceFormDataManager'));
const WorkHandover = lazy(() => import('@/views/admin/WorkHandover'));
const CustomFormComponentManager = lazy(() => import('@/views/admin/CustomFormComponentManager'));
const ModelDesigner = lazy(() => import('@/views/admin/ModelDesigner'));

const PageFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: 320,
    }}
  >
    <Spin size="large" />
  </div>
);

const lazyElement = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/workspace/dashboard" replace />,
  },
  {
    path: '/workspace',
    element: <MenuFrame />,
    children: [
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: lazyElement(Dashboard),
      },
      {
        path: 'todo',
        element: lazyElement(TodoPage),
      },
      {
        path: 'ido',
        element: lazyElement(IdoPage),
      },
      {
        path: 'submitted',
        element: lazyElement(SubmittedPage),
      },
      {
        path: 'cc',
        element: lazyElement(CcPage),
      },
      {
        path: 'agent',
        element: lazyElement(ProcAgentPage),
      },
      {
        path: 'model',
        element: lazyElement(ModelManager),
      },
      {
        path: 'components',
        element: lazyElement(CustomFormComponentManager),
      },
      {
        path: 'instance',
        element: lazyElement(InstanceManager),
      },
      {
        path: 'statistics',
        element: lazyElement(InstanceFormDataManager),
      },
      {
        path: 'handover',
        element: lazyElement(WorkHandover),
      },
      {
        path: 'startProc',
        element: lazyElement(InitiateProcess),
      },
    ],
  },
  {
    path: '/designer',
    element: lazyElement(ModelDesigner),
  },
  {
    path: '*',
    element: <Navigate to="/workspace/dashboard" replace />,
  },
]);
