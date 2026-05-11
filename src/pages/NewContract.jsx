import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { ArrowLeft, Save, Repeat } from 'lucide-react'
import { format, addDays, addMonths, addYears } from 'date-fns'

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly', days: 30 },
  { id: 'quarterly', label: 'Quarterly (every 3 mo)', days: 91 },
  { id: 'biannual', label: 'Twice a Year (every 6 mo)', days: 182 },
  { id: 'annual', label: 'Annual (yearly)', days: 365 },
  { id: 'custom', label: 'Custom Interval', days: null },
]

const SERVICE_TYPES = [
  'Maintenance / Tune-up', 'Filter Change', 'Diagnostic', 'Duct Cleaning',
  'Inspection', 'AC Tune-up', 'Heating Tune-up', 'Other'
]

const CONTRACT_TYPES = [
  { id: 'maintenance', label: 'Preventive Maintenance' },
  { id: 'service_plan', label: 'Service Plan' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'other', label: 'Other' },
]

export function NewContract() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customer')

  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState({
    customer_id: presetCustomerId || '',
    contract_name: '',
    contract_type: 'maintenance',
    frequency: 'annual',
    custom_interval_days: 90,
    service_type: 'Maintenance / Tune-up',
    default_duration_minutes: 90,
    price_per_visit: '',
    start_date: today,
    end_date: '',
    next_service_due: '',
    auto_generate_jobs: true,
    days_before_to_generate: 14,
    notes: '',
  })

  useEffect(() => {
    supabase.from('customers').select('id, first_name, last_name, company_name, customer_type')
      .eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => setCustomers(data || []))
  }, [])

  // Auto-suggest next_service_due based on start_date + frequency
  useEffect(() => {
    if (form.start_date && form.frequency && !form.next_service_due) {
      let nextDue
      const start = new Date(form.start_date)
      if (form.frequency === 'monthly') nextDue = addMonths(start, 1)
      else if (form.frequency === 'quarterly') nextDue = addMonths(start, 3)
      else if (form.frequency === 'biannual') nextDue = addMonths(start, 6)
      else if (form.frequency === 'annual') nextDue = addYears(start, 1)
      else if (form.frequency === 'custom') nextDue = addDays(start, Number(form.custom_interval_days) || 90)

      if (nextDue) setForm(prev => ({ ...prev, next_service_due: format(nextDue, 'yyyy-MM-dd') }))
    }
  }, [form.start_date, form.frequency, form.custom_interval_days])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const customer = customers.find(c => c.id === form.customer_id)
    if (!customer) { setError('Please select a customer.'); setSaving(false); return }

    const customerName = customer.customer_type === 'commercial'
      ? customer.company_name
      : `${customer.first_name} ${customer.last_name}`

    const payload = {
      ...form,
      customer_name: customerName,
      custom_interval_days: form.frequency === 'custom' ? Number(form.custom_interval_days) : null,
      price_per_visit: form.price_per_visit ? Number(form.price_per_visit) : null,
      default_duration_minutes: Number(form.default_duration_minutes) || 60,
      days_before_to_generate: Number(form.days_before_to_generate) || 14,
      end_date: form.end_date || null,
      status: 'active',
    }

    const { data, error } = await supabase.from('service_contracts').insert(payload).select().single()
    setSaving(false)
    if (error) setError(error.message)
    else navigate(`/contracts/${data.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Service Contract"
        subtitle="Set up recurring maintenance or service plan"
        actions={
          <button onClick={() => navigate('/contracts')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-navy-50">
          <div className="w-12 h-12 rounded-full bg-ember-50 text-ember-700 flex items-center justify-center">
            <Repeat size={20} />
          </div>
          <div>
            <div className="font-medium text-navy-900">Contract Setup</div>
            <div className="text-xs text-slate-500">Define recurring service for a customer</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Customer *</label>
            <select name="customer_id" className="input" value={form.customer_id} onChange={handleChange} required>
              <option value="">Select a customer…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.customer_type === 'commercial' ? `${c.company_name} (Commercial)` : `${c.first_name} ${c.last_name} (Residential)`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Contract Name *</label>
            <input name="contract_name" className="input" value={form.contract_name} onChange={handleChange}
              placeholder="e.g., Annual HVAC Tune-up" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Contract Type</label>
            <select name="contract_type" className="input" value={form.contract_type} onChange={handleChange}>
              {CONTRACT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Service Type</label>
            <select name="service_type" className="input" value={form.service_type} onChange={handleChange}>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Frequency *</label>
            <select name="frequency" className="input" value={form.frequency} onChange={handleChange}>
              {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          {form.frequency === 'custom' && (
            <div>
              <label className="label">Days Between Visits</label>
              <input type="number" min="1" name="custom_interval_days" className="input"
                value={form.custom_interval_days} onChange={handleChange} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" name="start_date" className="input" value={form.start_date} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Next Service Due</label>
            <input type="date" name="next_service_due" className="input" value={form.next_service_due} onChange={handleChange} />
            <p className="text-[10px] text-slate-400 mt-1">Auto-calculated from frequency</p>
          </div>
          <div>
            <label className="label">End Date (optional)</label>
            <input type="date" name="end_date" className="input" value={form.end_date} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Price Per Visit ($)</label>
            <input type="number" step="0.01" min="0" name="price_per_visit" className="input"
              value={form.price_per_visit} onChange={handleChange} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Default Duration (min)</label>
            <input type="number" min="15" step="15" name="default_duration_minutes" className="input"
              value={form.default_duration_minutes} onChange={handleChange} />
          </div>
        </div>

        <div className="bg-navy-50/50 rounded p-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" name="auto_generate_jobs" checked={form.auto_generate_jobs} onChange={handleChange}
              className="rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
            <span className="text-sm font-medium text-navy-900">Auto-generate jobs</span>
          </label>
          {form.auto_generate_jobs && (
            <div className="ml-6 mt-2">
              <label className="label">Create job how many days before service is due?</label>
              <input type="number" min="1" max="60" name="days_before_to_generate" className="input w-32"
                value={form.days_before_to_generate} onChange={handleChange} />
              <p className="text-[11px] text-slate-500 mt-1">
                When you click "Generate Due Jobs" on the contracts page, any contracts whose next service
                is within this window will get a new unassigned job created automatically.
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="label">Notes</label>
          <textarea name="notes" rows="3" className="input" value={form.notes} onChange={handleChange}
            placeholder="Contract terms, special instructions, etc." />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/contracts')} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
            <Save size={14} /> {saving ? 'Creating…' : 'Create Contract'}
          </button>
        </div>
      </form>
    </div>
  )
}
