import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import {
  Save, Building2, DollarSign, Mail, Bell, Settings as SettingsIcon,
  CheckCircle, AlertTriangle, Eye, EyeOff, ExternalLink
} from 'lucide-react'

const SECTIONS = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'financial', label: 'Financial Defaults', icon: DollarSign },
  { id: 'email', label: 'Email & Notifications', icon: Mail },
  { id: 'service', label: 'Service Defaults', icon: SettingsIcon },
]

export function Settings() {
  const [settings, setSettings] = useState(null)
  const [activeSection, setActiveSection] = useState('business')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [emailTestStatus, setEmailTestStatus] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('business_settings').select('*').eq('id', 1).single()
    setSettings(data || {})
    setLoading(false)
  }

  const update = (field, value) => setSettings(prev => ({ ...prev, [field]: value }))

  async function save() {
    setSaving(true)
    setError('')
    const { id, created_at, updated_at, ...payload } = settings
    const { error } = await supabase.from('business_settings').update(payload).eq('id', 1)
    setSaving(false)
    if (error) setError(error.message)
    else { setSavedAt(new Date()); setTimeout(() => setSavedAt(null), 3000) }
  }

  async function testEmail() {
    setEmailTestStatus({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.business_email || settings.sendgrid_from_email,
          subject: `Test email from ${settings.business_name || 'Genesis Air Systems'}`,
          email_type: 'manual',
          html: `<div style="font-family:sans-serif;padding:24px;">
            <h2 style="color:#1E3A8A;">✓ SendGrid is configured correctly</h2>
            <p>If you can read this, your SendGrid integration is working. You're all set.</p>
          </div>`,
        }),
      })
      const result = await r.json()
      if (r.ok) setEmailTestStatus({ success: true, message: 'Test email sent. Check your inbox.' })
      else setEmailTestStatus({ error: true, message: result.error || 'Failed' })
    } catch (err) {
      setEmailTestStatus({ error: true, message: err.message })
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading settings…</div>

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your business defaults, integrations, and preferences"
        actions={
          <button onClick={save} disabled={saving}
            className="btn-primary inline-flex items-center gap-2">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        }
      />

      {savedAt && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded text-sm mb-4 flex items-center gap-2">
          <CheckCircle size={14} /> Settings saved {savedAt.toLocaleTimeString()}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        <nav className="card p-2 h-fit lg:sticky lg:top-20">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-navy-900 text-white'
                    : 'text-navy-700 hover:bg-navy-50'
                }`}>
                <Icon size={14} />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="space-y-4">
          {activeSection === 'business' && (
            <div className="card p-6">
              <h2 className="font-serif text-lg text-navy-900 mb-1">Business Identity</h2>
              <p className="text-xs text-slate-500 mb-6">This info appears on invoices, estimates, and emails sent to customers</p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" value={settings.business_name || ''} onChange={(e) => update('business_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Tagline</label>
                  <input className="input" value={settings.business_tagline || ''} onChange={(e) => update('business_tagline', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Contact Email</label>
                  <input type="email" className="input" value={settings.business_email || ''} onChange={(e) => update('business_email', e.target.value)} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" value={settings.business_phone || ''} onChange={(e) => update('business_phone', e.target.value)} />
                </div>
              </div>

              <div className="mb-3">
                <label className="label">Website</label>
                <input className="input" value={settings.business_website || ''} onChange={(e) => update('business_website', e.target.value)} placeholder="https://" />
              </div>

              <div className="border-t border-navy-100 pt-4 mt-4">
                <h3 className="text-sm font-medium text-navy-900 mb-3">Business Address</h3>
                <input className="input mb-2" value={settings.business_address_line1 || ''} onChange={(e) => update('business_address_line1', e.target.value)} placeholder="Street address" />
                <input className="input mb-2" value={settings.business_address_line2 || ''} onChange={(e) => update('business_address_line2', e.target.value)} placeholder="Suite, unit, etc. (optional)" />
                <div className="grid grid-cols-3 gap-2">
                  <input className="input" value={settings.business_city || ''} onChange={(e) => update('business_city', e.target.value)} placeholder="City" />
                  <input className="input uppercase" maxLength="2" value={settings.business_state || ''} onChange={(e) => update('business_state', e.target.value)} placeholder="State" />
                  <input className="input" value={settings.business_zip || ''} onChange={(e) => update('business_zip', e.target.value)} placeholder="ZIP" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'financial' && (
            <div className="card p-6">
              <h2 className="font-serif text-lg text-navy-900 mb-1">Financial Defaults</h2>
              <p className="text-xs text-slate-500 mb-6">Pre-fill values used on new estimates and invoices</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label">Default Tax Rate</label>
                  <input type="number" step="0.001" min="0" max="1" className="input"
                    value={settings.default_tax_rate || 0}
                    onChange={(e) => update('default_tax_rate', e.target.value)} />
                  <p className="text-[10px] text-slate-400 mt-1">Decimal — 0.0675 = 6.75% (NC general sales tax)</p>
                </div>
                <div>
                  <label className="label">Default Payment Terms</label>
                  <select className="input"
                    value={settings.default_payment_terms || 'Net 30'}
                    onChange={(e) => update('default_payment_terms', e.target.value)}>
                    <option>Due on Receipt</option>
                    <option>Net 7</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="label">Default Estimate Terms</label>
                <textarea rows="3" className="input"
                  value={settings.default_estimate_terms || ''}
                  onChange={(e) => update('default_estimate_terms', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="label">Default Estimate Notes</label>
                <textarea rows="2" className="input"
                  value={settings.default_estimate_notes || ''}
                  onChange={(e) => update('default_estimate_notes', e.target.value)}
                  placeholder="Appears on every new estimate (e.g., warranty, scope notes)" />
              </div>

              <div>
                <label className="label">Default Invoice Notes</label>
                <textarea rows="2" className="input"
                  value={settings.default_invoice_notes || ''}
                  onChange={(e) => update('default_invoice_notes', e.target.value)}
                  placeholder="Payment instructions, thank-you message" />
              </div>
            </div>
          )}

          {activeSection === 'email' && (
            <>
              <div className="card p-6">
                <h2 className="font-serif text-lg text-navy-900 mb-1">SendGrid Integration</h2>
                <p className="text-xs text-slate-500 mb-6">Connect your SendGrid account to send branded emails to customers automatically</p>

                <div className="mb-3">
                  <label className="label">SendGrid API Key</label>
                  <div className="relative">
                    <input type={showApiKey ? 'text' : 'password'} className="input pr-10"
                      value={settings.sendgrid_api_key || ''}
                      onChange={(e) => update('sendgrid_api_key', e.target.value)}
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx" />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-900">
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Get your key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer"
                      className="text-ember-600 hover:underline inline-flex items-center gap-0.5">
                      SendGrid Settings → API Keys <ExternalLink size={10} /></a>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label">From Email *</label>
                    <input type="email" className="input"
                      value={settings.sendgrid_from_email || ''}
                      onChange={(e) => update('sendgrid_from_email', e.target.value)}
                      placeholder="hello@genesisair.com" />
                    <p className="text-[10px] text-slate-400 mt-1">Must be verified in SendGrid</p>
                  </div>
                  <div>
                    <label className="label">From Name</label>
                    <input className="input"
                      value={settings.sendgrid_from_name || ''}
                      onChange={(e) => update('sendgrid_from_name', e.target.value)}
                      placeholder="Genesis Air Systems" />
                  </div>
                </div>

                <button onClick={testEmail}
                  disabled={!settings.sendgrid_api_key || !settings.sendgrid_from_email || emailTestStatus?.loading}
                  className="btn-secondary text-xs inline-flex items-center gap-2">
                  {emailTestStatus?.loading ? 'Sending test…' : '✉ Send Test Email'}
                </button>

                {emailTestStatus && !emailTestStatus.loading && (
                  <div className={`mt-3 px-3 py-2 rounded text-sm ${
                    emailTestStatus.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                    'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {emailTestStatus.message}
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h2 className="font-serif text-lg text-navy-900 mb-1">Auto-Email Triggers</h2>
                <p className="text-xs text-slate-500 mb-6">Choose which actions automatically send emails to customers</p>

                <div className="space-y-3">
                  {[
                    { key: 'auto_email_invoice_on_send', label: 'Email invoice when status is set to "Sent"', desc: 'Customer gets a copy of the invoice via email' },
                    { key: 'auto_email_estimate_on_send', label: 'Email estimate when status is set to "Sent"', desc: 'Customer gets a copy of the estimate via email' },
                    { key: 'notify_on_new_request', label: 'Acknowledge new service requests', desc: 'Customer gets a "we got it" email when they submit a request' },
                    { key: 'auto_email_overdue_reminders', label: 'Send overdue payment reminders', desc: 'Manual trigger for now — full automation coming later' },
                  ].map(t => (
                    <label key={t.key} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-navy-50/30 rounded">
                      <input type="checkbox" checked={!!settings[t.key]}
                        onChange={(e) => update(t.key, e.target.checked)}
                        className="mt-0.5 rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-navy-900">{t.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'service' && (
            <div className="card p-6">
              <h2 className="font-serif text-lg text-navy-900 mb-1">Service Defaults</h2>
              <p className="text-xs text-slate-500 mb-6">Pre-fill values used when creating jobs and contracts</p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Default Job Duration (min)</label>
                  <input type="number" min="15" step="15" className="input"
                    value={settings.default_job_duration_minutes || 60}
                    onChange={(e) => update('default_job_duration_minutes', e.target.value)} />
                </div>
                <div>
                  <label className="label">Contract Auto-Generate Lead Time (days)</label>
                  <input type="number" min="1" max="60" className="input"
                    value={settings.default_contract_lead_days || 14}
                    onChange={(e) => update('default_contract_lead_days', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Business Hours Start</label>
                  <input type="time" className="input"
                    value={settings.business_hours_start || '08:00'}
                    onChange={(e) => update('business_hours_start', e.target.value)} />
                </div>
                <div>
                  <label className="label">Business Hours End</label>
                  <input type="time" className="input"
                    value={settings.business_hours_end || '18:00'}
                    onChange={(e) => update('business_hours_end', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
