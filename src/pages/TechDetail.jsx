import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { format } from 'date-fns'
import { ArrowLeft, Mail, Phone, Wrench, Calendar, DollarSign, Power, Save, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { id: 'available', label: 'Available' },
  { id: 'on_job', label: 'On Job' },
  { id: 'en_route', label: 'En Route' },
  { id: 'on_break', label: 'On Break' },
  { id: 'off_duty', label: 'Off Duty' },
]

export function TechDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tech, setTech] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')

  useEffect(() => { loadTech() }, [id])

  async function loadTech() {
    setLoading(true)
    const [{ data: t }, { data: j }] = await Promise.all([
      supabase.from('technicians').select('*').eq('id', id).single(),
      supabase.from('jobs').select('id, job_number, customer_name, service_type, status, scheduled_at')
        .eq('assigned_tech_id', id).order('scheduled_at', { ascending: false }).limit(20),
    ])
    setTech(t)
    setJobs(j || [])
    setForm({
      full_name: t?.full_name || '',
      email: t?.email || '',
      phone: t?.phone || '',
      license_number: t?.license_number || '',
      hourly_rate: t?.hourly_rate || '',
      current_status: t?.current_status || 'available',
      notes: t?.notes || '',
    })
    setLoading(false)
  }

  async function saveEdit() {
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
    }
    const { error } = await supabase.from('technicians').update(payload).eq('id', id)
    setSaving(false)
    if (error) setError(error.message)
    else {
      setEditing(false)
      loadTech()
    }
  }

  async function toggleActive() {
    setSaving(true)
    await supabase.from('technicians').update({ is_active: !tech.is_active }).eq('id', id)
    setSaving(false)
    loadTech()
  }

  async function setStatus(newStatus) {
    setSaving(true)
    await supabase.from('technicians').update({ current_status: newStatus }).eq('id', id)
    setSaving(false)
    loadTech()
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
  if (!tech) return <div className="p-8 text-center text-sm text-slate-400">Technician not found</div>

  const activeJobs = jobs.filter(j => ['scheduled', 'en_route', 'in_progress'].includes(j.status))
  const completedJobs = jobs.filter(j => j.status === 'completed')

  return (
    <div>
      <PageHeader
        title={tech.full_name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            Technician
            {!tech.is_active && <span className="pill pill-done">Inactive</span>}
          </span>
        }
        actions={
          <>
            <button onClick={() => navigate('/team')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            {!editing && (
              <>
                <button onClick={toggleActive} disabled={saving}
                  className={tech.is_active
                    ? 'btn-secondary inline-flex items-center gap-2 text-red-700 border-red-200 hover:bg-red-50'
                    : 'btn-secondary inline-flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50'}>
                  <Power size={16} />
                  {tech.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button onClick={() => setEditing(true)} className="btn-primary">Edit</button>
              </>
            )}
            {editing && (
              <>
                <button onClick={() => { setEditing(false); setError('') }} className="btn-secondary inline-flex items-center gap-2">
                  <X size={16} /> Cancel
                </button>
                <button onClick={saveEdit} disabled={saving} className="btn-primary inline-flex items-center gap-2">
                  <Save size={16} /> Save
                </button>
              </>
            )}
          </>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-lg font-medium border-2 border-navy-200">
                {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-navy-900">{tech.full_name}</div>
                <div className="text-xs text-slate-500">{tech.email}</div>
              </div>
            </div>

            {!editing ? (
              <div className="space-y-3 text-sm pt-3 border-t border-navy-50">
                {tech.phone && (
                  <div className="flex items-start gap-2">
                    <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <a href={`tel:${tech.phone}`} className="text-navy-700 hover:text-ember-600">{tech.phone}</a>
                  </div>
                )}
                {tech.email && (
                  <div className="flex items-start gap-2">
                    <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <a href={`mailto:${tech.email}`} className="text-navy-700 hover:text-ember-600 break-all">{tech.email}</a>
                  </div>
                )}
                {tech.license_number && (
                  <div className="flex items-start gap-2">
                    <Wrench size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-navy-700">License {tech.license_number}</span>
                  </div>
                )}
                {tech.hourly_rate && (
                  <div className="flex items-start gap-2">
                    <DollarSign size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-navy-700">${Number(tech.hourly_rate).toFixed(2)}/hr</span>
                  </div>
                )}
                {tech.hire_date && (
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-navy-700">Hired {format(new Date(tech.hire_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {tech.notes && (
                  <div className="pt-3 mt-3 border-t border-navy-50">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Notes</div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{tech.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-3 border-t border-navy-50">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">License #</label>
                  <input className="input" value={form.license_number} onChange={(e) => setForm({...form, license_number: e.target.value})} />
                </div>
                <div>
                  <label className="label">Hourly Rate</label>
                  <input type="number" step="0.01" className="input" value={form.hourly_rate} onChange={(e) => setForm({...form, hourly_rate: e.target.value})} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" rows="3" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          {tech.is_active && !editing && (
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
                Current Status
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setStatus(s.id)} disabled={saving}
                    className={tech.current_status === s.id ? 'btn-navy text-xs py-1.5' : 'btn-secondary text-xs py-1.5'}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="stat-label">Active Jobs</div>
              <div className="stat-value">{activeJobs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed</div>
              <div className="stat-value">{completedJobs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Status</div>
              <div className="stat-value text-base mt-2">
                {STATUS_OPTIONS.find(s => s.id === tech.current_status)?.label || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title-serif">Assigned Jobs</span>
              <span className="text-xs text-navy-200">{jobs.length} total</span>
            </div>
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No jobs assigned yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-50">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Job #</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Customer</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Service</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Date</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                      <td className="py-2.5 px-4"><Link to={`/jobs/${job.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{job.job_number}</Link></td>
                      <td className="py-2.5 px-2 text-xs text-navy-900">{job.customer_name}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{job.service_type}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{job.scheduled_at && format(new Date(job.scheduled_at), 'MMM d')}</td>
                      <td className="py-2.5 px-2"><StatusPill status={job.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
