import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusPill } from '../../components/StatusPill'
import { format } from 'date-fns'
import { Clock, MapPin, AlertTriangle } from 'lucide-react'

export function TechJobsList() {
  const { techRecord } = useOutletContext()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => { if (techRecord?.id) load() }, [techRecord, filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('jobs')
      .select('id, job_number, customer_name, service_type, priority, status, scheduled_at, address_line1, city')
      .eq('assigned_tech_id', techRecord.id)
      .order('scheduled_at', { ascending: filter === 'completed' ? false : true })

    if (filter === 'active') query = query.in('status', ['scheduled', 'en_route', 'in_progress'])
    else if (filter === 'completed') query = query.eq('status', 'completed')

    const { data } = await query.limit(50)
    setJobs(data || [])
    setLoading(false)
  }

  if (!techRecord) return <div className="card p-6 text-center text-sm text-slate-600">Not linked to a tech profile</div>

  return (
    <div>
      <h1 className="font-serif text-2xl text-navy-900 mb-3">My Jobs</h1>

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {[
          { id: 'active', label: 'Active' },
          { id: 'completed', label: 'Completed' },
          { id: 'all', label: 'All' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={filter === f.id ? 'btn-navy text-xs whitespace-nowrap' : 'btn-ghost text-xs whitespace-nowrap'}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 text-center text-sm text-slate-400">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">No jobs in this view</div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <Link key={job.id} to={`/tech/jobs/${job.id}`}
              className="block bg-white rounded-md border border-navy-100 p-3 hover:shadow-card">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-medium text-slate-500">{job.job_number}</span>
                    <StatusPill status={job.status} />
                    {job.priority === 'urgent' && (
                      <span className="pill bg-red-100 text-red-800 inline-flex items-center gap-0.5">
                        <AlertTriangle size={9} /> URGENT
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-navy-900 text-sm">{job.customer_name}</div>
                  <div className="text-xs text-slate-600">{job.service_type}</div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs font-medium text-navy-900">{format(new Date(job.scheduled_at), 'h:mm a')}</div>
                  <div className="text-[10px] text-slate-500">{format(new Date(job.scheduled_at), 'MMM d')}</div>
                </div>
              </div>
              {job.address_line1 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                  <MapPin size={9} /> {job.address_line1}, {job.city}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
