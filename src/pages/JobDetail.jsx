import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { PhotoGallery } from '../components/PhotoGallery'
import { syncJobToCalendar } from './CalendarConnect'
import { sendReviewRequest } from '../lib/reviewService'
import { format } from 'date-fns'
import {
  ArrowLeft, MapPin, Clock, User, Wrench, Phone,
  CheckCircle, PlayCircle, Truck, AlertTriangle, Calendar, Star, Mail
} from 'lucide-react'

const STATUS_TRANSITIONS = {
  unassigned: ['scheduled'],
  scheduled: ['en_route', 'cancelled'],
  en_route: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: ['scheduled'],
}

export function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)

  useEffect(() => {
    loadJob()
  }, [id])

  async function loadJob() {
    setLoading(true)
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single()
    setJob(data)
    setLoading(false)
  }

  async function updateStatus(newStatus) {
    setUpdating(true)
    setActionMsg(null)
    const wasNotCompleted = job.status !== 'completed'
    const updates = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString()
    await supabase.from('jobs').update(updates).eq('id', id)

    // Auto-send review request when status transitions to completed
    if (newStatus === 'completed' && wasNotCompleted && job.customer_id) {
      try {
        const { data: customer } = await supabase.from('customers').select('*').eq('id', job.customer_id).single()
        if (customer?.email) {
          await sendReviewRequest({ ...job, status: 'completed' }, customer)
          setActionMsg({ success: true, text: 'Job completed. Review request emailed to customer.' })
        }
      } catch (err) {
        console.error('Review request failed:', err)
        // non-fatal
      }
    }

    loadJob()
    setUpdating(false)
  }

  async function handleSyncCalendar() {
    setUpdating(true)
    setActionMsg(null)
    try {
      const result = await syncJobToCalendar(id)
      setActionMsg({ success: true, text: `Synced to Google Calendar.${result.event_link ? ' Opening event…' : ''}` })
      if (result.event_link) window.open(result.event_link, '_blank')
      loadJob()
    } catch (err) {
      setActionMsg({ error: true, text: err.message })
    } finally {
      setUpdating(false)
    }
  }

  async function handleSendReview() {
    setUpdating(true)
    setActionMsg(null)
    try {
      const { data: customer } = await supabase.from('customers').select('*').eq('id', job.customer_id).single()
      if (!customer?.email) throw new Error('Customer has no email on file')
      const result = await sendReviewRequest(job, customer)
      if (result?.skipped) setActionMsg({ success: true, text: result.reason || 'Already sent' })
      else setActionMsg({ success: true, text: 'Review request emailed to customer.' })
    } catch (err) {
      setActionMsg({ error: true, text: err.message })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading job…</div>
  if (!job) return <div className="p-8 text-center text-sm text-slate-400">Job not found</div>

  const nextStatuses = STATUS_TRANSITIONS[job.status] || []
  const statusIcons = {
    scheduled: Clock, en_route: Truck, in_progress: PlayCircle, completed: CheckCircle, cancelled: AlertTriangle,
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {job.job_number}
            <StatusPill status={job.status} />
            {job.priority === 'urgent' && (
              <span className="pill bg-red-100 text-red-800 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> Urgent
              </span>
            )}
          </span>
        }
        subtitle={`${job.service_type} · ${job.customer_name}`}
        actions={
          <>
            <button onClick={() => navigate('/jobs')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleSyncCalendar} disabled={updating}
              className="btn-secondary inline-flex items-center gap-2"
              title={job.google_event_id ? 'Update Google Calendar event' : 'Sync to Google Calendar'}>
              <Calendar size={16} /> {job.google_event_id ? 'Update Calendar' : 'Sync to Calendar'}
            </button>
            {job.status === 'completed' && (
              <button onClick={handleSendReview} disabled={updating}
                className="btn-secondary inline-flex items-center gap-2">
                <Star size={16} /> Send Review Request
              </button>
            )}
            {nextStatuses.map(s => {
              const Icon = statusIcons[s] || PlayCircle
              return (
                <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                  className={s === 'completed' ? 'btn-primary inline-flex items-center gap-2' : 'btn-navy inline-flex items-center gap-2'}>
                  <Icon size={16} />
                  Mark {s.replace('_', ' ')}
                </button>
              )
            })}
          </>
        }
      />

      {actionMsg && (
        <div className={`rounded p-3 mb-4 text-sm flex items-start gap-2 ${
          actionMsg.error ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {actionMsg.error ? <AlertTriangle size={14} className="mt-0.5" /> : <CheckCircle size={14} className="mt-0.5" />}
          {actionMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Job Details
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Service Type</div>
                <div className="text-navy-900 font-medium">{job.service_type}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Customer Type</div>
                <div className="text-navy-900 capitalize">{job.customer_type}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Scheduled</div>
                <div className="text-navy-900">{format(new Date(job.scheduled_at), 'EEEE, MMM d · h:mm a')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Estimated Duration</div>
                <div className="text-navy-900">{job.estimated_duration_minutes} minutes</div>
              </div>
            </div>
            {job.description && (
              <div className="mt-4 pt-4 border-t border-navy-50">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Description</div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Service Address
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin size={16} className="text-ember-600 mt-1 flex-shrink-0" />
              <div className="text-navy-900">
                {job.address_line1 && <div className="font-medium">{job.address_line1}</div>}
                {job.address_line2 && <div>{job.address_line2}</div>}
                {(job.city || job.state) && (
                  <div className="text-slate-600">
                    {[job.city, job.state].filter(Boolean).join(', ')} {job.zip_code}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(job.started_at || job.completed_at) && (
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
                Timeline
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-navy-300"></div>
                  <span className="text-slate-500">Created · </span>
                  <span className="text-navy-900">{format(new Date(job.created_at), 'MMM d, h:mm a')}</span>
                </div>
                {job.started_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-500">Started · </span>
                    <span className="text-navy-900">{format(new Date(job.started_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
                {job.completed_at && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-ember-600"></div>
                    <span className="text-slate-500">Completed · </span>
                    <span className="text-navy-900">{format(new Date(job.completed_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <PhotoGallery jobId={id} />
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Customer
            </div>
            <Link to={`/customers/${job.customer_id}`} className="block">
              <div className="font-medium text-sm text-navy-900 hover:text-ember-600">{job.customer_name}</div>
              <div className="text-xs text-slate-500 capitalize">{job.customer_type}</div>
            </Link>
          </div>

          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Assigned Tech
            </div>
            {job.assigned_tech_name ? (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-800 text-xs font-medium flex items-center justify-center border border-navy-200">
                  {job.assigned_tech_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium text-navy-900">{job.assigned_tech_name}</div>
                  <div className="text-[10px] text-slate-500">Technician</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 italic">Unassigned</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
