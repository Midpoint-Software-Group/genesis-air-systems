import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { ArrowLeft, User } from 'lucide-react'

export function NewTech() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    license_number: '',
    hire_date: new Date().toISOString().split('T')[0],
    hourly_rate: '',
    current_status: 'available',
    notes: '',
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      ...form,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      hire_date: form.hire_date || null,
      is_active: true,
    }

    const { data, error } = await supabase.from('technicians').insert(payload).select().single()
    setLoading(false)
    if (error) setError(error.message)
    else navigate(`/team/${data.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Add Technician"
        subtitle="Add a member to your service team"
        actions={
          <button onClick={() => navigate('/team')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-navy-50">
          <div className="w-12 h-12 rounded-full bg-ember-50 text-ember-700 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <div className="font-medium text-navy-900">Technician Details</div>
            <div className="text-xs text-slate-500">Add the tech's contact info and credentials</div>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Full Name *</label>
          <input name="full_name" className="input" value={form.full_name} onChange={handleChange} required autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Email</label>
            <input type="email" name="email" className="input" value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" name="phone" className="input" value={form.phone} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">License Number</label>
            <input name="license_number" className="input" value={form.license_number} onChange={handleChange} placeholder="HVAC license #" />
          </div>
          <div>
            <label className="label">Hire Date</label>
            <input type="date" name="hire_date" className="input" value={form.hire_date} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Hourly Rate ($)</label>
            <input type="number" step="0.01" min="0" name="hourly_rate" className="input" value={form.hourly_rate} onChange={handleChange} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Initial Status</label>
            <select name="current_status" className="input" value={form.current_status} onChange={handleChange}>
              <option value="available">Available</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="label">Notes</label>
          <textarea name="notes" rows="2" className="input" value={form.notes} onChange={handleChange}
            placeholder="Specialties, certifications, vehicle info, etc." />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/team')} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add Technician'}
          </button>
        </div>
      </form>
    </div>
  )
}
