import { supabase } from './supabase'

async function callSendSms(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Unknown' }))
    throw new Error(e.error || `SMS failed (${r.status})`)
  }
  return await r.json()
}

async function getSettings() {
  const { data } = await supabase.from('business_settings')
    .select('business_name, business_phone, sms_notify_on_scheduled, sms_notify_on_en_route, sms_notify_on_completed')
    .eq('id', 1).single()
  return data
}

async function getCustomerPhone(customerId) {
  const { data } = await supabase.from('customers').select('phone, first_name, last_name, company_name, customer_type').eq('id', customerId).single()
  return data
}

export async function sendJobScheduledSms(job) {
  const settings = await getSettings()
  if (!settings?.sms_notify_on_scheduled) return { skipped: true }
  if (!job.customer_id) return { skipped: true }

  const customer = await getCustomerPhone(job.customer_id)
  if (!customer?.phone) return { skipped: true, reason: 'No customer phone' }

  const name = customer.customer_type === 'commercial' ? customer.company_name : customer.first_name
  const biz = settings.business_name || 'Genesis Air Systems'
  const phone = settings.business_phone || ''

  const scheduledDate = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'soon'
  const scheduledTime = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  const body = `Hi ${name}, your ${job.service_type} is scheduled for ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ''}${job.assigned_tech_name ? ` with ${job.assigned_tech_name}` : ''}. Questions? Call ${phone}. - ${biz}`

  return await callSendSms({
    to: customer.phone,
    to_name: name,
    body,
    sms_type: 'job_scheduled',
    related_id: job.id,
    related_type: 'job',
  })
}

export async function sendTechEnRouteSms(job) {
  const settings = await getSettings()
  if (!settings?.sms_notify_on_en_route) return { skipped: true }
  if (!job.customer_id) return { skipped: true }

  const customer = await getCustomerPhone(job.customer_id)
  if (!customer?.phone) return { skipped: true, reason: 'No customer phone' }

  const name = customer.customer_type === 'commercial' ? customer.company_name : customer.first_name
  const biz = settings.business_name || 'Genesis Air Systems'
  const phone = settings.business_phone || ''
  const tech = job.assigned_tech_name || 'Your technician'

  const body = `Hi ${name}, ${tech} is on the way for your ${job.service_type} appointment. Please ensure access to the service area. Questions? Call ${phone}. - ${biz}`

  return await callSendSms({
    to: customer.phone,
    to_name: name,
    body,
    sms_type: 'tech_en_route',
    related_id: job.id,
    related_type: 'job',
  })
}

export async function sendJobCompletedSms(job) {
  const settings = await getSettings()
  if (!settings?.sms_notify_on_completed) return { skipped: true }
  if (!job.customer_id) return { skipped: true }

  const customer = await getCustomerPhone(job.customer_id)
  if (!customer?.phone) return { skipped: true, reason: 'No customer phone' }

  const name = customer.customer_type === 'commercial' ? customer.company_name : customer.first_name
  const biz = settings.business_name || 'Genesis Air Systems'
  const phone = settings.business_phone || ''

  const body = `Hi ${name}, your ${job.service_type} is complete. An invoice will be sent shortly. Thank you for choosing ${biz}! Questions? Call ${phone}.`

  return await callSendSms({
    to: customer.phone,
    to_name: name,
    body,
    sms_type: 'job_completed',
    related_id: job.id,
    related_type: 'job',
  })
}
