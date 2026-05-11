import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ShieldLogo } from '../../components/Logo'
import { LayoutDashboard, ClipboardList, Clock, LogOut, User } from 'lucide-react'

const navItems = [
  { to: '/tech', label: 'Today', icon: LayoutDashboard, exact: true },
  { to: '/tech/jobs', label: 'Jobs', icon: ClipboardList },
  { to: '/tech/time', label: 'Time', icon: Clock },
]

export function TechLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [techRecord, setTechRecord] = useState(null)
  const [activeTimer, setActiveTimer] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    // Find the tech record linked to this user
    supabase.from('technicians').select('*').eq('user_id', profile.id).single()
      .then(({ data }) => {
        setTechRecord(data)
        if (data) {
          supabase.from('tech_time_log').select('*')
            .eq('technician_id', data.id).is('clock_out', null)
            .single().then(({ data: timer }) => setActiveTimer(timer))
        }
      })
  }, [profile])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      <header className="bg-navy-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/tech" className="flex items-center gap-2">
            <ShieldLogo size={28} />
            <div>
              <div className="font-serif text-base leading-none">Tech</div>
              <div className="text-[9px] text-navy-300 uppercase tracking-wider mt-0.5">Genesis Air</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {activeTimer && (
              <div className="flex items-center gap-1.5 bg-emerald-600 px-2 py-1 rounded text-xs font-medium animate-pulse">
                <Clock size={12} /> Clocked In
              </div>
            )}
            <div className="text-right">
              <div className="text-xs font-medium">{techRecord?.full_name || profile?.full_name}</div>
              <div className="text-[10px] text-navy-300">{techRecord?.current_status?.replace('_', ' ') || 'Available'}</div>
            </div>
            <button onClick={handleLogout} className="text-navy-200 hover:text-white p-1.5" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <Outlet context={{ techRecord, activeTimer, setActiveTimer }} />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 shadow-lg z-40">
        <div className="flex max-w-2xl mx-auto">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 ${
                  isActive ? 'text-ember-600 border-t-2 border-ember-600' : 'text-slate-500'
                }`
              }>
              <item.icon size={20} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
