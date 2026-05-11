import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { generateEstimatePDF } from '../lib/pdfGenerator'
import { sendEstimateEmail } from '../lib/emailService'
import { format } from 'date-fns'
import {
  ArrowLeft, Download, Send, CheckCircle, XCircle, FileText,
  Edit, Receipt, AlertCircle
} from 'lucide-react'

export function EstimateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEstimate()
  }, [id])

  async function loadEstimate() {
    setLoading(true)
    const { data: est } = await supabase.from('estimates').select('*').eq('id', id).single()
    if (!est) { setLoading(false); return }
    setEstimate(est)

    const [{ data: lines }, { data: cust }] = await Promise.all([
      supabase.from('estimate_line_items').select('*').eq('estimate_id', id).order('sort_order'),
      supabase.from('customers').select('*').eq('id', est.customer_id).single(),
    ])
    setLineItems(lines || [])
    setCustomer(cust)
    setLoading(false)
  }

  async function updateStatus(newStatus, extraFields = {}) {
    setUpdating(true)
    const updates = { status: newStatus, ...extraFields }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'approved') updates.approved_at = new Date().toISOString()

    const { error } = await supabase.from('estimates').update(updates).eq('id', id)
    if (error) { setError(error.message); setUpdating(false); return }

    // Auto-send email when status flips to sent
    if (newStatus === 'sent' && customer?.email) {
      try {
        await sendEstimateEmail({ ...estimate, ...updates }, customer, lineItems)
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
        setError(`Estimate sent, but email failed: ${emailErr.message}`)
      }
    }
    setUpdating(false)
    loadEstimate()
  }

  async function convertToInvoice() {
    if (estimate.status !== 'approved') {
      setError('Only approved estimates can be converted.')
      return
    }
    setUpdating(true)
    setError('')

    try {
      // Create invoice with same totals
      const today = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const { data: invoice, error: invError } = await supabase.from('invoices').insert({
        customer_id: estimate.customer_id,
        customer_name: estimate.customer_name,
        job_id: estimate.job_id,
        source_estimate_id: estimate.id,
        status: 'draft',
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount_amount: estimate.discount_amount,
        total_amount: estimate.total_amount,
        notes: estimate.notes,
        payment_terms: 'Net 30',
        issued_at: today.toISOString(),
        due_date: dueDate.toISOString().split('T')[0],
      }).select().single()

      if (invError) throw invError

      // Copy line items
      const newLines = lineItems.map((item, idx) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_taxable: item.is_taxable,
        sort_order: idx,
      }))

      const { error: lineError } = await supabase.from('invoice_line_items').insert(newLines)
      if (lineError) throw lineError

      navigate(`/invoices/${invoice.id}`)
    } catch (err) {
      setError(err.message || 'Failed to convert estimate.')
    } finally {
      setUpdating(false)
    }
  }

  function downloadPDF() {
    if (!estimate || !customer) return
    generateEstimatePDF(estimate, lineItems, customer)
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading estimate…</div>
  if (!estimate) return <div className="p-8 text-center text-sm text-slate-400">Estimate not found</div>

  const isDraft = estimate.status === 'draft'
  const isSent = estimate.status === 'sent'
  const isApproved = estimate.status === 'approved'
  const isClosed = ['approved', 'declined', 'expired'].includes(estimate.status)

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {estimate.estimate_number}
            <StatusPill status={estimate.status} />
          </span>
        }
        subtitle={`${customer ? (customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`) : '...'} · $${Number(estimate.total_amount).toFixed(2)}`}
        actions={
          <>
            <button onClick={() => navigate('/estimates')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={downloadPDF} className="btn-secondary inline-flex items-center gap-2">
              <Download size={16} /> PDF
            </button>

            {isDraft && (
              <button onClick={() => updateStatus('sent')} disabled={updating} className="btn-navy inline-flex items-center gap-2">
                <Send size={16} /> Mark as Sent
              </button>
            )}
            {isSent && (
              <>
                <button onClick={() => updateStatus('declined')} disabled={updating} className="btn-secondary inline-flex items-center gap-2 text-red-700 border-red-200 hover:bg-red-50">
                  <XCircle size={16} /> Decline
                </button>
                <button onClick={() => updateStatus('approved')} disabled={updating} className="btn-primary inline-flex items-center gap-2">
                  <CheckCircle size={16} /> Approve
                </button>
              </>
            )}
            {isApproved && (
              <button onClick={convertToInvoice} disabled={updating} className="btn-primary inline-flex items-center gap-2">
                <Receipt size={16} /> Convert to Invoice
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title-serif flex items-center gap-2">
                <FileText size={14} /> Line Items
              </span>
            </div>
            {lineItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No line items</div>
            ) : (
              <table className="w-full">
                <thead className="bg-navy-50/50">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Description</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Qty</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Unit Price</th>
                    <th className="text-center text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Tax</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(item => (
                    <tr key={item.id} className="border-t border-navy-50">
                      <td className="py-3 px-4 text-sm text-navy-900">{item.description}</td>
                      <td className="py-3 px-2 text-sm text-slate-600 text-right">{Number(item.quantity).toFixed(2)}</td>
                      <td className="py-3 px-2 text-sm text-slate-600 text-right">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-3 px-2 text-sm text-center">
                        {item.is_taxable ? <CheckCircle size={12} className="text-emerald-600 inline" /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-navy-900 text-right">
                        ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="border-t-2 border-navy-100 px-4 py-3 bg-navy-50/30">
              <div className="flex justify-end">
                <div className="w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-navy-900 font-medium">${Number(estimate.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(estimate.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="text-ember-600 font-medium">−${Number(estimate.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(estimate.tax_rate) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax ({(Number(estimate.tax_rate) * 100).toFixed(3)}%)</span>
                      <span className="text-navy-900 font-medium">${Number(estimate.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t-2 border-navy-900">
                    <span className="font-serif text-base text-navy-900">Total</span>
                    <span className="font-serif text-lg font-bold text-ember-600">${Number(estimate.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(estimate.notes || estimate.terms) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {estimate.notes && (
                <div className="card p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 pb-2 border-b border-navy-50">
                    Notes
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{estimate.notes}</p>
                </div>
              )}
              {estimate.terms && (
                <div className="card p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 pb-2 border-b border-navy-50">
                    Terms & Conditions
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{estimate.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Details
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Customer</div>
                {customer && (
                  <Link to={`/customers/${customer.id}`} className="text-navy-900 hover:text-ember-600 font-medium">
                    {customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`}
                  </Link>
                )}
              </div>
              {estimate.job_id && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Linked Job</div>
                  <Link to={`/jobs/${estimate.job_id}`} className="text-navy-700 hover:text-ember-600">View job</Link>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Created</div>
                <div className="text-navy-900">{format(new Date(estimate.created_at), 'MMM d, yyyy')}</div>
              </div>
              {estimate.valid_until && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Valid Until</div>
                  <div className="text-navy-900">{format(new Date(estimate.valid_until), 'MMM d, yyyy')}</div>
                </div>
              )}
              {estimate.sent_at && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Sent</div>
                  <div className="text-navy-900">{format(new Date(estimate.sent_at), 'MMM d, yyyy')}</div>
                </div>
              )}
              {estimate.approved_at && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Approved</div>
                  <div className="text-emerald-700">{format(new Date(estimate.approved_at), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          </div>

          {isClosed && estimate.status === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800">
              <CheckCircle size={14} className="inline mr-1.5" />
              Estimate approved. Ready to convert to invoice.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
