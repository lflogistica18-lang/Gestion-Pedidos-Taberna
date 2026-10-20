import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { AuthGuard } from '@/shared/components/AuthGuard'
import { RutaCocina } from './RutaCocina'
import LoginPage from '@/modules/auth/LoginPage'
import PosPage from '@/modules/pos/pos-page'
import ProductsPage from '@/modules/products/products-page'
import OrdersPage from '@/modules/orders/orders-page'
import ReportsPage from '@/modules/reports/reports-page'
import ConfigPage from '@/modules/config/config-page'

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
      { index: true, element: <Navigate to="/reports" replace /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'kds', element: <RutaCocina /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'config', element: <ConfigPage /> },
    ],
  },
])
