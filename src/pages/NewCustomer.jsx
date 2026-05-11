import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { Building2, Home, ArrowLeft } from 'lucide-react'

export function NewCustomer() {
  const navigate = useNavigate()
  const [customerType, setCustomerType] = useState('residential')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = { ...form, customer_type: customerType, is_active: true }

    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single()

    setLoading(false)
    if (error) setError(error.message)
    else navigate(`/customers/${data.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Customer"
        subtitle="Add a new residential or commercial customer"
        actions={
          <button onClick={() => navigate('/customers')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="card p-6 max-w-3xl">
        <div className="mb-6">
          <label className="label mb-2">Customer Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCustomerType('residential')}
              className={`p-4 rounded border-2 text-left transition-all ${
                customerType === 'residential'
                  ? 'border-ember-500 bg-ember-50'
                  : 'border-navy-100 hover:border-navy-200'
              }`}
            >
              <Home size={20} className={customerType === 'residential' ? 'text-ember-600' : 'text-navy-700'} />
              <div className="font-medium text-sm text-navy-900 mt-2">Residential</div>
              <div className="text-xs text-slate-500">Homeowner or renter</div>
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('commercial')}
              className={`p-4 rounded border-2 text-left transition-all ${
                customerType === 'commercial'
                  ? 'border-ember-500 bg-ember-50'
                  : 'border-navy-100 hover:border-navy-200'
              }`}
            >
              <Building2 size={20} className={customerType === 'commercial' ? 'text-ember-600' : 'text-navy-700'} />
              <div className="font-medium text-sm text-navy-900 mt-2">Commercial</div>
              <div className="text-xs text-slate-500">Business or property</div>
            </button>
          </div>
        </div>

        {customerType === 'residential' ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">First Name</label>
              <input name="first_name" className="input" value={form.first_name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input name="last_name" className="input" value={form.last_name} onChange={handleChange} required />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Company Name</label>
              <input name="company_name" className="input" value={form.company_name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Primary Contact</label>
              <input name="contact_name" className="input" value={form.contact_name} onChange={handleChange} />
            </div>
          </div>
        )}

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

        <div className="mb-4">
          <label className="label">Address</label>
          <input name="address_line1" placeholder="Street address" className="input mb-2" value={form.address_line1} onChange={handleChange} />
          <input name="address_line2" placeholder="Apt, suite, etc. (optional)" className="input" value={form.address_line2} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="col-span-1">
            <label className="label">City</label>
            <input name="city" className="input" value={form.city} onChange={handleChange} />
          </div>
          <div className="col-span-1">
            <label className="label">State</label>
            <input name="state" maxLength="2" className="input uppercase" value={form.state} onChange={handleChange} />
          </div>
          <div className="col-span-1">
            <label className="label">ZIP Code</label>
            <input name="zip_code" className="input" value={form.zip_code} onChange={handleChange} />
          </div>
        </div>

        <div className="mb-6">
          <label className="label">Notes</label>
          <textarea name="notes" rows="3" className="input" value={form.notes} onChange={handleChange}
            placeholder="Equipment details, access notes, preferences…" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
