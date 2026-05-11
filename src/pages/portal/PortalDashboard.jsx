import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { StatusPill } from '../../components/StatusPill'
import { format } from 'date-fns'
import { ClipboardList, Receipt, Calendar, Phone, ArrowRight, Wrench } from 'lucide-react'

export function PortalDashboard() {
  const { profile } = useAuth()
  const [upcomingJobs, setUpcomingJobs] = useState([])
  const [recentJobs, setRecentJobs] = useState([])
  const [openInvoices, setOpenInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.customer_id) loadData()
  }, [profile])

  async function loadData() {
    const now = new Date().toISOString()
    const [upcoming, recent, invoices] = await Promise.all([
      supabase.from('jobs').select('id, job_number, service_type, status, scheduled_at, assigned_tech_name')
        .eq('customer_id', profile.customer_id).gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true }).limit(5),
      supabase.from('jobs').select('id, job_number, service_type, status, scheduled_at, completed_at')
        .eq('customer_id', profile.customer_id).eq('status', 'completed')
        .order('completed_at', { ascending: false }).limit(5),
      supabase.from('invoices').select('id, invoice_number, total_amount, status, due_date')
        .eq('customer_id', profile.customer_id).in('status', ['sent', 'overdue', 'pending'])
        .order('due_date', { ascending: true }),
    ])
    setUpcomingJobs(upcoming.data || [])
    setRecentJobs(recent.data || [])
    setOpenInvoices(invoices.data || [])
    setLoading(false)
  }

  const outstandingBalance = openInvoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)

  return (
    <div>
      <PageHeader
        title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        actions={
          <a href="tel:" className="btn-primary inline-flex items-center gap-2">
            <Phone size={16} /> Request Service
          </a>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Upcoming Service"
          value={upcomingJobs.length}
          sub={upcomingJobs[0] ? `Next: ${format(new Date(upcomingJobs[0].scheduled_at), 'MMM d')}` : 'None scheduled'}
          icon={Calendar}
        />
        <StatCard
          label="Service History"
          value={recentJobs.length}
          sub="Recent visits"
          icon={Wrench}
        />
        <StatCard
          label="Outstanding"
          value={`$${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={openInvoices.length > 0 ? `${openInvoices.length} unpaid invoice${openInvoices.length > 1 ? 's' : ''}` : 'All paid'}
          warning={openInvoices.some(i => i.status === 'overdue')}
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif flex items-center gap-2">
              <Calendar size={14} /> Upcoming Service
            </span>
            <Link to="/portal/jobs" className="text-xs text-navy-200 hover:text-white flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : upcomingJobs.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={28} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No upcoming service appointments</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-50">
              {upcomingJobs.map(job => (
                <div key={job.id} className="p-3 px-4 hover:bg-navy-50/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-navy-900">{job.service_type}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {format(new Date(job.scheduled_at), 'EEE, MMM d · h:mm a')}
                        {job.assigned_tech_name && <> · {job.assigned_tech_name}</>}
                      </div>
                    </div>
                    <StatusPill status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif flex items-center gap-2">
              <Receipt size={14} /> Outstanding Invoices
            </span>
            <Link to="/portal/invoices" className="text-xs text-navy-200 hover:text-white flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          {openInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt size={28} className="text-emerald-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">All invoices paid</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-50">
              {openInvoices.map(inv => (
                <div key={inv.id} className="p-3 px-4 hover:bg-navy-50/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-navy-900">{inv.invoice_number}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Due {inv.due_date && format(new Date(inv.due_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-navy-900">${parseFloat(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                      <StatusPill status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div className="card overflow-hidden mt-4">
          <div className="card-header">
            <span className="card-title-serif flex items-center gap-2">
              <ClipboardList size={14} /> Recent Service
            </span>
          </div>
          <div className="divide-y divide-navy-50">
            {recentJobs.map(job => (
              <div key={job.id} className="p-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-navy-900">{job.service_type}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Completed {job.completed_at && format(new Date(job.completed_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <StatusPill status={job.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
