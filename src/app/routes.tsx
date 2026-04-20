import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { AuthGuard } from '@/shared/components/AuthGuard'
import LoginPage from '@/modules/auth/LoginPage'
import PosPage from '@/modules/pos/pos-page'
import KdsPage from '@/modules/kds/kds-page'
import ProductsPage from '@/modules/products/products-page'
import OrdersPage from '@/modules/orders/orders-page'
import ReportsPage from '@/modules/reports/reports-page'

export const router = createBrowserRouter([
  // Ruta pública — login
  {
    path: '/login',
    element: <LoginPage />,
  },
  // Rutas protegidas — requieren sesión activa
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/pos" replace /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'kds', element: <KdsPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
])
