import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { StatusPill } from '../components/StatusPill'
import { StatCard } from '../components/StatCard'
import { format } from 'date-fns'
import { Plus, Receipt, DollarSign, Clock, AlertTriangle } from 'lucide-react'

export function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('invoices')
      .select('id, invoice_number, customer_name, status, total_amount, due_date, paid_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setInvoices(data || [])
        setLoading(false)
      })
  }, [])

  const stats = {
    outstanding: invoices.filter(i => ['sent', 'overdue', 'pending'].includes(i.status))
      .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0),
    overdue: invoices.filter(i => i.status === 'overdue')
      .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0),
    paidThisMonth: invoices.filter(i => i.status === 'paid' && i.paid_at &&
      new Date(i.paid_at).getMonth() === new Date().getMonth())
      .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0),
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/invoices/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Invoice
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Outstanding" value={`$${stats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Awaiting payment" icon={Clock} />
        <StatCard label="Overdue" value={`$${stats.overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={stats.overdue > 0 ? 'Needs follow-up' : 'On track'} warning={stats.overdue > 0} icon={AlertTriangle} />
        <StatCard label="Paid This Month" value={`$${stats.paidThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Collected revenue" icon={DollarSign} />
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            message="Create invoices from completed jobs to bill your customers."
            action={
              <Link to="/invoices/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create Invoice
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Invoice #</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Customer</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Created</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Due</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Amount</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => window.location.assign(`/invoices/${inv.id}`)} className="border-t border-navy-50 hover:bg-navy-50/30 cursor-pointer">
                  <td className="py-3 px-4 text-xs font-medium text-navy-900">{inv.invoice_number}</td>
                  <td className="py-3 px-2 text-xs text-navy-900">{inv.customer_name}</td>
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
    </div>
  )
}
