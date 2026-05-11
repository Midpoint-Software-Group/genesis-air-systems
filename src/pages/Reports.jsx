import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { StatCard } from '../components/StatCard'
import { format, startOfMonth, subMonths } from 'date-fns'
import {
  DollarSign, TrendingUp, Users, Wrench, Clock, CheckCircle, BarChart3, Star
} from 'lucide-react'

const REPORT_SECTION_NAV = [
  { to: '/reports', label: 'Overview', icon: BarChart3, exact: true },
  { to: '/reviews', label: 'Reviews', icon: Star },
]

export function Reports() {
  const [period, setPeriod] = useState('mtd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [period])

  function periodStart() {
    const now = new Date()
    if (period === 'mtd') return startOfMonth(now)
    if (period === 'qtd') return startOfMonth(subMonths(now, 2))
    if (period === 'ytd') return new Date(now.getFullYear(), 0, 1)
    return new Date(2020, 0, 1)
  }

  async function load() {
    setLoading(true)
    const startDate = periodStart().toISOString()
    const [invoices, jobs, customers, techs] = await Promise.all([
      supabase.from('invoices').select('id, status, total_amount, customer_id, customer_name, created_at, paid_at, due_date, job_id').gte('created_at', startDate),
      supabase.from('jobs').select('id, status, service_type, customer_id, customer_name, assigned_tech_id, assigned_tech_name, customer_type, scheduled_at, completed_at, started_at, created_at').gte('created_at', startDate),
      supabase.from('customers').select('id, customer_type, created_at'),
      supabase.from('technicians').select('id, full_name, is_active'),
    ])

    setData({
      invoices: invoices.data || [],
      jobs: jobs.data || [],
      customers: customers.data || [],
      techs: techs.data || [],
    })
    setLoading(false)
  }

  if (loading || !data) return (
    <div>
      <PageHeader title="Reports" subtitle="Business intelligence and performance analytics" />
      <div className="card p-8 text-center text-sm text-slate-400">Loading reports…</div>
    </div>
  )

  const { invoices, jobs, customers, techs } = data

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const outstanding = invoices.filter(i => ['sent', 'pending', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const overdue = invoices.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date() && i.status !== 'paid')).reduce((s, i) => s + Number(i.total_amount || 0), 0)

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const activeJobs = jobs.filter(j => ['unassigned', 'scheduled', 'en_route', 'in_progress'].includes(j.status))
  const avgTicket = invoices.length > 0 ? totalRevenue / invoices.length : 0

  const completionTimes = completedJobs
    .filter(j => j.started_at && j.completed_at)
    .map(j => (new Date(j.completed_at) - new Date(j.started_at)) / 1000 / 3600)
  const avgCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : 0

  const revenueByService = {}
  invoices.forEach(inv => {
    let svc = 'Other'
    if (inv.job_id) {
      const job = jobs.find(j => j.id === inv.job_id)
      if (job?.service_type) svc = job.service_type
    } else {
      const job = jobs.find(j => j.customer_id === inv.customer_id &&
        Math.abs(new Date(j.created_at) - new Date(inv.created_at)) < 30 * 86400000)
      if (job?.service_type) svc = job.service_type
    }
    revenueByService[svc] = (revenueByService[svc] || 0) + Number(inv.total_amount || 0)
  })
  const serviceBreakdown = Object.entries(revenueByService)
    .map(([service, amount]) => ({ service, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
  const maxServiceRevenue = Math.max(...serviceBreakdown.map(s => s.amount), 1)

  const jobsByStatus = ['unassigned', 'scheduled', 'en_route', 'in_progress', 'completed', 'cancelled']
    .map(status => ({ status, count: jobs.filter(j => j.status === status).length }))
  const maxJobStatus = Math.max(...jobsByStatus.map(s => s.count), 1)

  const revenueByCustomer = {}
  invoices.forEach(inv => {
    if (!inv.customer_id) return
    if (!revenueByCustomer[inv.customer_id]) {
      revenueByCustomer[inv.customer_id] = { name: inv.customer_name, amount: 0, count: 0 }
    }
    revenueByCustomer[inv.customer_id].amount += Number(inv.total_amount || 0)
    revenueByCustomer[inv.customer_id].count += 1
  })
  const topCustomers = Object.entries(revenueByCustomer)
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const techStats = techs.filter(t => t.is_active).map(tech => {
    const techJobs = jobs.filter(j => j.assigned_tech_id === tech.id)
    const completed = techJobs.filter(j => j.status === 'completed')
    const timeData = completed.filter(j => j.started_at && j.completed_at)
    const avgTime = timeData.length > 0
      ? timeData.map(j => (new Date(j.completed_at) - new Date(j.started_at)) / 1000 / 3600).reduce((a, b) => a + b, 0) / timeData.length
      : 0
    return {
      id: tech.id, name: tech.full_name,
      total: techJobs.length, completed: completed.length,
      active: techJobs.filter(j => ['scheduled', 'en_route', 'in_progress'].includes(j.status)).length,
      avgHours: avgTime,
    }
  }).sort((a, b) => b.completed - a.completed)

  const newCustomers = customers.filter(c => new Date(c.created_at) >= periodStart()).length
  const totalCustomers = customers.length
  const residential = customers.filter(c => c.customer_type === 'residential').length
  const commercial = customers.filter(c => c.customer_type === 'commercial').length

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Business intelligence · ${
          period === 'mtd' ? 'Month-to-Date' :
          period === 'qtd' ? 'Last 3 Months' :
          period === 'ytd' ? 'Year-to-Date' : 'All Time'
        }`}
        actions={
          <div className="flex gap-1">
            {[
              { id: 'mtd', label: 'MTD' },
              { id: 'qtd', label: 'QTD' },
              { id: 'ytd', label: 'YTD' },
              { id: 'all', label: 'All' },
            ].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={period === p.id ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      <SectionNav items={REPORT_SECTION_NAV} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`} icon={DollarSign} />
        <StatCard label="Paid" value={`$${paidRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub="Collected" icon={CheckCircle} />
        <StatCard label="Outstanding" value={`$${outstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={overdue > 0 ? `$${overdue.toFixed(0)} overdue` : 'On track'}
          warning={overdue > 0} icon={Clock} />
        <StatCard label="Avg Ticket" value={`$${avgTicket.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub="Per invoice" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Jobs Completed" value={completedJobs.length} sub={`${activeJobs.length} active`} icon={Wrench} />
        <StatCard label="Avg Job Time" value={avgCompletionTime > 0 ? `${avgCompletionTime.toFixed(1)}h` : '—'}
          sub="Started → completed" icon={Clock} />
        <StatCard label="New Customers" value={newCustomers} sub={`${totalCustomers} total`} icon={Users} />
        <StatCard label="Active Techs" value={techs.filter(t => t.is_active).length}
          sub={`${commercial}C · ${residential}R`} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Revenue by Service Type</span>
          </div>
          <div className="p-4">
            {serviceBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No revenue data yet</p>
            ) : (
              <div className="space-y-3">
                {serviceBreakdown.map(s => {
                  const pct = (s.amount / maxServiceRevenue) * 100
                  const totalPct = totalRevenue > 0 ? (s.amount / totalRevenue) * 100 : 0
                  return (
                    <div key={s.service}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-navy-900 font-medium">{s.service}</span>
                        <span className="text-slate-600">
                          ${s.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          <span className="text-slate-400 ml-1">({totalPct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="bg-navy-50 rounded h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-navy-700 to-ember-600 rounded"
                          style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Jobs by Status</span>
          </div>
          <div className="p-4">
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No jobs yet</p>
            ) : (
              <div className="space-y-3">
                {jobsByStatus.filter(s => s.count > 0).map(s => {
                  const pct = (s.count / maxJobStatus) * 100
                  const color = {
                    unassigned: 'bg-amber-500', scheduled: 'bg-blue-500',
                    en_route: 'bg-orange-500', in_progress: 'bg-emerald-500',
                    completed: 'bg-slate-500', cancelled: 'bg-red-500',
                  }[s.status]
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-navy-900 font-medium capitalize">{s.status.replace('_', ' ')}</span>
                        <span className="text-slate-600">{s.count}</span>
                      </div>
                      <div className="bg-navy-50 rounded h-2 overflow-hidden">
                        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Top Customers by Revenue</span>
          </div>
          {topCustomers.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No invoices yet</p>
          ) : (
            <table className="w-full">
              <thead className="bg-navy-50/50">
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Customer</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Invoices</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map(c => (
                  <tr key={c.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                    <td className="py-2.5 px-4">
                      <Link to={`/customers/${c.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{c.name}</Link>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 text-right">{c.count}</td>
                    <td className="py-2.5 px-4 text-xs font-medium text-navy-900 text-right">
                      ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Tech Productivity</span>
          </div>
          {techStats.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No techs on staff</p>
          ) : (
            <table className="w-full">
              <thead className="bg-navy-50/50">
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Tech</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Active</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Done</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Avg</th>
                </tr>
              </thead>
              <tbody>
                {techStats.map(t => (
                  <tr key={t.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                    <td className="py-2.5 px-4">
                      <Link to={`/team/${t.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{t.name}</Link>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 text-right">{t.active}</td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 text-right">{t.completed}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 text-right">
                      {t.avgHours > 0 ? `${t.avgHours.toFixed(1)}h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <span className="card-title-serif">Customer Mix</span>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Residential</div>
            <div className="font-serif text-2xl text-navy-900">{residential}</div>
            <div className="text-xs text-slate-500">{totalCustomers > 0 ? ((residential / totalCustomers) * 100).toFixed(0) : 0}% of total</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Commercial</div>
            <div className="font-serif text-2xl text-navy-900">{commercial}</div>
            <div className="text-xs text-slate-500">{totalCustomers > 0 ? ((commercial / totalCustomers) * 100).toFixed(0) : 0}% of total</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">New in Period</div>
            <div className="font-serif text-2xl text-ember-600">+{newCustomers}</div>
            <div className="text-xs text-slate-500">Growth</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total</div>
            <div className="font-serif text-2xl text-navy-900">{totalCustomers}</div>
            <div className="text-xs text-slate-500">All customers</div>
          </div>
        </div>
      </div>
    </div>
  )
}
