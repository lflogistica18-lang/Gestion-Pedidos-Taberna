import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import PosPage from '@/modules/pos/pos-page'
import KdsPage from '@/modules/kds/kds-page'
import ProductsPage from '@/modules/products/products-page'
import ReportsPage from '@/modules/reports/reports-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/pos" replace /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'kds', element: <KdsPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
])
