import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { format } from 'date-fns'
import {
  Award, Users, Plus, Edit, X, Save, CheckCircle,
  Shield, Star, Zap
} from 'lucide-react'

const TIER_ICONS = { silver: Shield, gold: Star, platinum: Zap, custom: Award }
const TIER_GRADIENTS = {
  silver: 'from-slate-400 to-slate-500',
  gold: 'from-amber-400 to-amber-600',
  platinum: 'from-violet-500 to-purple-700',
  custom: 'from-navy-500 to-navy-700',
}

function PlanCard({ plan, memberCount, onEdit }) {
  const Icon = TIER_ICONS[plan.tier] || Award
  return (
    <div className="card overflow-hidden">
      <div className={`bg-gradient-to-r ${TIER_GRADIENTS[plan.tier]} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <span className="font-serif text-xl">{plan.name}</span>
          </div>
          <button onClick={() => onEdit(plan)} className="text-white/70 hover:text-white p-1">
            <Edit size={14} />
          </button>
        </div>
        <div className="mt-3 flex items-end gap-1">
          <span className="font-serif text-3xl">${Number(plan.price_annual || 0).toFixed(0)}</span>
          <span className="text-white/80 text-sm mb-0.5">/year</span>
          {plan.price_monthly && (
            <span className="text-white/70 text-xs mb-0.5 ml-2">${Number(plan.price_monthly).toFixed(2)}/mo</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-navy-900">
            <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
            <span>{plan.visits_per_year} service visit{plan.visits_per_year !== 1 ? 's' : ''} per year</span>
          </div>
          {plan.discount_pct > 0 && (
            <div className="flex items-center gap-2 text-sm text-navy-900">
              <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
              <span>{plan.discount_pct}% discount on all services</span>
            </div>
          )}
          {plan.includes_diagnostic && (
            <div className="flex items-center gap-2 text-sm text-navy-900">
              <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
              <span>Free diagnostic calls</span>
            </div>
          )}
          {plan.priority_booking && (
            <div className="flex items-center gap-2 text-sm text-navy-900">
              <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
              <span>Priority scheduling</span>
            </div>
          )}
        </div>
        <div className="pt-3 border-t border-navy-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users size={12} />
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
            <Link to={`/customers?plan=${plan.id}`} className="text-xs text-ember-600 hover:underline">
              View members →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanForm({ plan, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', tier: 'silver', price_annual: '', price_monthly: '',
    visits_per_year: 1, discount_pct: 0,
    includes_diagnostic: false, priority_booking: false,
    description: '', is_active: true, ...plan,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price_annual: form.price_annual ? Number(form.price_annual) : null,
      price_monthly: form.price_monthly ? Number(form.price_monthly) : null,
      visits_per_year: Number(form.visits_per_year),
      discount_pct: Number(form.discount_pct),
    }
    const result = form.id
      ? await supabase.from('membership_plans').update(payload).eq('id', form.id)
      : await supabase.from('membership_plans').insert(payload)
    setSaving(false)
    if (!result.error) onSave()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-elevated max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-serif text-xl text-navy-900">{form.id ? 'Edit Plan' : 'New Membership Plan'}</h2>
          <button type="button" onClick={onCancel}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Plan Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="label">Tier</label>
            <select className="input" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
              {['silver', 'gold', 'platinum', 'custom'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Annual Price ($)</label>
            <input type="number" step="0.01" className="input" value={form.price_annual} onChange={e => setForm({ ...form, price_annual: e.target.value })} />
          </div>
          <div>
            <label className="label">Monthly Price ($)</label>
            <input type="number" step="0.01" className="input" value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: e.target.value })} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Visits / Year</label>
            <input type="number" min="0" className="input" value={form.visits_per_year} onChange={e => setForm({ ...form, visits_per_year: e.target.value })} />
          </div>
          <div>
            <label className="label">Discount (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="input" value={form.discount_pct} onChange={e => setForm({ ...form, discount_pct: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {[
            { key: 'includes_diagnostic', label: 'Include free diagnostic calls' },
            { key: 'priority_booking', label: 'Priority scheduling' },
            { key: 'is_active', label: 'Active (visible to customers)' },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.checked })}
                className="rounded border-navy-200 text-ember-600" />
              <span className="text-sm text-navy-900">{f.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : (form.id ? 'Save Changes' : 'Create Plan')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function Memberships() {
  const [plans, setPlans] = useState([])
  const [members, setMembers] = useState([])
  const [editPlan, setEditPlan] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [assignCustomer, setAssignCustomer] = useState(null)
  const [customers, setCustomers] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: plansData }, { data: membersData }, { data: customersData }] = await Promise.all([
      supabase.from('membership_plans').select('*').order('price_annual'),
      supabase.from('customers').select('id, first_name, last_name, company_name, customer_type, membership_plan_id, membership_start_date, membership_renewal_date')
        .not('membership_plan_id', 'is', null),
      supabase.from('customers').select('id, first_name, last_name, company_name, customer_type').eq('is_active', true).order('last_name'),
    ])
    setPlans(plansData || [])
    setMembers(membersData || [])
    setCustomers(customersData || [])
    setLoading(false)
  }

  async function assignMembership(customerId, planId, startDate) {
    const renewal = new Date(startDate)
    renewal.setFullYear(renewal.getFullYear() + 1)
    await supabase.from('customers').update({
      membership_plan_id: planId || null,
      membership_start_date: planId ? startDate : null,
      membership_renewal_date: planId ? renewal.toISOString().slice(0, 10) : null,
    }).eq('id', customerId)
    setAssignCustomer(null)
    load()
  }

  const totalRevenue = plans.reduce((s, plan) => {
    const count = members.filter(m => m.membership_plan_id === plan.id).length
    return s + count * Number(plan.price_annual || 0)
  }, 0)

  return (
    <div>
      <PageHeader
        title="Memberships"
        subtitle={`${members.length} active members · $${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} ARR`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setAssignCustomer('new')} className="btn-secondary inline-flex items-center gap-2">
              <Users size={16} /> Assign Member
            </button>
            <button onClick={() => { setEditPlan(null); setShowForm(true) }} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> New Plan
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                memberCount={members.filter(m => m.membership_plan_id === plan.id).length}
                onEdit={p => { setEditPlan(p); setShowForm(true) }}
              />
            ))}
          </div>

          {/* Members list */}
          {members.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header">
                <span className="card-title-serif">Current Members</span>
              </div>
              <table className="w-full">
                <thead className="bg-navy-50/50 border-b border-navy-100">
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Customer</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Plan</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Start</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Renewal</th>
                    <th className="py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const plan = plans.find(p => p.id === m.membership_plan_id)
                    const isExpiringSoon = m.membership_renewal_date &&
                      new Date(m.membership_renewal_date) < new Date(Date.now() + 30 * 86400000)
                    const name = m.customer_type === 'commercial' ? m.company_name : `${m.first_name} ${m.last_name}`
                    return (
                      <tr key={m.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                        <td className="py-2.5 px-4">
                          <Link to={`/customers/${m.id}`} className="text-sm font-medium text-navy-900 hover:text-ember-600">{name}</Link>
                          <div className="text-[11px] text-slate-500 capitalize">{m.customer_type}</div>
                        </td>
                        <td className="py-2.5 px-2">
                          {plan && (
                            <span className={`pill text-white bg-gradient-to-r ${TIER_GRADIENTS[plan.tier]}`}>
                              {plan.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-slate-600">
                          {m.membership_start_date ? format(new Date(m.membership_start_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-xs">
                          <span className={isExpiringSoon ? 'text-amber-700 font-medium' : 'text-slate-600'}>
                            {m.membership_renewal_date ? format(new Date(m.membership_renewal_date), 'MMM d, yyyy') : '—'}
                            {isExpiringSoon && ' ⚠'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <button onClick={() => setAssignCustomer(m)}
                            className="text-xs text-slate-400 hover:text-navy-700">Edit</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Assign member modal */}
      {assignCustomer && (
        <AssignModal
          customers={customers}
          plans={plans}
          existing={assignCustomer === 'new' ? null : assignCustomer}
          onSave={assignMembership}
          onCancel={() => setAssignCustomer(null)}
        />
      )}

      {showForm && (
        <PlanForm plan={editPlan} onSave={() => { setShowForm(false); setEditPlan(null); load() }}
          onCancel={() => { setShowForm(false); setEditPlan(null) }} />
      )}
    </div>
  )
}

function AssignModal({ customers, plans, existing, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState(existing?.id || '')
  const [planId, setPlanId] = useState(existing?.membership_plan_id || '')
  const [startDate, setStartDate] = useState(existing?.membership_start_date || new Date().toISOString().slice(0, 10))

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-elevated max-w-sm w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-serif text-xl text-navy-900">{existing ? 'Edit Membership' : 'Assign Membership'}</h2>
          <button onClick={onCancel}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="mb-3">
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={!!existing}>
            <option value="">Select customer…</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.customer_type === 'commercial' ? c.company_name : `${c.first_name} ${c.last_name}`}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="label">Plan</label>
          <select className="input" value={planId} onChange={e => setPlanId(e.target.value)}>
            <option value="">Remove membership</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price_annual}/yr</option>)}
          </select>
        </div>
        {planId && (
          <div className="mb-4">
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave(customerId, planId, startDate)} disabled={!customerId}
            className="btn-primary inline-flex items-center gap-2">
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
