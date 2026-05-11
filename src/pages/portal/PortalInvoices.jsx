import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/EmptyState'
import { StatusPill } from '../../components/StatusPill'
import { format } from 'date-fns'
import { Receipt } from 'lucide-react'

export function PortalInvoices() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.customer_id) {
      supabase.from('invoices')
        .select('id, invoice_number, total_amount, status, due_date, paid_at, created_at')
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setInvoices(data || [])
          setLoading(false)
        })
    }
  }, [profile])

  const outstanding = invoices.filter(i => ['sent', 'overdue', 'pending'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={outstanding > 0
          ? `$${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} outstanding`
          : 'All invoices paid'}
      />

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState icon={Receipt} title="No invoices yet" message="When your invoices are issued, they will appear here." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Invoice</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Date</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Due</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Amount</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                  <td className="py-3 px-4 text-xs font-medium text-navy-900">{inv.invoice_number}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{format(new Date(inv.created_at), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{inv.due_date && format(new Date(inv.due_date), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-2 text-xs text-navy-900 text-right font-medium">${parseFloat(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-2"><StatusPill status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        To pay an invoice, please contact Genesis Air Systems directly. Online payments coming soon.
      </p>
    </div>
  )
}
