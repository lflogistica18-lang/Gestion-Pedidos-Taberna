import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'

export function Layout() {
  return (
    <div className="layout">
      <main className="layout__content">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
