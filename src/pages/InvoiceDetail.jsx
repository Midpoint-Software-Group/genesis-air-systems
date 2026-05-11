import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { generateInvoicePDF } from '../lib/pdfGenerator'
import { sendInvoiceEmail, sendOverdueReminder } from '../lib/emailService'
import { format } from 'date-fns'
import {
  ArrowLeft, Download, Send, CheckCircle, FileText,
  Receipt, AlertCircle, DollarSign, Mail
} from 'lucide-react'

export function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [lineItems, setLineItems] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')

  useEffect(() => { loadInvoice() }, [id])

  async function loadInvoice() {
    setLoading(true)
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (!inv) { setLoading(false); return }
    setInvoice(inv)

    const [{ data: lines }, { data: cust }] = await Promise.all([
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort_order'),
      supabase.from('customers').select('*').eq('id', inv.customer_id).single(),
    ])
    setLineItems(lines || [])
    setCustomer(cust)
    setPaymentAmount(String(Number(inv.total_amount) - Number(inv.amount_paid || 0)))
    setLoading(false)
  }

  async function updateStatus(newStatus) {
    setUpdating(true)
    const updates = { status: newStatus }
    if (newStatus === 'sent') updates.issued_at = new Date().toISOString()
    const { error } = await supabase.from('invoices').update(updates).eq('id', id)
    if (error) { setError(error.message); setUpdating(false); return }

    // Auto-send email when status flips to sent
    if (newStatus === 'sent' && customer?.email) {
      try {
        const result = await sendInvoiceEmail({ ...invoice, ...updates }, customer, lineItems)
        if (result?.skipped) {
          // ok — feature might be disabled
        }
      } catch (emailErr) {
        // Don't block the status change if email fails — just log it
        console.error('Email send error:', emailErr)
        setError(`Invoice sent, but email failed: ${emailErr.message}`)
      }
    }
    setUpdating(false)
    loadInvoice()
  }

  async function sendReminderEmail() {
    setUpdating(true)
    try {
      await sendOverdueReminder(invoice, customer)
      setError('')
      alert('Reminder email sent.')
    } catch (err) {
      setError(`Reminder failed: ${err.message}`)
    }
    setUpdating(false)
  }

  async function recordPayment() {
    const amt = Number(paymentAmount)
    if (!amt || amt <= 0) { setError('Enter a valid payment amount.'); return }

    setUpdating(true)
    const newPaid = Number(invoice.amount_paid || 0) + amt
    const fullyPaid = newPaid >= Number(invoice.total_amount)

    const { error } = await supabase.from('invoices').update({
      amount_paid: newPaid,
      status: fullyPaid ? 'paid' : 'pending',
      paid_at: fullyPaid ? new Date().toISOString() : null,
    }).eq('id', id)

    setUpdating(false)
    setShowPaymentModal(false)
    if (error) setError(error.message)
    else loadInvoice()
  }

  function downloadPDF() {
    if (!invoice || !customer) return
    generateInvoicePDF(invoice, lineItems, customer)
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading invoice…</div>
  if (!invoice) return <div className="p-8 text-center text-sm text-slate-400">Invoice not found</div>

  const isDraft = invoice.status === 'draft'
  const isSent = invoice.status === 'sent' || invoice.status === 'pending' || invoice.status === 'overdue'
  const isPaid = invoice.status === 'paid'
  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid || 0)

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {invoice.invoice_number}
            <StatusPill status={invoice.status} />
          </span>
        }
        subtitle={`${customer ? (customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`) : '...'} · $${Number(invoice.total_amount).toFixed(2)}`}
        actions={
          <>
            <button onClick={() => navigate('/invoices')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={downloadPDF} className="btn-secondary inline-flex items-center gap-2">
              <Download size={16} /> PDF
            </button>
            {isDraft && (
              <button onClick={() => updateStatus('sent')} disabled={updating} className="btn-navy inline-flex items-center gap-2">
                <Send size={16} /> Send Invoice
              </button>
            )}
            {isSent && (
              <>
                {(invoice.status === 'overdue' || (invoice.due_date && new Date(invoice.due_date) < new Date())) && (
                  <button onClick={sendReminderEmail} disabled={updating || !customer?.email}
                    className="btn-secondary inline-flex items-center gap-2 text-amber-700 border-amber-200 hover:bg-amber-50">
                    <Mail size={16} /> Email Reminder
                  </button>
                )}
                <button onClick={() => setShowPaymentModal(true)} className="btn-primary inline-flex items-center gap-2">
                  <DollarSign size={16} /> Record Payment
                </button>
              </>
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
                    <span className="text-navy-900 font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Discount</span>
                      <span className="text-ember-600 font-medium">−${Number(invoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.tax_rate) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax ({(Number(invoice.tax_rate) * 100).toFixed(3)}%)</span>
                      <span className="text-navy-900 font-medium">${Number(invoice.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t-2 border-navy-900">
                    <span className="font-serif text-base text-navy-900">Total</span>
                    <span className="font-serif text-lg font-bold text-navy-900">${Number(invoice.total_amount).toFixed(2)}</span>
                  </div>
                  {Number(invoice.amount_paid) > 0 && (
                    <>
                      <div className="flex justify-between text-emerald-700">
                        <span>Paid</span>
                        <span>−${Number(invoice.amount_paid).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-navy-200">
                        <span className="font-medium text-navy-900">Balance Due</span>
                        <span className="font-bold text-ember-600">${balance.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 pb-2 border-b border-navy-50">
                Notes
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
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
              {invoice.job_id && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Job</div>
                  <Link to={`/jobs/${invoice.job_id}`} className="text-navy-700 hover:text-ember-600">View job</Link>
                </div>
              )}
              {invoice.source_estimate_id && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Source Estimate</div>
                  <Link to={`/estimates/${invoice.source_estimate_id}`} className="text-navy-700 hover:text-ember-600">View estimate</Link>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Created</div>
                <div className="text-navy-900">{format(new Date(invoice.created_at), 'MMM d, yyyy')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Payment Terms</div>
                <div className="text-navy-900">{invoice.payment_terms || 'Net 30'}</div>
              </div>
              {invoice.due_date && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Due Date</div>
                  <div className="text-navy-900">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</div>
                </div>
              )}
              {invoice.paid_at && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Paid</div>
                  <div className="text-emerald-700">{format(new Date(invoice.paid_at), 'MMM d, yyyy')}</div>
                </div>
              )}
            </div>
          </div>

          {isPaid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5" />
              Paid in full.
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-elevated max-w-md w-full p-6">
            <h2 className="font-serif text-xl text-navy-900 mb-1">Record Payment</h2>
            <p className="text-sm text-slate-500 mb-4">Invoice {invoice.invoice_number}</p>

            <div className="bg-navy-50 rounded p-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Invoice Total</span><span className="text-navy-900 font-medium">${Number(invoice.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Already Paid</span><span className="text-navy-900 font-medium">${Number(invoice.amount_paid).toFixed(2)}</span></div>
              <div className="flex justify-between pt-1 border-t border-navy-200"><span className="font-medium text-navy-900">Balance Due</span><span className="font-bold text-ember-600">${balance.toFixed(2)}</span></div>
            </div>

            <label className="label">Payment Amount</label>
            <input type="number" step="0.01" min="0" max={balance} className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={recordPayment} disabled={updating} className="btn-primary inline-flex items-center gap-2">
                <DollarSign size={14} /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
