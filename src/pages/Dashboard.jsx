import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/StatCard'
import { StatusPill } from '../components/StatusPill'
import { PageHeader } from '../components/PageHeader'
import { format } from 'date-fns'
import {
  ClipboardList, Calendar, Users, DollarSign, Plus,
  AlertTriangle, FileText, ArrowRight
} from 'lucide-react'

export function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    openJobs: 0,
    scheduledToday: 0,
    techsActive: 0,
    revenueMTD: 0,
  })
  const [jobs, setJobs] = useState([])
  const [techs, setTechs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const { count: openJobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['unassigned', 'scheduled', 'en_route', 'in_progress'])

      const { data: todaysJobs } = await supabase
        .from('jobs')
        .select('id, job_number, customer_name, service_type, scheduled_at, status, assigned_tech_name')
        .gte('scheduled_at', today)
        .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0])
        .order('scheduled_at', { ascending: true })
        .limit(10)

      const { data: activeTechs } = await supabase
        .from('technicians')
        .select('id, full_name, current_status, current_job_id')
        .eq('is_active', true)

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .gte('created_at', monthStart)

      const revenueMTD = invoices?.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0
      const overdueCount = invoices?.filter(inv => inv.status === 'overdue').length || 0

      setStats({
        openJobs: openJobs || 0,
        scheduledToday: todaysJobs?.length || 0,
        techsActive: activeTechs?.filter(t => t.current_status !== 'off_duty').length || 0,
        revenueMTD,
        overdueCount,
      })
      setJobs(todaysJobs || [])
      setTechs(activeTechs || [])

      const alertList = []
      const urgentUnassigned = todaysJobs?.filter(j => j.status === 'urgent' && !j.assigned_tech_name)
      urgentUnassigned?.forEach(j => alertList.push({
        type: 'urgent',
        title: `Urgent job ${j.job_number} unassigned`,
        message: `${j.customer_name} · ${format(new Date(j.scheduled_at), 'h:mm a')}`,
      }))
      if (overdueCount > 0) alertList.push({
        type: 'warning',
        title: `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue`,
        message: 'Review payment status',
      })
      setAlerts(alertList)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Good morning${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        actions={
          <Link to="/jobs/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Job
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Open Jobs" value={stats.openJobs} sub={stats.openJobs > 0 ? `${stats.openJobs} active` : 'All caught up'} icon={ClipboardList} />
        <StatCard label="Scheduled Today" value={stats.scheduledToday} sub="See dispatch board" icon={Calendar} />
        <StatCard label="Techs Active" value={stats.techsActive} sub={stats.techsActive > 0 ? 'On the field' : 'No techs active'} icon={Users} />
        <StatCard
          label="Revenue MTD"
          value={`$${stats.revenueMTD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'On track'}
          warning={stats.overdueCount > 0}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Today's Job Board</span>
            <Link to="/jobs" className="text-xs text-navy-200 hover:text-white flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList size={28} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-3">No jobs scheduled for today</p>
              <Link to="/jobs/new" className="btn-secondary inline-flex items-center gap-1 text-sm">
                <Plus size={14} /> Schedule a Job
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-50">
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Job</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Customer</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Service</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Tech</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Time</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/jobs/${job.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-xs text-navy-900">{job.customer_name}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{job.service_type}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{job.assigned_tech_name || <span className="text-slate-400">Unassigned</span>}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{format(new Date(job.scheduled_at), 'h:mm a')}</td>
                    <td className="py-3 px-2"><StatusPill status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Techs on the field
            </div>
            {techs.length === 0 ? (
              <p className="text-xs text-slate-400">No active techs</p>
            ) : (
              <div className="space-y-2">
                {techs.slice(0, 5).map(tech => (
                  <div key={tech.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 text-[10px] font-medium flex items-center justify-center border border-navy-200">
                      {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-navy-900 truncate">{tech.full_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {tech.current_status === 'on_job' ? 'On job' :
                         tech.current_status === 'en_route' ? 'En route' :
                         tech.current_status === 'available' ? 'Available' : 'Off duty'}
                      </div>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      tech.current_status === 'on_job' ? 'bg-emerald-500' :
                      tech.current_status === 'en_route' ? 'bg-amber-500' :
                      tech.current_status === 'available' ? 'bg-blue-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {alerts.length > 0 && (
            <div className="bg-ember-50 border border-ember-200 rounded-md p-4">
              <div className="text-[10px] uppercase tracking-wider text-ember-800 font-medium mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Alerts
              </div>
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="text-xs">
                    <div className="font-medium text-ember-900">{alert.title}</div>
                    <div className="text-ember-700">{alert.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-navy-900 rounded-md p-4">
            <div className="text-[10px] uppercase tracking-wider text-navy-300 font-medium mb-3">
              Quick actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/jobs/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <Plus size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">New Job</div>
              </Link>
              <Link to="/customers/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <Users size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Add Customer</div>
              </Link>
              <Link to="/estimates/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <FileText size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Estimate</div>
              </Link>
              <Link to="/invoices/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <DollarSign size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Invoice</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
