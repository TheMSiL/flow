import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteFallback } from '@/components/layout/RouteFallback'
import { RootErrorBoundary } from '@/components/layout/RootErrorBoundary'

const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'))
const WorkflowsPage = lazy(() => import('@/features/workflows/WorkflowsPage'))
const BuilderPage = lazy(() => import('@/features/builder/BuilderPage'))
const RunsPage = lazy(() => import('@/features/runs/RunsPage'))
const RunDetailPage = lazy(() => import('@/features/runs/RunDetailPage'))
const IntegrationsPage = lazy(() => import('@/features/integrations/IntegrationsPage'))
const IntegrationDetailPage = lazy(
  () => import('@/features/integrations/IntegrationDetailPage'),
)
const TemplatesPage = lazy(() => import('@/features/templates/TemplatesPage'))
const TemplateDetailPage = lazy(() => import('@/features/templates/TemplateDetailPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const HelpPage = lazy(() => import('@/features/help/HelpPage'))
const NotFoundPage = lazy(() => import('@/features/help/NotFoundPage'))

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
)

const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: withSuspense(<OverviewPage />) },
      { path: 'workflows', element: withSuspense(<WorkflowsPage />) },
      { path: 'workflows/:id', element: withSuspense(<BuilderPage />) },
      { path: 'runs', element: withSuspense(<RunsPage />) },
      { path: 'runs/:id', element: withSuspense(<RunDetailPage />) },
      { path: 'integrations', element: withSuspense(<IntegrationsPage />) },
      { path: 'integrations/:slug', element: withSuspense(<IntegrationDetailPage />) },
      { path: 'templates', element: withSuspense(<TemplatesPage />) },
      { path: 'templates/:id', element: withSuspense(<TemplateDetailPage />) },
      { path: 'analytics', element: withSuspense(<AnalyticsPage />) },
      { path: 'settings', element: <Navigate to="/settings/general" replace /> },
      { path: 'settings/:tab', element: withSuspense(<SettingsPage />) },
      { path: 'help', element: withSuspense(<HelpPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]

export const router = createBrowserRouter(routes)
