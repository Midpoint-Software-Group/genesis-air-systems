import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { format } from 'date-fns'
import { Plus, Clock, Truck, PlayCircle, CheckCircle, AlertTriangle, ClipboardList, Calendar, Map } from 'lucide-react'

const JOB_SECTION_NAV = [
  { to: '/jobs', label: 'List', icon: ClipboardList, exact: true },
  { to: '/dispatch', label: 'Board', icon: Calendar },
  { to: '/routes', label: 'Routes', icon: Map },
]

const COLUMNS = [
  { id: 'unassigned', label: 'Unassigned', icon: AlertTriangle, color: 'text-ember-600 bg-ember-50 border-ember-200' },
  { id: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'en_route', label: 'En Route', icon: Truck, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'completed', label: 'Completed Today', icon: CheckCircle, color: 'text-slate-700 bg-slate-50 border-slate-200' },
]

export function Dispatch() {
  const [jobs, setJobs] = useState([])
  const [techs, setTechs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const [jobsRes, techsRes] = await Promise.all([
      supabase.from('jobs')
        .select('id, job_number, customer_name, service_type, status, priority, scheduled_at, assigned_tech_name, address_line1, city, customer_type')
        .or(`status.in.(unassigned,scheduled,en_route,in_progress),and(status.eq.completed,scheduled_at.gte.${today},scheduled_at.lt.${tomorrow})`)
        .order('scheduled_at', { ascending: true }),
      supabase.from('technicians').select('id, full_name, current_status').eq('is_active', true)
    ])

    setJobs(jobsRes.data || [])
    setTechs(techsRes.data || [])
    setLoading(false)
  }

  const jobsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = jobs.filter(j => j.status === col.id)
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="Dispatch Board"
        subtitle={`${jobs.filter(j => j.status !== 'completed').length} active jobs · ${format(new Date(), 'EEEE, MMM d')}`}
        actions={
          <Link to="/jobs/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Job
          </Link>
        }
      />
      <SectionNav items={JOB_SECTION_NAV} />

      <div className="card p-4 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3">
          Technician Roster
        </div>
        <div className="flex gap-3 flex-wrap">
          {techs.length === 0 ? (
            <p className="text-xs text-slate-400">No active techs · <Link to="/settings/techs" className="text-ember-600 hover:underline">Add one</Link></p>
          ) : techs.map(tech => (
            <div key={tech.id} className="flex items-center gap-2 px-3 py-1.5 bg-navy-50 rounded">
              <div className={`w-1.5 h-1.5 rounded-full ${
                tech.current_status === 'on_job' ? 'bg-emerald-500' :
                tech.current_status === 'en_route' ? 'bg-amber-500' :
                tech.current_status === 'available' ? 'bg-blue-500' : 'bg-slate-300'
              }`}></div>
              <span className="text-xs text-navy-900 font-medium">{tech.full_name}</span>
              <span className="text-[10px] text-slate-500 capitalize">
                {tech.current_status?.replace('_', ' ') || 'off duty'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading dispatch board…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const Icon = col.icon
            const colJobs = jobsByStatus[col.id] || []
            return (
              <div key={col.id} className="bg-navy-50/40 rounded p-3 min-h-[400px]">
                <div className={`flex items-center justify-between mb-3 pb-2 border-b ${col.color.split(' ').filter(c => c.startsWith('border')).join(' ')}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={12} className={col.color.split(' ').find(c => c.startsWith('text'))} />
                    <span className="text-[10px] uppercase tracking-wider font-medium text-navy-900">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-white rounded px-1.5 py-0.5 border border-navy-100">
                    {colJobs.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colJobs.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic text-center py-4">No jobs</div>
                  ) : colJobs.map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`}
                      className="block bg-white rounded p-2.5 border border-navy-100 hover:border-ember-300 hover:shadow-card transition-all">
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-[10px] font-medium text-navy-700">{job.job_number}</span>
                        {job.priority === 'urgent' && (
                          <span className="text-[9px] text-red-700 bg-red-50 px-1 rounded">URGENT</span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-navy-900 mb-1 truncate">{job.customer_name}</div>
                      <div className="text-[11px] text-slate-600 mb-1.5 truncate">{job.service_type}</div>
                      {job.address_line1 && (
                        <div className="text-[10px] text-slate-500 mb-1.5 truncate">{job.address_line1}, {job.city}</div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-navy-50">
                        <div className="text-[10px] text-slate-500">
                          {job.scheduled_at && format(new Date(job.scheduled_at), 'h:mm a')}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {job.assigned_tech_name?.split(' ')[0] || (
                            <span className="text-ember-600">Assign…</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
