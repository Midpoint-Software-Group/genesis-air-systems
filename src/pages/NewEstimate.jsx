import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { LineItemEditor, calculateTotals } from '../components/LineItemEditor'
import { ArrowLeft, Save, Send, Layers } from 'lucide-react'
import { format, addDays } from 'date-fns'

const TIER_COLORS = {
  good: 'border-blue-200 bg-blue-50',
  better: 'border-emerald-200 bg-emerald-50',
  best: 'border-amber-200 bg-amber-50',
}
const TIER_LABELS = { good: 'Good', better: 'Better', best: 'Best' }

export function NewEstimate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customer')
  const presetJobId = searchParams.get('job')

  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMultiOption, setIsMultiOption] = useState(false)

  // Standard single-tier items
  const [items, setItems] = useState([])
  // Multi-option items per tier
  const [tierItems, setTierItems] = useState({ good: [], better: [], best: [] })
  const [tierLabels, setTierLabels] = useState({ good: 'Good', better: 'Better', best: 'Best' })

  const [form, setForm] = useState({
    customer_id: presetCustomerId || '',
    job_id: presetJobId || '',
    valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    tax_rate: '0.0675',
    discount_amount: '0',
    notes: '',
    terms: 'Payment due upon acceptance of work. Estimate valid for 30 days from issue.',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, first_name, last_name, company_name, customer_type').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('jobs').select('id, job_number, customer_id, service_type, status').in('status', ['completed', 'in_progress', 'scheduled']).order('created_at', { ascending: false }).limit(50),
    ]).then(([cust, j]) => {
      setCustomers(cust.data || [])
      setJobs(j.data || [])
    })
  }, [])

  const selectedCustomer = customers.find(c => c.id === form.customer_id)
  const filteredJobs = jobs.filter(j => !form.customer_id || j.customer_id === form.customer_id)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (status) => {
    setError('')
    if (!form.customer_id) {
      setError('Please select a customer.')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one line item.')
      return
    }
    if (items.some(i => !i.description?.trim())) {
      setError('Each line item must have a description.')
      return
    }

    setLoading(true)

    const totals = isMultiOption
      ? calculateTotals(tierItems.better.length > 0 ? tierItems.better : tierItems.good, form.tax_rate, form.discount_amount)
      : calculateTotals(items, form.tax_rate, form.discount_amount)

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
      terms: form.terms,
      valid_until: form.valid_until || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      is_multi_option: isMultiOption,
      option_good_label: tierLabels.good,
      option_better_label: tierLabels.better,
      option_best_label: tierLabels.best,
    }

    const { data: estimate, error: estError } = await supabase
      .from('estimates')
      .insert(payload)
      .select()
      .single()

    if (estError) {
      setError(estError.message)
      setLoading(false)
      return
    }

    // Build line items array
    let lineItems = []
    if (isMultiOption) {
      for (const [tier, tItems] of Object.entries(tierItems)) {
        tItems.forEach((item, idx) => {
          if (!item.description?.trim()) return
          lineItems.push({
            estimate_id: estimate.id,
            description: item.description.trim(),
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            is_taxable: !!item.is_taxable,
            sort_order: idx,
            option_tier: tier,
          })
        })
      }
    } else {
      lineItems = items.filter(i => i.description?.trim()).map((item, idx) => ({
        estimate_id: estimate.id,
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        is_taxable: !!item.is_taxable,
        sort_order: idx,
        option_tier: 'standard',
      }))
    }

    const { error: lineError } = await supabase.from('estimate_line_items').insert(lineItems)

    setLoading(false)
    if (lineError) {
      setError(`Estimate created but lines failed: ${lineError.message}`)
      return
    }

    navigate(`/estimates/${estimate.id}`)
  }

  return (
    <div>
      <PageHeader
        title="New Estimate"
        subtitle="Create a quote to send to a customer"
        actions={
          <button onClick={() => navigate('/estimates')} className="btn-secondary inline-flex items-center gap-2">
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

            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="label">Valid Until</label>
                <input type="date" name="valid_until" className="input" value={form.valid_until} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Tax Rate (%)</label>
                <input type="number" step="0.001" min="0" max="1" name="tax_rate" className="input" value={form.tax_rate} onChange={handleChange} placeholder="0.0675 = 6.75%" />
                <p className="text-[10px] text-slate-400 mt-1">Decimal: 0.0675 = 6.75%</p>
              </div>
              <div>
                <label className="label">Discount ($)</label>
                <input type="number" step="0.01" min="0" name="discount_amount" className="input" value={form.discount_amount} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Line Items
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isMultiOption} onChange={e => setIsMultiOption(e.target.checked)}
                  className="rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
                <span className="text-xs font-medium text-navy-900 flex items-center gap-1.5">
                  <Layers size={12} className="text-ember-600" /> Good / Better / Best
                </span>
              </label>
            </div>

            {!isMultiOption ? (
              <LineItemEditor items={items} onChange={setItems} taxRate={form.tax_rate} discountAmount={form.discount_amount} />
            ) : (
              <div className="space-y-4">
                {Object.entries(tierItems).map(([tier, tItems]) => {
                  const tierTotals = calculateTotals(tItems, form.tax_rate, form.discount_amount)
                  return (
                    <div key={tier} className={`border-2 rounded-md p-4 ${TIER_COLORS[tier]}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-navy-900">
                            {TIER_LABELS[tier]}
                          </span>
                          <input
                            type="text"
                            value={tierLabels[tier]}
                            onChange={e => setTierLabels(prev => ({ ...prev, [tier]: e.target.value }))}
                            className="input py-0.5 text-xs w-32"
                            placeholder={`Label for ${tier}`}
                          />
                        </div>
                        {tItems.length > 0 && (
                          <span className="text-xs font-medium text-navy-900">
                            Total: <strong>${tierTotals.total.toFixed(2)}</strong>
                          </span>
                        )}
                      </div>
                      <LineItemEditor
                        items={tItems}
                        onChange={newItems => setTierItems(prev => ({ ...prev, [tier]: newItems }))}
                        taxRate={form.tax_rate}
                        discountAmount="0"
                      />
                      {tier === 'good' && tItems.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-2">
                          💡 Tip: Good = basic fix. Better = complete repair. Best = full solution with warranty.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="mb-4">
              <label className="label">Notes (customer-visible)</label>
              <textarea name="notes" rows="2" className="input" value={form.notes} onChange={handleChange} placeholder="Any extra info to share with the customer" />
            </div>
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea name="terms" rows="3" className="input" value={form.terms} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 sticky top-20">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Save Options
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                className="btn-secondary w-full inline-flex items-center justify-center gap-2"
              >
                <Save size={14} /> Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('sent')}
                disabled={loading}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                <Send size={14} /> Save & Send
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              "Send" marks the estimate as sent to the customer (visible in their portal).
              Draft is staff-only.
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
