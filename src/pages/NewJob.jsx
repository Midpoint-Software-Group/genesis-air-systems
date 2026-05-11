import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { ArrowLeft } from 'lucide-react'

const SERVICE_TYPES = [
  'AC Repair', 'AC Installation', 'Heating Repair', 'Heating Installation',
  'Maintenance / Tune-up', 'Filter Change', 'Diagnostic', 'Duct Cleaning',
  'Refrigerant Service', 'Emergency Service', 'Inspection', 'Other'
]

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
]

export function NewJob() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customer')

  const [customers, setCustomers] = useState([])
  const [techs, setTechs] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    customer_id: presetCustomerId || '',
    service_type: 'AC Repair',
    priority: 'normal',
    description: '',
    scheduled_at: '',
    estimated_duration_minutes: 60,
    assigned_tech_id: '',
    equipment_id: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    use_customer_address: true,
  })

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, first_name, last_name, company_name, customer_type, address_line1, address_line2, city, state, zip_code').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('technicians').select('id, full_name').eq('is_active', true).order('full_name'),
    ]).then(([cust, tech]) => {
      setCustomers(cust.data || [])
      setTechs(tech.data || [])
    })
  }, [])

  // Load equipment for selected customer
  useEffect(() => {
    if (form.customer_id) {
      supabase.from('equipment')
        .select('id, equipment_type, nickname, make, model')
        .eq('customer_id', form.customer_id).eq('is_active', true)
        .then(({ data }) => setEquipment(data || []))
    } else {
      setEquipment([])
    }
  }, [form.customer_id])

  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let address = {
      address_line1: form.address_line1,
      address_line2: form.address_line2,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
    }
    if (form.use_customer_address && selectedCustomer) {
      address = {
        address_line1: selectedCustomer.address_line1,
        address_line2: selectedCustomer.address_line2,
        city: selectedCustomer.city,
        state: selectedCustomer.state,
        zip_code: selectedCustomer.zip_code,
      }
    }

    const customerName = selectedCustomer?.customer_type === 'commercial'
      ? selectedCustomer.company_name
      : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`.trim()

    const assignedTech = techs.find(t => t.id === form.assigned_tech_id)

    const payload = {
      customer_id: form.customer_id,
      customer_name: customerName,
      customer_type: selectedCustomer?.customer_type,
      service_type: form.service_type,
      priority: form.priority,
      description: form.description,
      scheduled_at: form.scheduled_at,
      estimated_duration_minutes: parseInt(form.estimated_duration_minutes) || 60,
      assigned_tech_id: form.assigned_tech_id || null,
      assigned_tech_name: assignedTech?.full_name || null,
      equipment_id: form.equipment_id || null,
      status: form.assigned_tech_id ? 'scheduled' : 'unassigned',
      ...address,
    }

    const { data, error } = await supabase.from('jobs').insert(payload).select().single()
    setLoading(false)
    if (error) setError(error.message)
    else navigate(`/jobs/${data.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Job"
        subtitle="Schedule a service call or installation"
        actions={
          <button onClick={() => navigate('/jobs')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 max-w-3xl">
        <div className="mb-6">
          <label className="label">Customer</label>
          <select name="customer_id" className="input" value={form.customer_id} onChange={handleChange} required>
            <option value="">Select a customer…</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customer_type === 'commercial'
                  ? `${c.company_name} (Commercial)`
                  : `${c.first_name} ${c.last_name} (Residential)`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Service Type</label>
            <select name="service_type" className="input" value={form.service_type} onChange={handleChange} required>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" className="input" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Description</label>
          <textarea name="description" rows="3" className="input" value={form.description} onChange={handleChange}
            placeholder="What is the customer reporting? Equipment make/model? Symptoms?" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="col-span-2">
            <label className="label">Scheduled Date/Time</label>
            <input type="datetime-local" name="scheduled_at" className="input" value={form.scheduled_at} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Est. Duration (min)</label>
            <input type="number" name="estimated_duration_minutes" min="15" step="15" className="input" value={form.estimated_duration_minutes} onChange={handleChange} />
          </div>
        </div>

        <div className="mb-6">
          <label className="label">Assigned Tech</label>
          <select name="assigned_tech_id" className="input" value={form.assigned_tech_id} onChange={handleChange}>
            <option value="">Unassigned</option>
            {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>

        {equipment.length > 0 && (
          <div className="mb-6">
            <label className="label">Related Equipment (optional)</label>
            <select name="equipment_id" className="input" value={form.equipment_id} onChange={handleChange}>
              <option value="">No specific equipment</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nickname || `${e.make || ''} ${e.model || ''}`.trim() || 'Unit'} ({e.equipment_type.replace('_', ' ')})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Link this job to a specific HVAC unit for service history.</p>
          </div>
        )}

        <div className="border-t border-navy-100 pt-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-700 mb-3">
            <input type="checkbox" name="use_customer_address" checked={form.use_customer_address} onChange={handleChange}
              className="rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
            Use customer's address
          </label>

          {!form.use_customer_address && (
            <>
              <input name="address_line1" placeholder="Street address" className="input mb-2" value={form.address_line1} onChange={handleChange} />
              <input name="address_line2" placeholder="Unit, suite, etc. (optional)" className="input mb-2" value={form.address_line2} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-2">
                <input name="city" placeholder="City" className="input" value={form.city} onChange={handleChange} />
                <input name="state" placeholder="State" maxLength="2" className="input uppercase" value={form.state} onChange={handleChange} />
                <input name="zip_code" placeholder="ZIP" className="input" value={form.zip_code} onChange={handleChange} />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/jobs')} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
