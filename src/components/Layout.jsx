import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { FullLogo } from './Logo'
import {
  LayoutDashboard, Users, ClipboardList, Inbox, Repeat,
  BarChart3, Settings, LogOut, Search, Receipt
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList },
  { to: '/requests', label: 'Requests', icon: Inbox },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/contracts', label: 'Contracts', icon: Repeat },
  { to: '/estimates', label: 'Billing', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }) => setPendingCount(count || 0))
  }, [])

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
                className={({ isActive }) => {
                  // Billing should highlight on /estimates and /invoices
                  const billingActive = item.label === 'Billing' &&
                    (window.location.pathname.startsWith('/estimates') || window.location.pathname.startsWith('/invoices'))
                  const active = isActive || billingActive
                  return `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors relative ${
                    active
                      ? 'text-ember-500 border-b-2 border-ember-500 rounded-b-none'
                      : 'text-navy-200 hover:text-white hover:bg-navy-800'
                  }`
                }}
              >
                <item.icon size={14} />
                {item.label}
                {item.to === '/requests' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-ember-600 rounded-full text-[9px] flex items-center justify-center text-white font-medium">{pendingCount}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-navy-800">
              <div className="w-7 h-7 rounded-full bg-navy-800 border border-ember-600 flex items-center justify-center text-ember-500 text-xs font-medium">
                {profile?.full_name?.[0] || 'U'}
              </div>
              <span className="text-xs text-navy-300 hidden sm:inline">{profile?.full_name}</span>
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
