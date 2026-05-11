import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { EmptyState } from '../components/EmptyState'
import { format } from 'date-fns'
import {
  Inbox, CheckCircle, XCircle, Calendar, AlertTriangle,
  Phone, Mail, Wind, Wrench, Send, X
} from 'lucide-react'

const PRIORITY_BADGES = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-600',
}

export function ServiceRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [techs, setTechs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [convertingRequest, setConvertingRequest] = useState(null)

  useEffect(() => {
    loadData()
  }, [filter])

  async function loadData() {
    setLoading(true)
    let query = supabase.from('service_requests')
      .select('*, equipment:equipment_id(nickname, equipment_type, make, model)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const [{ data: reqs }, { data: t }] = await Promise.all([
      query,
      supabase.from('technicians').select('id, full_name').eq('is_active', true).order('full_name'),
    ])

    setRequests(reqs || [])
    setTechs(t || [])
    setLoading(false)
  }

  async function declineRequest(id) {
    if (!confirm('Decline this service request?')) return
    await supabase.from('service_requests').update({ status: 'declined' }).eq('id', id)
    loadData()
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const urgentPending = requests.filter(r => r.status === 'pending' && r.priority === 'urgent').length

  return (
    <div>
      <PageHeader
        title="Service Requests"
        subtitle={`${pendingCount} pending${urgentPending > 0 ? ` · ${urgentPending} urgent` : ''}`}
      />

      <div className="flex gap-1 mb-4">
        {['pending', 'scheduled', 'declined', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={filter === s ? 'btn-navy text-xs px-3 py-1.5 capitalize' : 'btn-ghost text-xs capitalize'}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Inbox}
            title="No service requests"
            message={filter === 'pending' ? 'No pending requests right now.' : `No ${filter} requests.`}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className={`card p-4 ${
              req.priority === 'urgent' ? 'border-l-4 border-l-red-500' :
              req.priority === 'high' ? 'border-l-4 border-l-orange-500' :
              req.status === 'pending' ? 'border-l-4 border-l-ember-500' : ''
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-navy-900">{req.service_type}</h3>
                    <span className={`pill ${PRIORITY_BADGES[req.priority]}`}>
                      {req.priority === 'urgent' && <AlertTriangle size={9} className="inline mr-0.5" />}
                      {req.priority.toUpperCase()}
                    </span>
                    <StatusPill status={req.status} />
                  </div>
                  <div className="text-sm text-navy-700 font-medium">{req.customer_name}</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {format(new Date(req.created_at), 'MMM d, h:mm a')}
                </div>
              </div>

              {req.description && (
                <p className="text-sm text-slate-700 mb-3 pb-3 border-b border-navy-50">{req.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {req.preferred_date && (
                  <div className="flex items-start gap-1.5">
                    <Calendar size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500">Preferred</div>
                      <div className="text-navy-900 font-medium">
                        {format(new Date(req.preferred_date), 'MMM d')}
                        {req.preferred_time_window && ` (${req.preferred_time_window})`}
                      </div>
                    </div>
                  </div>
                )}
                {req.contact_phone && (
                  <div className="flex items-start gap-1.5">
                    <Phone size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500">Phone</div>
                      <a href={`tel:${req.contact_phone}`} className="text-navy-700 hover:text-ember-600 font-medium">{req.contact_phone}</a>
                    </div>
                  </div>
                )}
                {req.contact_email && (
                  <div className="flex items-start gap-1.5">
                    <Mail size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500">Email</div>
                      <a href={`mailto:${req.contact_email}`} className="text-navy-700 hover:text-ember-600 font-medium truncate">{req.contact_email}</a>
                    </div>
                  </div>
                )}
                {req.equipment && (
                  <div className="flex items-start gap-1.5">
                    <Wind size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-slate-500">Equipment</div>
                      <div className="text-navy-900 font-medium">
                        {req.equipment.nickname || `${req.equipment.make || ''} ${req.equipment.model || ''}`.trim()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-navy-50">
                  <button onClick={() => declineRequest(req.id)}
                    className="btn-secondary text-xs inline-flex items-center gap-1.5 text-red-700 border-red-200 hover:bg-red-50">
                    <XCircle size={12} /> Decline
                  </button>
                  <button onClick={() => setConvertingRequest(req)}
                    className="btn-primary text-xs inline-flex items-center gap-1.5 ml-auto">
                    <CheckCircle size={12} /> Schedule Job
                  </button>
                </div>
              )}

              {req.job_id && (
                <div className="mt-3 pt-3 border-t border-navy-50">
                  <Link to={`/jobs/${req.job_id}`} className="text-xs text-emerald-700 hover:text-emerald-900 font-medium inline-flex items-center gap-1">
                    <CheckCircle size={12} /> Scheduled as job — view
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {convertingRequest && (
        <ConvertRequestModal
          request={convertingRequest}
          techs={techs}
          onClose={() => setConvertingRequest(null)}
          onConverted={(jobId) => { setConvertingRequest(null); navigate(`/jobs/${jobId}`) }}
        />
      )}
    </div>
  )
}

function ConvertRequestModal({ request, techs, onClose, onConverted }) {
  // Build a default scheduled_at from preferred_date + time_window
  const defaultDate = request.preferred_date || new Date().toISOString().split('T')[0]
  const defaultTime = request.preferred_time_window === 'morning' ? '09:00'
    : request.preferred_time_window === 'afternoon' ? '13:00'
    : request.preferred_time_window === 'evening' ? '17:00'
    : '10:00'

  const [form, setForm] = useState({
    scheduled_at: `${defaultDate}T${defaultTime}`,
    assigned_tech_id: '',
    estimated_duration_minutes: 90,
    internal_notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSaving(true)
    setError('')

    try {
      // Get customer for address details
      const { data: customer } = await supabase.from('customers').select('*').eq('id', request.customer_id).single()
      const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`
      const tech = techs.find(t => t.id === form.assigned_tech_id)

      // Create the job
      const { data: job, error: jobError } = await supabase.from('jobs').insert({
        customer_id: request.customer_id,
        customer_name: customerName,
        customer_type: customer.customer_type,
        service_type: request.service_type,
        description: request.description,
        priority: request.priority,
        equipment_id: request.equipment_id,
        scheduled_at: form.scheduled_at,
        estimated_duration_minutes: form.estimated_duration_minutes,
        assigned_tech_id: form.assigned_tech_id || null,
        assigned_tech_name: tech?.full_name || null,
        status: form.assigned_tech_id ? 'scheduled' : 'unassigned',
        internal_notes: form.internal_notes,
        address_line1: customer.address_line1,
        address_line2: customer.address_line2,
        city: customer.city,
        state: customer.state,
        zip_code: customer.zip_code,
      }).select().single()

      if (jobError) throw jobError

      // Mark the request as scheduled
      await supabase.from('service_requests').update({
        status: 'scheduled',
        job_id: job.id,
      }).eq('id', request.id)

      onConverted(job.id)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-elevated max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl text-navy-900">Schedule Service Job</h2>
            <p className="text-sm text-slate-500">Convert request from {request.customer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-navy-900"><X size={20} /></button>
        </div>

        <div className="bg-navy-50 rounded p-3 mb-4 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={12} className="text-navy-700" />
            <span className="font-medium text-navy-900">{request.service_type}</span>
            <span className={`pill ${PRIORITY_BADGES[request.priority]}`}>{request.priority}</span>
          </div>
          {request.description && <p className="text-slate-700">{request.description}</p>}
        </div>

        <div className="mb-3">
          <label className="label">Schedule For *</label>
          <input type="datetime-local" className="input" value={form.scheduled_at}
            onChange={(e) => setForm({...form, scheduled_at: e.target.value})} required />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Assign Tech</label>
            <select className="input" value={form.assigned_tech_id} onChange={(e) => setForm({...form, assigned_tech_id: e.target.value})}>
              <option value="">Unassigned for now</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (min)</label>
            <input type="number" className="input" value={form.estimated_duration_minutes}
              onChange={(e) => setForm({...form, estimated_duration_minutes: parseInt(e.target.value) || 60})} />
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Internal Notes (staff only)</label>
          <textarea rows="2" className="input" value={form.internal_notes}
            onChange={(e) => setForm({...form, internal_notes: e.target.value})}
            placeholder="Anything the tech should know" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-3">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Send size={14} /> {saving ? 'Scheduling…' : 'Schedule Job'}
          </button>
        </div>
      </div>
    </div>
  )
}
