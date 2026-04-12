import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/pos', label: 'Caja', icon: '💰' },
  { to: '/kds', label: 'Cocina', icon: '👨‍🍳' },
  { to: '/products', label: 'Productos', icon: '📦' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
]

export function NavBar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `navbar__item ${isActive ? 'navbar__item--active' : ''}`
          }
        >
          <span className="navbar__icon" aria-hidden="true">{icon}</span>
          <span className="navbar__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
