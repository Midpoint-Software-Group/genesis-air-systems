import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { StatusPill } from '../../components/StatusPill'
import { format } from 'date-fns'
import { Receipt, CreditCard, CheckCircle } from 'lucide-react'

export function PortalInvoices() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState(null)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (profile?.customer_id) {
      supabase.from('invoices')
        .select('id, invoice_number, total_amount, amount_paid, status, due_date, paid_at, created_at')
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setInvoices(data || []); setLoading(false) })
    }
  }, [profile])

  const outstanding = invoices.filter(i => ['sent', 'overdue', 'pending'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)

  async function handlePayNow(invoice) {
    setPayingId(invoice.id)
    setPayError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          success_url: window.location.href + '?paid=1',
          cancel_url: window.location.href,
        }),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || 'Payment setup failed')
      window.location.href = result.url
    } catch (err) {
      setPayError(err.message)
      setPayingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="My Invoices"
        subtitle={outstanding > 0 ? `$${outstanding.toFixed(2)} outstanding` : 'All paid — you\'re up to date'}
      />

      {payError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{payError}</div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title="No invoices yet"
            message="Invoices from your service appointments will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const balance = parseFloat(inv.total_amount || 0) - parseFloat(inv.amount_paid || 0)
            const isUnpaid = ['sent', 'overdue', 'pending'].includes(inv.status)
            return (
              <div key={inv.id} className={`card p-4 ${isUnpaid ? 'border-l-4 border-l-ember-500' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-navy-900">{inv.invoice_number}</span>
                      <StatusPill status={inv.status} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Issued {format(new Date(inv.created_at), 'MMM d, yyyy')}
                      {inv.due_date && ` · Due ${format(new Date(inv.due_date), 'MMM d, yyyy')}`}
                    </div>
                    {inv.paid_at && (
                      <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                        <CheckCircle size={11} /> Paid {format(new Date(inv.paid_at), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-xl text-navy-900">
                      ${parseFloat(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    {isUnpaid && balance > 0 && (
                      <button onClick={() => handlePayNow(inv)} disabled={payingId === inv.id}
                        className="mt-2 btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 px-3">
                        <CreditCard size={12} />
                        {payingId === inv.id ? 'Opening…' : `Pay $${balance.toFixed(2)}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
