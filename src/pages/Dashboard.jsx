import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/StatCard'
import { StatusPill } from '../components/StatusPill'
import { PageHeader } from '../components/PageHeader'
import { format, addHours } from 'date-fns'
import {
  ClipboardList, Calendar, Users, DollarSign, Plus,
  AlertTriangle, FileText, ArrowRight, Bell, Clock
} from 'lucide-react'

export function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    openJobs: 0, scheduledToday: 0, techsActive: 0, revenueMTD: 0,
  })
  const [jobs, setJobs] = useState([])
  const [techs, setTechs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [reminderJobs, setReminderJobs] = useState([])
  const [unsoldEstimates, setUnsoldEstimates] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingReminders, setSendingReminders] = useState(false)

  useEffect(() => {
    loadDashboardData()
    checkReminders()
    checkUnsoldEstimates()
  }, [])

  async function checkReminders() {
    // Find jobs scheduled in the next 20-28 hours that haven't been reminded
    const soon = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
    const later = new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('jobs')
      .select('id, job_number, customer_name, customer_id, service_type, scheduled_at, assigned_tech_name')
      .in('status', ['scheduled'])
      .gte('scheduled_at', soon)
      .lte('scheduled_at', later)
      .eq('reminder_24h_sent', false)
    setReminderJobs(data || [])
  }

  async function checkUnsoldEstimates() {
    // Estimates in 'sent' status older than 3 days with no follow-up or follow-up > 3 days ago
    const cutoff = new Date(Date.now() - 3 * 86400000).toISOString()
    const { data } = await supabase.from('estimates')
      .select('id, estimate_number, customer_name, total_amount, sent_at, follow_up_count, follow_up_sent_at')
      .eq('status', 'sent')
      .lte('sent_at', cutoff)
      .lt('follow_up_count', 3)
    setUnsoldEstimates(data || [])
  }

  async function sendAllReminders() {
    setSendingReminders(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: settings } = await supabase.from('business_settings')
      .select('business_name, business_phone').eq('id', 1).single()

    for (const job of reminderJobs) {
      try {
        // Get customer phone
        const { data: customer } = await supabase.from('customers')
          .select('phone, email, first_name, company_name, customer_type').eq('id', job.customer_id).single()
        if (!customer) continue

        const name = customer.customer_type === 'commercial' ? customer.company_name : customer.first_name
        const scheduledStr = format(new Date(job.scheduled_at), 'EEEE, MMM d \'at\' h:mm a')
        const biz = settings?.business_name || 'Genesis Air Systems'
        const phone = settings?.business_phone || ''

        // Send SMS reminder
        if (customer.phone) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: customer.phone, to_name: name,
              body: `Reminder: Your ${job.service_type} appointment with ${biz} is scheduled for ${scheduledStr}${job.assigned_tech_name ? ` with ${job.assigned_tech_name}` : ''}. Questions? Call ${phone}.`,
              sms_type: 'appointment_reminder', related_id: job.id, related_type: 'job',
            }),
          })
        }

        // Mark reminder sent
        await supabase.from('jobs').update({
          reminder_sent_at: new Date().toISOString(),
          reminder_24h_sent: true,
        }).eq('id', job.id)
      } catch (e) { console.error('Reminder error:', e) }
    }

    setSendingReminders(false)
    setReminderJobs([])
  }

  async function sendEstimateFollowUp(estimate) {
    const { data: { session } } = await supabase.auth.getSession()
    const { data: settings } = await supabase.from('business_settings')
      .select('business_name, business_phone, business_email').eq('id', 1).single()
    const { data: customer } = await supabase.from('estimates')
      .select('customer_id').eq('id', estimate.id).single()
    const { data: cust } = await supabase.from('customers')
      .select('email, first_name, company_name, customer_type').eq('id', customer?.customer_id).single()

    if (cust?.email) {
      const name = cust.customer_type === 'commercial' ? cust.company_name : cust.first_name
      const biz = settings?.business_name || 'Genesis Air Systems'
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cust.email, to_name: name,
          subject: `Following up on your estimate — ${estimate.estimate_number}`,
          body: `Hi ${name},\n\nWe wanted to follow up on estimate ${estimate.estimate_number} for $${Number(estimate.total_amount).toFixed(2)} that we sent over.\n\nDo you have any questions or would you like to make any changes? We're happy to help.\n\nPlease reply to this email or call ${settings?.business_phone || ''} to move forward.\n\nThank you,\n${biz}`,
        }),
      })
    }

    await supabase.from('estimates').update({
      follow_up_sent_at: new Date().toISOString(),
      follow_up_count: (estimate.follow_up_count || 0) + 1,
    }).eq('id', estimate.id)

    checkUnsoldEstimates()
  }

  async function loadDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const { count: openJobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['unassigned', 'scheduled', 'en_route', 'in_progress'])

      const { data: todaysJobs } = await supabase
        .from('jobs')
        .select('id, job_number, customer_name, service_type, scheduled_at, status, assigned_tech_name')
        .gte('scheduled_at', today)
        .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0])
        .order('scheduled_at', { ascending: true })
        .limit(10)

      const { data: activeTechs } = await supabase
        .from('technicians')
        .select('id, full_name, current_status, current_job_id')
        .eq('is_active', true)

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .gte('created_at', monthStart)

      const revenueMTD = invoices?.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0
      const overdueCount = invoices?.filter(inv => inv.status === 'overdue').length || 0

      setStats({
        openJobs: openJobs || 0,
        scheduledToday: todaysJobs?.length || 0,
        techsActive: activeTechs?.filter(t => t.current_status !== 'off_duty').length || 0,
        revenueMTD,
        overdueCount,
      })
      setJobs(todaysJobs || [])
      setTechs(activeTechs || [])

      const alertList = []
      const urgentUnassigned = todaysJobs?.filter(j => j.status === 'urgent' && !j.assigned_tech_name)
      urgentUnassigned?.forEach(j => alertList.push({
        type: 'urgent',
        title: `Urgent job ${j.job_number} unassigned`,
        message: `${j.customer_name} · ${format(new Date(j.scheduled_at), 'h:mm a')}`,
      }))
      if (overdueCount > 0) alertList.push({
        type: 'warning',
        title: `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue`,
        message: 'Review payment status',
      })
      setAlerts(alertList)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Good morning${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        actions={
          <Link to="/jobs/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Job
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Open Jobs" value={stats.openJobs} sub={stats.openJobs > 0 ? `${stats.openJobs} active` : 'All caught up'} icon={ClipboardList} />
        <StatCard label="Scheduled Today" value={stats.scheduledToday} sub="See dispatch board" icon={Calendar} />
        <StatCard label="Techs Active" value={stats.techsActive} sub={stats.techsActive > 0 ? 'On the field' : 'No techs active'} icon={Users} />
        <StatCard
          label="Revenue MTD"
          value={`$${stats.revenueMTD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'On track'}
          warning={stats.overdueCount > 0}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="card overflow-hidden">
          <div className="card-header">
            <span className="card-title-serif">Today's Job Board</span>
            <Link to="/jobs" className="text-xs text-navy-200 hover:text-white flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList size={28} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-3">No jobs scheduled for today</p>
              <Link to="/jobs/new" className="btn-secondary inline-flex items-center gap-1 text-sm">
                <Plus size={14} /> Schedule a Job
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-50">
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Job</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Customer</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Service</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Tech</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Time</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/jobs/${job.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-xs text-navy-900">{job.customer_name}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{job.service_type}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{job.assigned_tech_name || <span className="text-slate-400">Unassigned</span>}</td>
                    <td className="py-3 px-2 text-xs text-slate-600">{format(new Date(job.scheduled_at), 'h:mm a')}</td>
                    <td className="py-3 px-2"><StatusPill status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Techs on the field
            </div>
            {techs.length === 0 ? (
              <p className="text-xs text-slate-400">No active techs</p>
            ) : (
              <div className="space-y-2">
                {techs.slice(0, 5).map(tech => (
                  <div key={tech.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 text-[10px] font-medium flex items-center justify-center border border-navy-200">
                      {tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-navy-900 truncate">{tech.full_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {tech.current_status === 'on_job' ? 'On job' :
                         tech.current_status === 'en_route' ? 'En route' :
                         tech.current_status === 'available' ? 'Available' : 'Off duty'}
                      </div>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      tech.current_status === 'on_job' ? 'bg-emerald-500' :
                      tech.current_status === 'en_route' ? 'bg-amber-500' :
                      tech.current_status === 'available' ? 'bg-blue-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reminderJobs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-[10px] uppercase tracking-wider text-blue-800 font-medium mb-2 flex items-center gap-1.5">
                <Bell size={12} /> {reminderJobs.length} Reminder{reminderJobs.length !== 1 ? 's' : ''} to Send
              </div>
              <div className="space-y-1.5 mb-3">
                {reminderJobs.slice(0, 3).map(j => (
                  <div key={j.id} className="text-xs text-blue-900">
                    <strong>{j.job_number}</strong> · {j.customer_name}
                    <div className="text-blue-700">{format(new Date(j.scheduled_at), 'MMM d \'at\' h:mm a')}</div>
                  </div>
                ))}
              </div>
              <button onClick={sendAllReminders} disabled={sendingReminders}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium">
                {sendingReminders ? 'Sending…' : `Send ${reminderJobs.length} Reminder SMS`}
              </button>
            </div>
          )}

          {unsoldEstimates.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-800 font-medium mb-2 flex items-center gap-1.5">
                <Clock size={12} /> {unsoldEstimates.length} Unsold Estimate{unsoldEstimates.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-2">
                {unsoldEstimates.slice(0, 3).map(est => (
                  <div key={est.id} className="flex items-center justify-between">
                    <div className="text-xs">
                      <div className="text-amber-900 font-medium">{est.customer_name}</div>
                      <div className="text-amber-700">{est.estimate_number} · ${Number(est.total_amount).toFixed(0)}</div>
                    </div>
                    <button onClick={() => sendEstimateFollowUp(est)}
                      className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded">
                      Follow up
                    </button>
                  </div>
                ))}
              </div>
              {unsoldEstimates.length > 3 && (
                <Link to="/estimates" className="text-[10px] text-amber-700 hover:underline mt-2 block">
                  +{unsoldEstimates.length - 3} more →
                </Link>
              )}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="bg-ember-50 border border-ember-200 rounded-md p-4">
              <div className="text-[10px] uppercase tracking-wider text-ember-800 font-medium mb-3 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Alerts
              </div>
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="text-xs">
                    <div className="font-medium text-ember-900">{alert.title}</div>
                    <div className="text-ember-700">{alert.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-navy-900 rounded-md p-4">
            <div className="text-[10px] uppercase tracking-wider text-navy-300 font-medium mb-3">
              Quick actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/jobs/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <Plus size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">New Job</div>
              </Link>
              <Link to="/customers/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <Users size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Add Customer</div>
              </Link>
              <Link to="/estimates/new" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <FileText size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Estimate</div>
              </Link>
              <Link to="/campaigns" className="bg-navy-800 hover:bg-navy-700 transition-colors rounded p-3 text-center">
                <Bell size={16} className="text-ember-500 mx-auto mb-1" />
                <div className="text-[10px] text-white">Campaign</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
