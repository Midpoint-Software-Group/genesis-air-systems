import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  ArrowLeft, Pause, Play, X, Repeat, Calendar, DollarSign,
  CheckCircle, AlertTriangle, Plus
} from 'lucide-react'

const FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Twice a Year',
  annual: 'Annual',
  custom: 'Custom',
}

export function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: j }] = await Promise.all([
      supabase.from('service_contracts').select('*').eq('id', id).single(),
      supabase.from('jobs').select('id, job_number, scheduled_at, status, assigned_tech_name, completed_at')
        .eq('contract_id', id).order('scheduled_at', { ascending: false }),
    ])
    setContract(c)
    setJobs(j || [])
    setLoading(false)
  }

  async function updateStatus(newStatus) {
    setUpdating(true)
    setError('')
    const { error } = await supabase.from('service_contracts').update({ status: newStatus }).eq('id', id)
    setUpdating(false)
    if (error) setError(error.message)
    else load()
  }

  async function generateNextJob() {
    setUpdating(true)
    setError('')

    const { data: customer } = await supabase.from('customers').select('*').eq('id', contract.customer_id).single()
    const scheduledAt = contract.next_service_due
      ? `${contract.next_service_due}T10:00:00`
      : new Date(Date.now() + 7 * 86400000).toISOString()

    const { data: job, error: jobError } = await supabase.from('jobs').insert({
      contract_id: contract.id,
      customer_id: contract.customer_id,
      customer_name: contract.customer_name,
      customer_type: customer.customer_type,
      service_type: contract.service_type,
      description: `Scheduled service from contract: ${contract.contract_name}`,
      priority: 'normal',
      status: 'unassigned',
      scheduled_at: scheduledAt,
      estimated_duration_minutes: contract.default_duration_minutes,
      address_line1: customer.address_line1,
      address_line2: customer.address_line2,
      city: customer.city,
      state: customer.state,
      zip_code: customer.zip_code,
    }).select().single()

    setUpdating(false)
    if (jobError) setError(jobError.message)
    else navigate(`/jobs/${job.id}`)
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
  if (!contract) return <div className="p-8 text-center text-sm text-slate-400">Contract not found</div>

  const daysUntilDue = contract.next_service_due
    ? differenceInDays(parseISO(contract.next_service_due), new Date())
    : null

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {contract.contract_name}
            <StatusPill status={contract.status} />
          </span>
        }
        subtitle={`${contract.customer_name} · ${FREQUENCY_LABELS[contract.frequency]} ${contract.service_type}`}
        actions={
          <>
            <button onClick={() => navigate('/contracts')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            {contract.status === 'active' && (
              <>
                <button onClick={() => updateStatus('paused')} disabled={updating}
                  className="btn-secondary inline-flex items-center gap-2 text-amber-700 border-amber-200 hover:bg-amber-50">
                  <Pause size={14} /> Pause
                </button>
                <button onClick={generateNextJob} disabled={updating}
                  className="btn-primary inline-flex items-center gap-2">
                  <Plus size={14} /> Generate Job Now
                </button>
              </>
            )}
            {contract.status === 'paused' && (
              <button onClick={() => updateStatus('active')} disabled={updating}
                className="btn-primary inline-flex items-center gap-2">
                <Play size={14} /> Resume
              </button>
            )}
            {!['cancelled'].includes(contract.status) && (
              <button onClick={() => { if (confirm('Cancel this contract?')) updateStatus('cancelled') }}
                disabled={updating}
                className="btn-secondary inline-flex items-center gap-2 text-red-700 border-red-200 hover:bg-red-50">
                <X size={14} /> Cancel
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Schedule
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Start Date</div>
                <div className="text-navy-900">{format(parseISO(contract.start_date), 'MMM d, yyyy')}</div>
              </div>
              {contract.end_date && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">End Date</div>
                  <div className="text-navy-900">{format(parseISO(contract.end_date), 'MMM d, yyyy')}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Frequency</div>
                <div className="text-navy-900">
                  {FREQUENCY_LABELS[contract.frequency]}
                  {contract.frequency === 'custom' && ` (${contract.custom_interval_days}d)`}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Next Service</div>
                {contract.next_service_due ? (
                  <div className={
                    daysUntilDue < 0 ? 'text-red-700 font-medium' :
                    daysUntilDue <= (contract.days_before_to_generate || 14) ? 'text-ember-700 font-medium' :
                    'text-navy-900'
                  }>
                    {format(parseISO(contract.next_service_due), 'MMM d, yyyy')}
                    {daysUntilDue !== null && (
                      <span className="ml-1 text-[10px]">
                        ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `in ${daysUntilDue}d`})
                      </span>
                    )}
                  </div>
                ) : <div className="text-slate-400 italic">Not scheduled</div>}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Last Completed</div>
                <div className="text-navy-900">
                  {contract.last_service_completed ? format(parseISO(contract.last_service_completed), 'MMM d, yyyy') : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Auto-Generate</div>
                <div className="text-navy-900">
                  {contract.auto_generate_jobs ? `Yes, ${contract.days_before_to_generate}d before` : 'Manual only'}
                </div>
              </div>
            </div>
          </div>

          {contract.notes && (
            <div className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 pb-2 border-b border-navy-50">
                Notes
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title-serif">Generated Jobs ({jobs.length})</span>
            </div>
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No jobs yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-50">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Job #</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Scheduled</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Tech</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                      <td className="py-2.5 px-4"><Link to={`/jobs/${j.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{j.job_number}</Link></td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{format(new Date(j.scheduled_at), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{j.assigned_tech_name || '—'}</td>
                      <td className="py-2.5 px-2"><StatusPill status={j.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Customer
            </div>
            <Link to={`/customers/${contract.customer_id}`} className="text-navy-900 hover:text-ember-600 font-medium">
              {contract.customer_name}
            </Link>
          </div>

          {contract.price_per_visit && (
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Pricing</div>
              <div className="flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600" />
                <span className="font-serif text-2xl text-navy-900">{Number(contract.price_per_visit).toFixed(2)}</span>
                <span className="text-xs text-slate-500">per visit</span>
              </div>
            </div>
          )}

          <div className="bg-navy-900 rounded p-4 text-white">
            <div className="text-[10px] uppercase tracking-wider text-navy-300 font-medium mb-3">Stats</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-navy-300">Total Jobs</span><span className="font-medium">{jobs.length}</span></div>
              <div className="flex justify-between"><span className="text-navy-300">Completed</span><span className="font-medium">{jobs.filter(j => j.status === 'completed').length}</span></div>
              <div className="flex justify-between"><span className="text-navy-300">Upcoming</span><span className="font-medium">{jobs.filter(j => ['unassigned', 'scheduled', 'en_route', 'in_progress'].includes(j.status)).length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
