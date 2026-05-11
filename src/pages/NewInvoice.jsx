import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { LineItemEditor, calculateTotals } from '../components/LineItemEditor'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { format, addDays } from 'date-fns'

export function NewInvoice() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customer')
  const presetJobId = searchParams.get('job')

  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    customer_id: presetCustomerId || '',
    job_id: presetJobId || '',
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    payment_terms: 'Net 30',
    tax_rate: '0.0675',
    discount_amount: '0',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, first_name, last_name, company_name, customer_type').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('jobs').select('id, job_number, customer_id, service_type, status').in('status', ['completed', 'in_progress']).order('created_at', { ascending: false }).limit(50),
    ]).then(([cust, j]) => {
      setCustomers(cust.data || [])
      setJobs(j.data || [])
    })
  }, [])

  // If a job is preset, also load any details to auto-fill customer
  useEffect(() => {
    if (presetJobId && !form.customer_id) {
      supabase.from('jobs').select('customer_id').eq('id', presetJobId).single()
        .then(({ data }) => {
          if (data) setForm(prev => ({ ...prev, customer_id: data.customer_id }))
        })
    }
  }, [presetJobId])

  const selectedCustomer = customers.find(c => c.id === form.customer_id)
  const filteredJobs = jobs.filter(j => !form.customer_id || j.customer_id === form.customer_id)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (status) => {
    setError('')
    if (!form.customer_id) { setError('Please select a customer.'); return }
    if (items.length === 0) { setError('Please add at least one line item.'); return }
    if (items.some(i => !i.description?.trim())) { setError('Each line item must have a description.'); return }

    setLoading(true)
    const totals = calculateTotals(items, form.tax_rate, form.discount_amount)
    const customerName = selectedCustomer?.customer_type === 'commercial'
      ? selectedCustomer.company_name
      : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`.trim()

    const payload = {
      customer_id: form.customer_id,
      customer_name: customerName,
      job_id: form.job_id || null,
      status,
      subtotal: totals.subtotal,
      tax_rate: Number(form.tax_rate) || 0,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total_amount: totals.total,
      notes: form.notes,
      payment_terms: form.payment_terms,
      due_date: form.due_date || null,
      issued_at: status === 'sent' ? new Date().toISOString() : null,
    }

    const { data: invoice, error: invError } = await supabase
      .from('invoices').insert(payload).select().single()

    if (invError) { setError(invError.message); setLoading(false); return }

    const lineItems = items.map((item, idx) => ({
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      is_taxable: !!item.is_taxable,
      sort_order: idx,
    }))

    const { error: lineError } = await supabase.from('invoice_line_items').insert(lineItems)

    setLoading(false)
    if (lineError) { setError(`Invoice created but lines failed: ${lineError.message}`); return }
    navigate(`/invoices/${invoice.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Invoice"
        subtitle="Bill a customer for completed work"
        actions={
          <button onClick={() => navigate('/invoices')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <div className="card p-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
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
              <div>
                <label className="label">Related Job (optional)</label>
                <select name="job_id" className="input" value={form.job_id} onChange={handleChange}>
                  <option value="">None</option>
                  {filteredJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_number} · {j.service_type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="label">Due Date</label>
                <input type="date" name="due_date" className="input" value={form.due_date} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Terms</label>
                <select name="payment_terms" className="input" value={form.payment_terms} onChange={handleChange}>
                  <option>Due on Receipt</option>
                  <option>Net 7</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 60</option>
                </select>
              </div>
              <div>
                <label className="label">Tax Rate</label>
                <input type="number" step="0.001" min="0" max="1" name="tax_rate" className="input" value={form.tax_rate} onChange={handleChange} />
                <p className="text-[10px] text-slate-400 mt-1">0.0675 = 6.75%</p>
              </div>
              <div>
                <label className="label">Discount ($)</label>
                <input type="number" step="0.01" min="0" name="discount_amount" className="input" value={form.discount_amount} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3">Line Items</div>
            <LineItemEditor items={items} onChange={setItems} taxRate={form.tax_rate} discountAmount={form.discount_amount} />
          </div>

          <div className="card p-6">
            <label className="label">Notes (customer-visible)</label>
            <textarea name="notes" rows="3" className="input" value={form.notes} onChange={handleChange} placeholder="Payment instructions, thank-you note, etc." />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 sticky top-20">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Save Options
            </div>
            <div className="space-y-2">
              <button type="button" onClick={() => handleSubmit('draft')} disabled={loading}
                className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                <Save size={14} /> Save as Draft
              </button>
              <button type="button" onClick={() => handleSubmit('sent')} disabled={loading}
                className="btn-primary w-full inline-flex items-center justify-center gap-2">
                <Send size={14} /> Save & Send
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              "Send" makes the invoice visible in the customer portal.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-xs mt-3">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
