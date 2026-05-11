import { supabase } from './supabase'
import { sendInvoiceEmail, sendEstimateEmail, sendOverdueReminder, sendRequestAcknowledgement, sendJobScheduledEmail } from './emailService'
export { sendInvoiceEmail, sendEstimateEmail, sendOverdueReminder, sendRequestAcknowledgement, sendJobScheduledEmail }

async function callSendEmail(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: 'Unknown' }))
    throw new Error(e.error || `Email failed (${r.status})`)
  }
  return await r.json()
}

async function getBusinessSettings() {
  const { data } = await supabase.from('business_settings').select('*').eq('id', 1).single()
  return data
}

function reviewTemplate({ business, customerName, techName, reviewUrl }) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1E3A8A;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #DBEAFE;">
    <div style="background:#1E3A8A;color:#fff;padding:24px;">
      <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.5px;">${business?.business_name || 'GENESIS AIR SYSTEMS'}</div>
      <div style="font-size:10px;letter-spacing:1.5px;color:#BFDBFE;margin-top:4px;text-transform:uppercase;">${business?.business_tagline || 'Heating · Cooling · Service'}</div>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">⭐</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;color:#1E3A8A;margin:0 0 12px;">How did we do?</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 24px;">
        Hi ${customerName}, thanks for choosing ${business?.business_name || 'us'}.
        ${techName ? `${techName} completed your service` : 'Your service is complete'} and we'd love to know how it went.
      </p>
      <a href="${reviewUrl}" style="display:inline-block;background:#EA580C;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:15px;">
        Leave a Review
      </a>
      <p style="font-size:12px;color:#64748B;margin-top:24px;">
        Takes 30 seconds. Your feedback helps us improve.
      </p>
    </div>
    <div style="background:#F8F9FC;padding:16px 24px;border-top:1px solid #DBEAFE;font-size:11px;color:#64748B;text-align:center;">
      ${business?.business_phone ? `📞 ${business.business_phone}` : ''}
      ${business?.business_email ? ` · ✉️ ${business.business_email}` : ''}
    </div>
  </div>
</body></html>`
}

// Generate a review token + create the review row + send email
export async function sendReviewRequest(job, customer, technician = null) {
  const business = await getBusinessSettings()
  if (!customer?.email) return { skipped: true, reason: 'No customer email' }

  const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`

  // Check if review already exists for this job
  const { data: existing } = await supabase.from('reviews')
    .select('id, review_token, submitted_at')
    .eq('job_id', job.id).maybeSingle()

  let reviewToken
  if (existing) {
    if (existing.submitted_at) return { skipped: true, reason: 'Customer already reviewed' }
    reviewToken = existing.review_token
  } else {
    reviewToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    const { error } = await supabase.from('reviews').insert({
      customer_id: customer.id,
      job_id: job.id,
      technician_id: technician?.id || job.assigned_tech_id || null,
      review_token: reviewToken,
      customer_name: customerName,
    })
    if (error) throw error
  }

  // Use deployed URL or current origin
  const baseUrl = window.location.origin
  const reviewUrl = `${baseUrl}/review/${reviewToken}`

  return await callSendEmail({
    to: customer.email,
    to_name: customerName,
    subject: `How did we do? — ${business?.business_name || 'Genesis Air Systems'}`,
    email_type: 'manual',
    related_id: job.id,
    related_type: 'job',
    html: reviewTemplate({
      business,
      customerName,
      techName: job.assigned_tech_name || technician?.full_name,
      reviewUrl,
    }),
  })
}
