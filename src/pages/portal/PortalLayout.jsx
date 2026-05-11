import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FullLogo } from '../../components/Logo'
import { LayoutDashboard, ClipboardList, Receipt, LogOut, User } from 'lucide-react'

const portalNav = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/portal/jobs', label: 'My Service', icon: ClipboardList },
  { to: '/portal/invoices', label: 'Invoices', icon: Receipt },
]

export function PortalLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      <header className="bg-white border-b border-navy-100 sticky top-0 z-40">
        <div className="px-6 h-14 flex items-center justify-between max-w-6xl mx-auto">
          <Link to="/portal">
            <FullLogo size="sm" />
          </Link>

          <nav className="flex items-center gap-1">
            {portalNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-ember-600 border-b-2 border-ember-600 rounded-b-none'
                      : 'text-navy-700 hover:bg-navy-50'
                  }`
                }
              >
                <item.icon size={14} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-navy-100">
              <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-medium">
                {profile?.full_name?.[0] || 'C'}
              </div>
              <span className="text-xs text-navy-900 hidden sm:inline">{profile?.full_name}</span>
              <button onClick={handleLogout} className="text-slate-500 hover:text-navy-900" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-navy-100 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs text-slate-500">
          <div>Need help? Call <a href="tel:" className="text-navy-700 hover:text-ember-600">Genesis Air Systems</a></div>
          <div>© 2026 Genesis Air Systems</div>
        </div>
      </footer>
    </div>
  )
}
