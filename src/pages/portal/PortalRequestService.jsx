import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { ArrowLeft, Send, CheckCircle, Wrench, Wind, Flame, AlertCircle } from 'lucide-react'

const SERVICE_TYPES = [
  { value: 'AC Repair', icon: Wind, urgency_hint: 'urgent' },
  { value: 'AC Installation', icon: Wind, urgency_hint: 'normal' },
  { value: 'Heating Repair', icon: Flame, urgency_hint: 'urgent' },
  { value: 'Heating Installation', icon: Flame, urgency_hint: 'normal' },
  { value: 'Maintenance / Tune-up', icon: Wrench, urgency_hint: 'low' },
  { value: 'Filter Change', icon: Wrench, urgency_hint: 'low' },
  { value: 'Diagnostic', icon: Wrench, urgency_hint: 'normal' },
  { value: 'Emergency Service', icon: AlertCircle, urgency_hint: 'urgent' },
  { value: 'Other', icon: Wrench, urgency_hint: 'normal' },
]

const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning (8am – 12pm)' },
  { id: 'afternoon', label: 'Afternoon (12pm – 5pm)' },
  { id: 'evening', label: 'Evening (5pm – 8pm)' },
  { id: 'anytime', label: 'Anytime' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low', desc: 'Routine, no rush' },
  { id: 'normal', label: 'Normal', desc: 'Within a few days' },
  { id: 'high', label: 'High', desc: 'Soon as possible' },
  { id: 'urgent', label: 'Urgent', desc: 'Same-day if possible' },
]

export function PortalRequestService() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    service_type: 'AC Repair',
    priority: 'normal',
    equipment_id: '',
    description: '',
    preferred_date: '',
    preferred_time_window: 'anytime',
    contact_phone: '',
    contact_email: '',
  })

  useEffect(() => {
    if (profile?.customer_id) {
      Promise.all([
        supabase.from('equipment').select('id, equipment_type, nickname, make, model').eq('customer_id', profile.customer_id).eq('is_active', true),
        supabase.from('customers').select('email, phone').eq('id', profile.customer_id).single(),
      ]).then(([eq, cust]) => {
        setEquipment(eq.data || [])
        if (cust.data) {
          setForm(prev => ({ ...prev, contact_email: cust.data.email || '', contact_phone: cust.data.phone || '' }))
          setCustomer(cust.data)
        }
      })
    }
  }, [profile])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!profile?.customer_id) {
      setError('Your account is not yet linked to a customer record. Please contact Genesis Air Systems.')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      customer_id: profile.customer_id,
      customer_name: profile.full_name || customer?.email || 'Customer',
      service_type: form.service_type,
      priority: form.priority,
      equipment_id: form.equipment_id || null,
      description: form.description,
      preferred_date: form.preferred_date || null,
      preferred_time_window: form.preferred_time_window,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      status: 'pending',
    }

    const { error } = await supabase.from('service_requests').insert(payload)
    setLoading(false)
    if (error) setError(error.message)
    else setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="font-serif text-2xl text-navy-900 mb-2">Request Submitted</h2>
          <p className="text-sm text-slate-600 mb-6">
            Thanks for your request. Genesis Air Systems has been notified and will contact you to confirm a time.
            You can view all your requests anytime in <strong>My Service</strong>.
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={() => navigate('/portal/jobs')} className="btn-secondary">View My Service</button>
            <button onClick={() => navigate('/portal')} className="btn-primary">Back to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Request Service"
        subtitle="Tell us what's going on and we'll get back to you to confirm a time"
        actions={
          <button onClick={() => navigate('/portal')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl">
        <div className="mb-6">
          <label className="label mb-2">What do you need help with?</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SERVICE_TYPES.map(s => {
              const Icon = s.icon
              return (
                <button key={s.value} type="button"
                  onClick={() => setForm({ ...form, service_type: s.value, priority: s.urgency_hint })}
                  className={`p-3 rounded border-2 text-left transition-all ${
                    form.service_type === s.value
                      ? 'border-ember-500 bg-ember-50'
                      : 'border-navy-100 hover:border-navy-200'
                  }`}>
                  <Icon size={16} className={form.service_type === s.value ? 'text-ember-600' : 'text-navy-700'} />
                  <div className="text-xs font-medium text-navy-900 mt-1">{s.value}</div>
                </button>
              )
            })}
          </div>
        </div>

        {equipment.length > 0 && (
          <div className="mb-4">
            <label className="label">Which unit? (optional)</label>
            <select name="equipment_id" className="input" value={form.equipment_id} onChange={handleChange}>
              <option value="">Not sure / not specific</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nickname || `${e.make || ''} ${e.model || ''}`.trim() || 'Unit'} ({e.equipment_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="label">Tell us more</label>
          <textarea name="description" rows="3" className="input" value={form.description} onChange={handleChange}
            placeholder="What's happening? Any error codes? When did it start?" required />
        </div>

        <div className="mb-4">
          <label className="label mb-2">How urgent?</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map(p => (
              <button key={p.id} type="button"
                onClick={() => setForm({ ...form, priority: p.id })}
                className={`p-2 rounded border-2 text-center transition-all ${
                  form.priority === p.id
                    ? 'border-ember-500 bg-ember-50'
                    : 'border-navy-100 hover:border-navy-200'
                }`}>
                <div className="text-xs font-medium text-navy-900">{p.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Preferred Date</label>
            <input type="date" name="preferred_date" className="input" value={form.preferred_date} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="label">Preferred Time</label>
            <select name="preferred_time_window" className="input" value={form.preferred_time_window} onChange={handleChange}>
              {TIME_WINDOWS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="label">Best Phone</label>
            <input type="tel" name="contact_phone" className="input" value={form.contact_phone} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Best Email</label>
            <input type="email" name="contact_email" className="input" value={form.contact_email} onChange={handleChange} required />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          <Send size={16} /> {loading ? 'Submitting…' : 'Submit Request'}
        </button>

        <p className="text-[11px] text-slate-500 text-center mt-3">
          By submitting, you're requesting service from Genesis Air Systems.
          Someone will reach out within 1 business day to confirm a time.
        </p>
      </form>
    </div>
  )
}
