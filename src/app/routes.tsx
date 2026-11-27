import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/shared/components/Layout'
import { AuthGuard } from '@/shared/components/AuthGuard'
import { RutaCocina } from './RutaCocina'
import { RutaAdmin, RutaInicio } from './RutaAdmin'
import LoginPage from '@/modules/auth/LoginPage'
import PosPage from '@/modules/pos/pos-page'
import ProductsPage from '@/modules/products/products-page'
import OrdersPage from '@/modules/orders/orders-page'
import ReportsPage from '@/modules/reports/reports-page'
import ConfigPage from '@/modules/config/config-page'
import PersonalPage from '@/modules/personal/personal-page'
import FichaEmpleadaPage from '@/modules/personal/ficha-empleada-page'

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
      { index: true, element: <RutaInicio /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'kds', element: <RutaAdmin><RutaCocina /></RutaAdmin> },
      { path: 'products', element: <RutaAdmin><ProductsPage /></RutaAdmin> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'reports', element: <RutaAdmin><ReportsPage /></RutaAdmin> },
      { path: 'personal', element: <RutaAdmin><PersonalPage /></RutaAdmin> },
      { path: 'personal/:id', element: <RutaAdmin><FichaEmpleadaPage /></RutaAdmin> },
      { path: 'config', element: <RutaAdmin><ConfigPage /></RutaAdmin> },
    ],
  },
])
