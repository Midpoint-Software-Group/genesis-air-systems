import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { format, startOfMonth, subMonths } from 'date-fns'
import { TrendingUp, Star, BarChart3, Award } from 'lucide-react'

const REPORT_NAV = [
  { to: '/reports', label: 'Overview', icon: BarChart3, exact: true },
  { to: '/scorecards', label: 'Scorecards', icon: Award },
  { to: '/reviews', label: 'Reviews', icon: Star },
]

export function Scorecards() {
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
    const start = periodStart().toISOString()
    const [techs, jobs, invoices, timeLogs] = await Promise.all([
      supabase.from('technicians').select('id, full_name, hourly_rate, is_active').eq('is_active', true),
      supabase.from('jobs').select('id, assigned_tech_id, status, billed_amount, service_type, completed_at, started_at, customer_id').gte('created_at', start),
      supabase.from('invoices').select('id, job_id, total_amount, status, customer_id').gte('created_at', start),
      supabase.from('tech_time_log').select('technician_id, duration_minutes, clock_in').gte('clock_in', start).not('clock_out', 'is', null),
    ])
    setData({
      techs: techs.data || [],
      jobs: jobs.data || [],
      invoices: invoices.data || [],
      timeLogs: timeLogs.data || [],
    })
    setLoading(false)
  }

  if (loading || !data) return (
    <div>
      <PageHeader title="Tech Scorecards" subtitle="Individual performance metrics" />
      <div className="card p-8 text-center text-sm text-slate-400">Loading scorecards…</div>
    </div>
  )

  const { techs, jobs, invoices, timeLogs } = data

  const scorecards = techs.map(tech => {
    const techJobs = jobs.filter(j => j.assigned_tech_id === tech.id)
    const completedJobs = techJobs.filter(j => j.status === 'completed')
    const activeJobs = techJobs.filter(j => ['scheduled', 'en_route', 'in_progress'].includes(j.status))
    
    // Revenue from invoices linked to their jobs
    const jobIds = techJobs.map(j => j.id)
    const techInvoices = invoices.filter(i => jobIds.includes(i.job_id))
    const totalRevenue = techInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
    const paidRevenue = techInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0)
    
    // Avg ticket
    const avgTicket = techInvoices.length > 0 ? totalRevenue / techInvoices.length : 0
    
    // Hours worked
    const techLogs = timeLogs.filter(t => t.technician_id === tech.id)
    const totalMinutes = techLogs.reduce((s, t) => s + (t.duration_minutes || 0), 0)
    const totalHours = totalMinutes / 60
    
    // Avg completion time
    const timedJobs = completedJobs.filter(j => j.started_at && j.completed_at)
    const avgHours = timedJobs.length > 0
      ? timedJobs.reduce((s, j) => s + (new Date(j.completed_at) - new Date(j.started_at)) / 3600000, 0) / timedJobs.length
      : 0
    
    // Revenue per hour
    const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0
    
    // Unique customers served
    const uniqueCustomers = new Set(completedJobs.map(j => j.customer_id)).size
    
    return {
      tech,
      totalJobs: techJobs.length,
      completedJobs: completedJobs.length,
      activeJobs: activeJobs.length,
      totalRevenue,
      paidRevenue,
      avgTicket,
      totalHours,
      avgCompletionHours: avgHours,
      revenuePerHour,
      uniqueCustomers,
      invoiceCount: techInvoices.length,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)

  const top = scorecards[0]
  const totalRevenue = scorecards.reduce((s, sc) => s + sc.totalRevenue, 0)

  return (
    <div>
      <PageHeader
        title="Tech Scorecards"
        subtitle={`Individual performance · ${period === 'mtd' ? 'Month-to-Date' : period === 'qtd' ? 'Last 3 Months' : period === 'ytd' ? 'Year-to-Date' : 'All Time'}`}
        actions={
          <div className="flex gap-1">
            {[{id:'mtd',label:'MTD'},{id:'qtd',label:'QTD'},{id:'ytd',label:'YTD'},{id:'all',label:'All'}].map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={period === p.id ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}>
                {p.label}
              </button>
            ))}
          </div>
        }
      />
      <SectionNav items={REPORT_NAV} />

      {scorecards.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">No active technicians</div>
      ) : (
        <>
          {/* Leaderboard summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {scorecards.slice(0, 4).map((sc, idx) => (
              <div key={sc.tech.id} className={`card p-4 ${idx === 0 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  {idx === 0 && <Award size={14} className="text-amber-600" />}
                  <span className="text-xs font-medium text-navy-900 truncate">{sc.tech.full_name}</span>
                </div>
                <div className="font-serif text-2xl text-navy-900">${sc.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{sc.completedJobs} jobs · ${sc.avgTicket.toFixed(0)} avg</div>
              </div>
            ))}
          </div>

          {/* Detailed scorecard table */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title-serif">Detailed Scorecards</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-navy-50/50 border-b border-navy-100">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Technician</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Revenue</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Avg Ticket</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Jobs Done</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Active</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Customers</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">Hours</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-3">$/hr</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Avg Job</th>
                  </tr>
                </thead>
                <tbody>
                  {scorecards.map((sc, idx) => (
                    <tr key={sc.tech.id} className={`border-t border-navy-50 hover:bg-navy-50/30 ${idx === 0 ? 'bg-amber-50/20' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Award size={12} className="text-amber-500" />}
                          <Link to={`/team/${sc.tech.id}`} className="text-sm font-medium text-navy-900 hover:text-ember-600">
                            {sc.tech.full_name}
                          </Link>
                        </div>
                        {totalRevenue > 0 && (
                          <div className="mt-1 h-1.5 bg-navy-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-gradient-to-r from-navy-600 to-ember-600 rounded-full"
                              style={{ width: `${(sc.totalRevenue / totalRevenue) * 100}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-sm font-medium text-navy-900">${sc.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        <div className="text-[10px] text-emerald-700">${sc.paidRevenue.toFixed(0)} paid</div>
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-navy-900">${sc.avgTicket.toFixed(0)}</td>
                      <td className="py-3 px-3 text-right text-sm text-navy-900">{sc.completedJobs}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm ${sc.activeJobs > 0 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>{sc.activeJobs}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-slate-600">{sc.uniqueCustomers}</td>
                      <td className="py-3 px-3 text-right text-sm text-slate-600">{sc.totalHours.toFixed(1)}h</td>
                      <td className="py-3 px-3 text-right text-sm text-navy-900">
                        {sc.revenuePerHour > 0 ? `$${sc.revenuePerHour.toFixed(0)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600">
                        {sc.avgCompletionHours > 0 ? `${sc.avgCompletionHours.toFixed(1)}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
