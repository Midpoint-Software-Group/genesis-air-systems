import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { Calendar, CheckCircle, X, ExternalLink, AlertCircle } from 'lucide-react'

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export function CalendarConnect() {
  const [searchParams] = useSearchParams()
  const [connection, setConnection] = useState(null)
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { load() }, [])

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      handleOAuthCallback(code)
    }
    const error = searchParams.get('error')
    if (error) setMessage({ error: true, text: `OAuth failed: ${error}` })
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: conn } = await supabase.from('calendar_connections')
      .select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle()
    setConnection(conn)
    setClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
    setLoading(false)
  }

  const redirectUri = `${window.location.origin}/settings/calendar`

  function startConnect() {
    if (!clientId) {
      setMessage({ error: true, text: 'Google Client ID not configured. See setup instructions below.' })
      return
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    })
    window.location.href = `${GOOGLE_OAUTH_URL}?${params.toString()}`
  }

  async function handleOAuthCallback(code) {
    setProcessing(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_code', code, redirect_uri: redirectUri }),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || 'Failed')
      setMessage({ success: true, text: `Connected as ${result.google_email}` })
      // Clean URL
      window.history.replaceState({}, '', '/settings/calendar')
      load()
    } catch (err) {
      setMessage({ error: true, text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect Google Calendar?')) return
    setProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      })
      setMessage({ success: true, text: 'Disconnected' })
      load()
    } catch (err) {
      setMessage({ error: true, text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>

  return (
    <div>
      <PageHeader
        title="Calendar Sync"
        subtitle="Push job appointments to your Google Calendar automatically"
      />

      {message && (
        <div className={`rounded p-3 mb-4 text-sm flex items-start gap-2 ${
          message.error ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {message.error ? <AlertCircle size={14} className="mt-0.5" /> : <CheckCircle size={14} className="mt-0.5" />}
          {message.text}
        </div>
      )}

      <div className="card p-6 max-w-2xl">
        {connection ? (
          <>
            <div className="flex items-start gap-3 mb-6 pb-4 border-b border-navy-100">
              <div className="w-12 h-12 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-navy-900">Connected to Google Calendar</div>
                <div className="text-sm text-slate-600">{connection.google_email}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Calendar ID: <code>{connection.calendar_id || 'primary'}</code>
                </div>
              </div>
              <button onClick={disconnect} disabled={processing}
                className="btn-secondary text-xs text-red-700 border-red-200 hover:bg-red-50 inline-flex items-center gap-1">
                <X size={12} /> Disconnect
              </button>
            </div>

            <h3 className="text-sm font-medium text-navy-900 mb-2">How it works</h3>
            <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
              <li>Open any job and click <strong>Sync to Calendar</strong></li>
              <li>The event is created on <code>{connection.calendar_id || 'your primary'}</code> calendar</li>
              <li>Updating the job's date, customer, or address updates the calendar event</li>
              <li>Color-coded by priority: <span className="text-red-700">red = urgent</span>, <span className="text-orange-700">orange = high</span>, blue = normal</li>
            </ul>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded bg-navy-50 text-navy-700 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <div className="font-medium text-navy-900">Not connected</div>
                <div className="text-sm text-slate-600">Connect Google Calendar to push job appointments automatically</div>
              </div>
            </div>

            {clientId ? (
              <button onClick={startConnect} disabled={processing}
                className="btn-primary inline-flex items-center gap-2">
                <Calendar size={16} /> {processing ? 'Connecting…' : 'Connect Google Calendar'}
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm">
                <div className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={14} /> Setup required
                </div>
                <p className="text-amber-800 mb-3">
                  Google Calendar integration needs OAuth credentials. One-time setup by an admin:
                </p>
                <ol className="text-amber-800 space-y-2 list-decimal pl-5 text-xs">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                    className="text-ember-700 underline inline-flex items-center gap-0.5">
                    Google Cloud Console <ExternalLink size={9} /></a> and create OAuth client credentials
                  </li>
                  <li>Add <code className="bg-amber-100 px-1 rounded">{redirectUri}</code> as an authorized redirect URI</li>
                  <li>Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> to Netlify env vars (the public Client ID)</li>
                  <li>Add <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> as Supabase Edge Function secrets</li>
                  <li>Redeploy the site, then come back here to connect</li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export async function syncJobToCalendar(jobId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync_job', job_id: jobId }),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Unknown' }))
    throw new Error(e.error || `Sync failed (${r.status})`)
  }
  return await r.json()
}
