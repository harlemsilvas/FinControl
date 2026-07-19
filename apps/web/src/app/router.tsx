import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layouts/app-shell';
import { DashboardPage } from '../pages/dashboard-page';
import { NotFoundPage } from '../pages/not-found-page';
import { ProtectedRoute } from '../auth/protected-route';
import { LoginPage } from '../pages/login-page';
import { MasterDataPage } from '../master-data/master-data-page';
import { SuppliersPage } from '../master-data/suppliers-page';
import { resources } from '../master-data/resources';
import { PayablesListPage } from '../payables/payables-list-page';
import { PayableFormPage } from '../payables/payable-form-page';
import { AgendaPage } from '../intelligence/agenda-page';
import { PlannedFeaturePage } from '../pages/planned-feature-page';
import { plannedFeatures } from '../pages/planned-features';
import { environment } from '../config/environment';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: '/',
          element: <AppShell />,
          children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },
            { path: 'dashboard', element: <DashboardPage /> },
            { path: 'agenda', element: <AgendaPage /> },
            { path: 'payables', element: <PayablesListPage /> },
            { path: 'payables/new', element: <PayableFormPage /> },
            { path: 'payables/:id', element: <PayableFormPage /> },
            { path: 'suppliers', element: <SuppliersPage /> },
            ...Object.entries(resources)
              .filter(([path]) => path !== 'suppliers')
              .map(([path, config]) => ({ path, element: <MasterDataPage config={config} /> })),
            ...plannedFeatures.map((feature) => ({
              path: feature.path,
              element: <PlannedFeaturePage feature={feature} />,
            })),
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  { basename: environment.VITE_BASE_PATH.replace(/\/$/, '') || '/' },
);