import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullLogo } from './Logo'
import {
  LayoutDashboard, Users, ClipboardList, Calendar, FileText,
  Receipt, BarChart3, Settings, LogOut, Bell, Search
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList },
  { to: '/dispatch', label: 'Dispatch', icon: Calendar },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/estimates', label: 'Estimates', icon: FileText },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      <header className="bg-navy-900 border-b border-navy-950 sticky top-0 z-40">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link to="/dashboard">
            <FullLogo size="sm" dark />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-ember-500 border-b-2 border-ember-500 rounded-b-none'
                      : 'text-navy-200 hover:text-white hover:bg-navy-800'
                  }`
                }
              >
                <item.icon size={14} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button className="text-navy-200 hover:text-white relative" aria-label="Search">
              <Search size={18} />
            </button>
            <button className="text-navy-200 hover:text-white relative" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-ember-600 rounded-full text-[9px] flex items-center justify-center text-white font-medium">3</span>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-navy-800">
              <div className="w-7 h-7 rounded-full bg-navy-800 border border-ember-600 flex items-center justify-center text-ember-500 text-xs font-medium">
                {profile?.full_name?.[0] || 'U'}
              </div>
              <button onClick={handleLogout} className="text-navy-200 hover:text-white" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-navy-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-slate-500">
          <div>© 2026 Genesis Air Systems · All rights reserved</div>
          <div>Powered by Midpoint Accounting Group</div>
        </div>
      </footer>
    </div>
  )
}
