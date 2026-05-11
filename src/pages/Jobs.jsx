import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { StatusPill } from '../components/StatusPill'
import { format } from 'date-fns'
import { Plus, Search, ClipboardList, Filter } from 'lucide-react'

const STATUS_FILTERS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

export function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadJobs()
  }, [filter])

  async function loadJobs() {
    setLoading(true)
    let query = supabase
      .from('jobs')
      .select('id, job_number, customer_name, customer_type, service_type, status, priority, scheduled_at, assigned_tech_name, address_line1, city')
      .order('scheduled_at', { ascending: false })
      .limit(100)

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setJobs(data || [])
    setLoading(false)
  }

  const filtered = jobs.filter(j => {
    if (!search) return true
    const s = search.toLowerCase()
    return j.job_number?.toLowerCase().includes(s) ||
           j.customer_name?.toLowerCase().includes(s) ||
           j.service_type?.toLowerCase().includes(s)
  })

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} job${jobs.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/jobs/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Job
          </Link>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by job #, customer, or service..." className="input pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={filter === f.id ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading jobs…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="No jobs found"
            message="Create your first job to start dispatching techs and tracking service calls."
            action={
              <Link to="/jobs/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create Job
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Job #</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Customer</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Service</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Address</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Tech</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Scheduled</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(job => (
                <tr key={job.id} className="border-t border-navy-50 hover:bg-navy-50/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/jobs/${job.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{job.job_number}</Link>
                  </td>
                  <td className="py-3 px-2 text-xs text-navy-900">
                    {job.customer_name}
                    {job.customer_type === 'commercial' && <span className="ml-1.5 text-[9px] text-ember-600 uppercase">Comm</span>}
                  </td>
                  <td className="py-3 px-2 text-xs text-slate-600">{job.service_type}</td>
                  <td className="py-3 px-2 text-xs text-slate-500">{[job.address_line1, job.city].filter(Boolean).join(', ')}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{job.assigned_tech_name || <span className="text-slate-400 italic">Unassigned</span>}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{job.scheduled_at && format(new Date(job.scheduled_at), 'MMM d · h:mm a')}</td>
                  <td className="py-3 px-2"><StatusPill status={job.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
