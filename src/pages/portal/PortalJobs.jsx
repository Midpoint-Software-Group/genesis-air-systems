import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { StatusPill } from '../../components/StatusPill'
import { format } from 'date-fns'
import { ClipboardList, Phone, Calendar } from 'lucide-react'

export function PortalJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.customer_id) {
      supabase.from('jobs')
        .select('id, job_number, service_type, status, scheduled_at, completed_at, assigned_tech_name, description')
        .eq('customer_id', profile.customer_id)
        .order('scheduled_at', { ascending: false })
        .then(({ data }) => {
          setJobs(data || [])
          setLoading(false)
        })
    }
  }, [profile])

  return (
    <div>
      <PageHeader
        title="My Service"
        subtitle={`${jobs.length} service record${jobs.length !== 1 ? 's' : ''}`}
        actions={
          <a href="tel:" className="btn-primary inline-flex items-center gap-2">
            <Phone size={16} /> Request Service
          </a>
        }
      />

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading service history…</div>
      ) : jobs.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="No service history yet"
            message="When you book your first service appointment, it'll appear here."
            action={
              <a href="tel:" className="btn-primary inline-flex items-center gap-2">
                <Phone size={16} /> Request Service
              </a>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card p-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-navy-900">{job.service_type}</h3>
                    <StatusPill status={job.status} />
                  </div>
                  <div className="text-[11px] text-slate-500">{job.job_number}</div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <div className="flex items-center gap-1 justify-end mb-0.5">
                    <Calendar size={11} />
                    {format(new Date(job.scheduled_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-[11px] text-slate-500">{format(new Date(job.scheduled_at), 'h:mm a')}</div>
                </div>
              </div>
              {job.description && (
                <p className="text-xs text-slate-600 mb-2 pt-2 border-t border-navy-50">{job.description}</p>
              )}
              {job.assigned_tech_name && (
                <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-navy-50">
                  Technician: <span className="text-navy-900">{job.assigned_tech_name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
