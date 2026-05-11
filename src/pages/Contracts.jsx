import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { format, differenceInDays, parseISO } from 'date-fns'
import {
  Plus, RefreshCw, Repeat, Calendar, DollarSign,
  AlertTriangle, CheckCircle, Pause, Building2, Home
} from 'lucide-react'

const FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Twice a Year',
  annual: 'Annual',
  custom: 'Custom',
}

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-800',
  expired: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-800',
}

export function Contracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState(null)
  const [filter, setFilter] = useState('active')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('service_contracts')
      .select('*, customer:customer_id(customer_type, first_name, last_name, company_name)')
      .order('next_service_due', { ascending: true, nullsFirst: false })

    if (filter !== 'all') query = query.eq('status', filter)

    const { data } = await query
    setContracts(data || [])
    setLoading(false)
  }

  async function runGeneration() {
    setGenerating(true)
    setGenerationResult(null)
    const { data, error } = await supabase.rpc('generate_contract_jobs')
    setGenerating(false)

    if (error) {
      setGenerationResult({ error: error.message })
      return
    }

    setGenerationResult({
      count: (data || []).length,
      success: true,
    })
    load()
  }

  const activeCount = contracts.filter(c => c.status === 'active').length
  const dueSoon = contracts.filter(c => {
    if (c.status !== 'active' || !c.next_service_due) return false
    const days = differenceInDays(parseISO(c.next_service_due), new Date())
    return days <= (c.days_before_to_generate || 14)
  }).length

  return (
    <div>
      <PageHeader
        title="Service Contracts"
        subtitle={`${activeCount} active${dueSoon > 0 ? ` · ${dueSoon} due soon` : ''}`}
        actions={
          <>
            <button onClick={runGeneration} disabled={generating}
              className="btn-secondary inline-flex items-center gap-2">
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating…' : 'Generate Due Jobs'}
            </button>
            <Link to="/contracts/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> New Contract
            </Link>
          </>
        }
      />

      {generationResult && (
        <div className={`rounded p-3 mb-4 text-sm ${
          generationResult.error
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {generationResult.error ? (
            <span><AlertTriangle size={14} className="inline mr-1.5" /> {generationResult.error}</span>
          ) : (
            <span><CheckCircle size={14} className="inline mr-1.5" />
              {generationResult.count > 0
                ? `Generated ${generationResult.count} new job${generationResult.count > 1 ? 's' : ''} from contracts.`
                : 'No contracts due — all caught up.'}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-4">
        {['active', 'paused', 'expired', 'cancelled', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={filter === s ? 'btn-navy text-xs px-3 py-1.5 capitalize' : 'btn-ghost text-xs capitalize'}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading contracts…</div>
      ) : contracts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Repeat}
            title={filter === 'active' ? 'No active contracts' : `No ${filter} contracts`}
            message="Service contracts auto-generate jobs at regular intervals — perfect for annual tune-ups and recurring maintenance."
            action={
              <Link to="/contracts/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Create First Contract
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const daysUntilDue = c.next_service_due ? differenceInDays(parseISO(c.next_service_due), new Date()) : null
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0
            const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= (c.days_before_to_generate || 14)

            return (
              <Link key={c.id} to={`/contracts/${c.id}`}
                className={`card p-4 block hover:shadow-elevated transition-shadow ${
                  isOverdue ? 'border-l-4 border-l-red-500' :
                  isDueSoon ? 'border-l-4 border-l-ember-500' : ''
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-navy-900">{c.contract_name}</h3>
                      <span className={`pill ${STATUS_STYLES[c.status]}`}>{c.status.toUpperCase()}</span>
                      <span className="pill pill-unassigned">{FREQUENCY_LABELS[c.frequency]}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      {c.customer?.customer_type === 'commercial' ? <Building2 size={11} /> : <Home size={11} />}
                      {c.customer_name}
                    </div>
                  </div>
                  {c.price_per_visit && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Per visit</div>
                      <div className="text-sm font-medium text-navy-900">${Number(c.price_per_visit).toFixed(2)}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-3 border-t border-navy-50">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Service</div>
                    <div className="text-navy-900">{c.service_type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Next Due</div>
                    {c.next_service_due ? (
                      <div className={isOverdue ? 'text-red-700 font-medium' : isDueSoon ? 'text-ember-700 font-medium' : 'text-navy-900'}>
                        {format(parseISO(c.next_service_due), 'MMM d, yyyy')}
                        {isOverdue && <span className="ml-1 text-[10px]">({Math.abs(daysUntilDue)}d overdue)</span>}
                        {isDueSoon && !isOverdue && <span className="ml-1 text-[10px]">({daysUntilDue}d)</span>}
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">Not scheduled</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Last Service</div>
                    <div className="text-navy-900">
                      {c.last_service_completed ? format(parseISO(c.last_service_completed), 'MMM d, yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Auto-Generate</div>
                    <div className="text-navy-900">
                      {c.auto_generate_jobs ? `${c.days_before_to_generate}d before` : 'Manual'}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
