import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { format } from 'date-fns'
import { Megaphone, Plus, Send, X, Save, Users, Mail, MessageSquare, CheckCircle } from 'lucide-react'

const TEMPLATES = [
  {
    name: 'Spring AC Tune-up',
    subject: 'Time for Your Spring AC Tune-up!',
    body: `Hi {first_name},\n\nSpring is here! Make sure your AC is ready for the heat with a professional tune-up from {business_name}.\n\nSchedule your appointment today and enjoy peace of mind all summer long.\n\nCall us at {business_phone} or reply to this message to book.\n\nThank you,\n{business_name}`,
  },
  {
    name: 'Fall Heating Check',
    subject: 'Get Your Heating System Ready for Fall!',
    body: `Hi {first_name},\n\nCooler weather is just around the corner! Don't get caught in the cold — schedule your annual heating tune-up with {business_name} today.\n\nWe'll inspect your system from top to bottom to make sure you're ready.\n\nCall {business_phone} to schedule.\n\n{business_name}`,
  },
  {
    name: 'Filter Reminder',
    subject: 'Filter Change Reminder from {business_name}',
    body: `Hi {first_name},\n\nDid you know that dirty air filters can reduce your HVAC efficiency by up to 15%? It's time for a filter change!\n\nWe offer filter replacement starting at just $18. Call us at {business_phone} to schedule a quick visit.\n\n{business_name}`,
  },
  {
    name: 'Membership Renewal',
    subject: 'Your Maintenance Plan is Up for Renewal',
    body: `Hi {first_name},\n\nYour annual maintenance plan with {business_name} is coming up for renewal. As a valued member, you enjoy priority scheduling, discounts, and peace of mind year-round.\n\nRenew today by calling {business_phone}.\n\nThank you for your continued trust,\n{business_name}`,
  },
]

function CampaignForm({ onSave, onCancel, settings }) {
  const [form, setForm] = useState({
    name: '', campaign_type: 'email', subject: '', body: '',
    filter_customer_type: '', filter_has_equipment: '',
  })
  const [preview, setPreview] = useState([])
  const [previewCount, setPreviewCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { fetchPreview() }, [form.filter_customer_type])

  async function fetchPreview() {
    let q = supabase.from('customers').select('id, first_name, last_name, company_name, customer_type, email, phone').eq('is_active', true)
    if (form.filter_customer_type) q = q.eq('customer_type', form.filter_customer_type)
    const { data, count } = await q.select('id, first_name, email, phone', { count: 'exact' }).limit(5)
    setPreview(data || [])
    // Get count separately
    let cq = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true)
    if (form.filter_customer_type) cq = cq.eq('customer_type', form.filter_customer_type)
    const { count: total } = await cq
    setPreviewCount(total || 0)
  }

  function applyTemplate(t) {
    setForm(prev => ({
      ...prev,
      name: t.name,
      subject: t.subject.replace('{business_name}', settings?.business_name || 'Genesis Air Systems'),
      body: t.body
        .replace(/{business_name}/g, settings?.business_name || 'Genesis Air Systems')
        .replace(/{business_phone}/g, settings?.business_phone || ''),
    }))
  }

  async function handleSend() {
    if (!confirm(`Send this campaign to ${previewCount} customer${previewCount !== 1 ? 's' : ''}? This will send real emails/SMS.`)) return
    setSending(true)
    // Save campaign record
    const { data: campaign } = await supabase.from('marketing_campaigns').insert({
      ...form,
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: previewCount,
    }).select().single()

    // Get all matching customers
    let q = supabase.from('customers').select('id, first_name, last_name, company_name, customer_type, email, phone').eq('is_active', true)
    if (form.filter_customer_type) q = q.eq('customer_type', form.filter_customer_type)
    const { data: customers } = await q

    // Send emails via send-email edge function
    const { data: { session } } = await supabase.auth.getSession()
    let successCount = 0
    for (const customer of (customers || [])) {
      const name = customer.customer_type === 'commercial' ? customer.company_name : customer.first_name
      const personalizedBody = form.body.replace(/{first_name}/g, name)
      try {
        if ((form.campaign_type === 'email' || form.campaign_type === 'both') && customer.email) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: customer.email, to_name: name, subject: form.subject, body: personalizedBody }),
          })
          successCount++
        }
        if ((form.campaign_type === 'sms' || form.campaign_type === 'both') && customer.phone) {
          const smsBody = personalizedBody.replace(/<[^>]+>/g, '').slice(0, 160)
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: customer.phone, to_name: name, body: smsBody, sms_type: 'campaign', related_id: campaign?.id }),
          })
        }
      } catch (e) { /* continue */ }
    }

    setSending(false)
    setSent(true)
    setTimeout(() => { onSave() }, 2000)
  }

  async function saveDraft() {
    setSaving(true)
    await supabase.from('marketing_campaigns').insert({ ...form, status: 'draft', sent_count: 0 })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-md shadow-elevated max-w-2xl w-full p-6 my-8">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-serif text-xl text-navy-900">New Campaign</h2>
          <button onClick={onCancel}><X size={20} className="text-slate-400" /></button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
            <div className="font-medium text-lg text-navy-900">Campaign Sent!</div>
            <div className="text-sm text-slate-500">Delivered to {previewCount} customers</div>
          </div>
        ) : (
          <>
            {/* Templates */}
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Quick Templates</div>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => applyTemplate(t)}
                    className="text-xs px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-700 rounded border border-navy-100">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Campaign Name *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Send Via</label>
                <select className="input" value={form.campaign_type} onChange={e => setForm({ ...form, campaign_type: e.target.value })}>
                  <option value="email">Email only</option>
                  <option value="sms">SMS only</option>
                  <option value="both">Email + SMS</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="label">Audience Filter</label>
              <select className="input" value={form.filter_customer_type} onChange={e => setForm({ ...form, filter_customer_type: e.target.value })}>
                <option value="">All active customers ({previewCount})</option>
                <option value="residential">Residential only</option>
                <option value="commercial">Commercial only</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Will send to <strong>{previewCount}</strong> customer{previewCount !== 1 ? 's' : ''}
                {preview.length > 0 && `: ${preview.map(c => c.first_name).join(', ')}${previewCount > 5 ? '…' : ''}`}
              </p>
            </div>

            {(form.campaign_type === 'email' || form.campaign_type === 'both') && (
              <div className="mb-3">
                <label className="label">Email Subject</label>
                <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
            )}

            <div className="mb-4">
              <label className="label">Message Body</label>
              <textarea rows="6" className="input font-mono text-sm" value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Use {first_name}, {business_name}, {business_phone} as placeholders" />
              <p className="text-[10px] text-slate-400 mt-1">Placeholders: {'{first_name}'} {'{business_name}'} {'{business_phone}'}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="btn-secondary">Cancel</button>
              <button onClick={saveDraft} disabled={saving} className="btn-secondary inline-flex items-center gap-2">
                <Save size={14} /> Save Draft
              </button>
              <button onClick={handleSend} disabled={sending || previewCount === 0 || !form.name}
                className="btn-primary inline-flex items-center gap-2">
                <Send size={14} /> {sending ? `Sending to ${previewCount}…` : `Send to ${previewCount}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    load()
    supabase.from('business_settings').select('business_name, business_phone').eq('id', 1).single()
      .then(({ data }) => setSettings(data))
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false })
    setCampaigns(data || [])
    setLoading(false)
  }

  const totalSent = campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + (c.sent_count || 0), 0)

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={`${campaigns.filter(c => c.status === 'sent').length} campaigns sent · ${totalSent} total deliveries`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Campaign
          </button>
        }
      />

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="card p-10 text-center">
          <Megaphone size={32} className="text-navy-200 mx-auto mb-3" />
          <div className="font-medium text-navy-900 mb-1">No campaigns yet</div>
          <p className="text-sm text-slate-500 mb-4">Send seasonal tune-up reminders, filter change alerts, or membership renewal notices to all your customers at once.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 mx-auto">
            <Plus size={16} /> Create First Campaign
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50 border-b border-navy-100">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Campaign</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Type</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Sent To</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-2">Status</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                  <td className="py-2.5 px-4">
                    <div className="text-sm font-medium text-navy-900">{c.name}</div>
                    {c.subject && <div className="text-[11px] text-slate-500">{c.subject}</div>}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      {(c.campaign_type === 'email' || c.campaign_type === 'both') && <Mail size={11} />}
                      {(c.campaign_type === 'sms' || c.campaign_type === 'both') && <MessageSquare size={11} />}
                      <span className="capitalize">{c.campaign_type}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right text-sm font-medium text-navy-900">{c.sent_count || 0}</td>
                  <td className="py-2.5 px-2">
                    <span className={`pill text-xs ${c.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-100 text-navy-700'}`}>
                      {c.status === 'sent' ? '✓ Sent' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">
                    {c.sent_at ? format(new Date(c.sent_at), 'MMM d, yyyy') : format(new Date(c.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CampaignForm settings={settings} onSave={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
      )}
    </div>
  )
}
