import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { EmptyState } from '../components/EmptyState'
import { StatusPill } from '../components/StatusPill'
import { format } from 'date-fns'
import { Plus, FileText, Receipt } from 'lucide-react'

const BILLING_SECTION_NAV = [
  { to: '/estimates', label: 'Estimates', icon: FileText, exact: true },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
]

export function Estimates() {
  const [estimates, setEstimates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('estimates')
      .select('id, estimate_number, customer_name, status, total_amount, valid_until, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEstimates(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <PageHeader
        title="Estimates"
        subtitle={`${estimates.length} estimate${estimates.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/estimates/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Estimate
          </Link>
        }
      />
      <SectionNav items={BILLING_SECTION_NAV} />
      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : estimates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No estimates yet"
            message="Create estimates to send quotes to customers before scheduling work."
            action={
              <Link to="/estimates/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create Estimate
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Estimate #</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Customer</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Created</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Valid Until</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Amount</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map(est => (
                <tr key={est.id} onClick={() => window.location.assign(`/estimates/${est.id}`)} className="border-t border-navy-50 hover:bg-navy-50/30 cursor-pointer">
                  <td className="py-3 px-4 text-xs font-medium text-navy-900">{est.estimate_number}</td>
                  <td className="py-3 px-2 text-xs text-navy-900">{est.customer_name}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{format(new Date(est.created_at), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-2 text-xs text-slate-600">{est.valid_until && format(new Date(est.valid_until), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-2 text-xs text-navy-900 text-right font-medium">${parseFloat(est.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-2"><StatusPill status={est.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
