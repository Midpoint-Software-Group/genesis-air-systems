import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { format } from 'date-fns'
import { Plus, Users, Phone, Mail, Wrench, Search } from 'lucide-react'

const STATUS_COLORS = {
  available: 'bg-blue-500',
  on_job: 'bg-emerald-500',
  en_route: 'bg-amber-500',
  on_break: 'bg-slate-400',
  off_duty: 'bg-slate-300',
}

const STATUS_LABELS = {
  available: 'Available',
  on_job: 'On Job',
  en_route: 'En Route',
  on_break: 'On Break',
  off_duty: 'Off Duty',
}

export function Team() {
  const [techs, setTechs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    loadTechs()
  }, [showInactive])

  async function loadTechs() {
    setLoading(true)
    let query = supabase.from('technicians')
      .select('id, full_name, email, phone, current_status, hire_date, is_active, hourly_rate, license_number')
      .order('full_name')
    if (!showInactive) query = query.eq('is_active', true)
    const { data } = await query
    setTechs(data || [])
    setLoading(false)
  }

  const filtered = techs.filter(t => {
    if (!search) return true
    const s = search.toLowerCase()
    return t.full_name?.toLowerCase().includes(s) ||
           t.email?.toLowerCase().includes(s) ||
           t.phone?.includes(s)
  })

  const activeCount = techs.filter(t => t.is_active).length

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${activeCount} active technician${activeCount !== 1 ? 's' : ''}`}
        actions={
          <Link to="/team/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Add Technician
          </Link>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search team…" className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
          Show inactive
        </label>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading team…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No technicians yet"
            message="Add your team — at least one tech is needed before you can assign jobs."
            action={
              <Link to="/team/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Add First Technician
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(tech => (
            <Link key={tech.id} to={`/team/${tech.id}`}
              className={`card p-4 hover:shadow-elevated transition-shadow ${!tech.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-sm font-medium border-2 border-navy-200">
                    {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-navy-900">{tech.full_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[tech.current_status] || 'bg-slate-300'}`}></div>
                      <span className="text-[10px] text-slate-500">{STATUS_LABELS[tech.current_status] || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                {!tech.is_active && (
                  <span className="pill pill-done text-[9px]">Inactive</span>
                )}
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-navy-50">
                {tech.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={11} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{tech.email}</span>
                  </div>
                )}
                {tech.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400 flex-shrink-0" />
                    <span>{tech.phone}</span>
                  </div>
                )}
                {tech.license_number && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Wrench size={11} className="text-slate-400 flex-shrink-0" />
                    <span>License: {tech.license_number}</span>
                  </div>
                )}
                {tech.hire_date && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    Joined {format(new Date(tech.hire_date), 'MMM yyyy')}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
