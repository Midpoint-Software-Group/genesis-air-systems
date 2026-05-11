import { supabase } from './supabase'
import { format } from 'date-fns'

async function callSendEmail(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `Email send failed (${response.status})`)
  }

  return await response.json()
}

function brandedTemplate({ business, headline, body, ctaText, ctaUrl, footerNote }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E3A8A;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #DBEAFE;">
    <div style="background:#1E3A8A;color:#fff;padding:24px;">
      <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:0.5px;">${business?.business_name || 'GENESIS AIR SYSTEMS'}</div>
      <div style="font-size:10px;letter-spacing:1.5px;color:#BFDBFE;margin-top:4px;text-transform:uppercase;">${business?.business_tagline || 'Heating · Cooling · Service'}</div>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;color:#1E3A8A;margin:0 0 16px;">${headline}</h1>
      <div style="font-size:14px;line-height:1.6;color:#334155;">${body}</div>
      ${ctaText && ctaUrl ? `
        <div style="margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#EA580C;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-weight:500;font-size:13px;">${ctaText}</a>
        </div>
      ` : ''}
    </div>
    <div style="background:#F8F9FC;padding:16px 24px;border-top:1px solid #DBEAFE;font-size:11px;color:#64748B;">
      ${footerNote || ''}
      ${business?.business_phone ? `<div style="margin-top:8px;">📞 ${business.business_phone}</div>` : ''}
      ${business?.business_email ? `<div>✉️ ${business.business_email}</div>` : ''}
      <div style="margin-top:12px;color:#94A3B8;">© ${new Date().getFullYear()} ${business?.business_name || 'Genesis Air Systems'}. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`
}

async function getBusinessSettings() {
  const { data } = await supabase.from('business_settings').select('*').eq('id', 1).single()
  return data
}

// ===== INVOICE SENT =====
export async function sendInvoiceEmail(invoice, customer, lineItems = []) {
  const business = await getBusinessSettings()
  if (!business?.auto_email_invoice_on_send) return { skipped: true }
  if (!customer?.email) return { skipped: true, reason: 'No customer email' }

  const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`
  const itemsHtml = lineItems.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
      <thead>
        <tr style="background:#F8F9FC;border-bottom:2px solid #1E3A8A;">
          <th style="text-align:left;padding:8px;color:#1E3A8A;">Description</th>
          <th style="text-align:right;padding:8px;color:#1E3A8A;">Qty</th>
          <th style="text-align:right;padding:8px;color:#1E3A8A;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr style="border-bottom:1px solid #DBEAFE;">
            <td style="padding:8px;">${item.description}</td>
            <td style="text-align:right;padding:8px;color:#64748B;">${Number(item.quantity).toFixed(2)}</td>
            <td style="text-align:right;padding:8px;">$${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''

  return await callSendEmail({
    to: customer.email,
    to_name: customerName,
    subject: `Invoice ${invoice.invoice_number} from ${business?.business_name || 'Genesis Air Systems'}`,
    email_type: 'invoice_sent',
    related_id: invoice.id,
    related_type: 'invoice',
    html: brandedTemplate({
      business,
      headline: `Invoice ${invoice.invoice_number}`,
      body: `
        <p>Hi ${customerName},</p>
        <p>Thanks for your business. Here are the details of your invoice:</p>
        ${itemsHtml}
        <div style="margin-top:16px;padding:12px;background:#F8F9FC;border-left:3px solid #EA580C;">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748B;">
            <span>Subtotal</span><span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${Number(invoice.tax_amount) > 0 ? `
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748B;margin-top:4px;">
              <span>Tax</span><span>$${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:bold;margin-top:8px;padding-top:8px;border-top:1px solid #1E3A8A;">
            <span style="font-family:Georgia,serif;font-size:16px;">Amount Due</span>
            <span style="font-family:Georgia,serif;font-size:18px;color:#EA580C;">$${Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          ${invoice.due_date ? `<div style="margin-top:8px;font-size:12px;color:#64748B;">Due ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}</div>` : ''}
        </div>
        <p style="margin-top:16px;">Questions? Just reply to this email or give us a call.</p>
      `,
      footerNote: `Payment terms: ${invoice.payment_terms || 'Net 30'}.`,
    }),
  })
}

// ===== ESTIMATE SENT =====
export async function sendEstimateEmail(estimate, customer, lineItems = []) {
  const business = await getBusinessSettings()
  if (!business?.auto_email_estimate_on_send) return { skipped: true }
  if (!customer?.email) return { skipped: true, reason: 'No customer email' }

  const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`

  return await callSendEmail({
    to: customer.email,
    to_name: customerName,
    subject: `Estimate ${estimate.estimate_number} from ${business?.business_name || 'Genesis Air Systems'}`,
    email_type: 'estimate_sent',
    related_id: estimate.id,
    related_type: 'estimate',
    html: brandedTemplate({
      business,
      headline: `Estimate ${estimate.estimate_number}`,
      body: `
        <p>Hi ${customerName},</p>
        <p>Here's the estimate for the work we discussed.</p>
        <div style="margin-top:16px;padding:16px;background:#F8F9FC;border-left:3px solid #EA580C;">
          <div style="font-family:Georgia,serif;font-size:14px;color:#64748B;">Total Estimate</div>
          <div style="font-family:Georgia,serif;font-size:32px;color:#EA580C;font-weight:bold;">$${Number(estimate.total_amount).toFixed(2)}</div>
          ${estimate.valid_until ? `<div style="margin-top:4px;font-size:12px;color:#64748B;">Valid through ${format(new Date(estimate.valid_until), 'MMMM d, yyyy')}</div>` : ''}
        </div>
        <p style="margin-top:16px;">Reply to this email or call us when you're ready to schedule.</p>
      `,
      footerNote: estimate.terms,
    }),
  })
}

// ===== OVERDUE REMINDER =====
export async function sendOverdueReminder(invoice, customer) {
  const business = await getBusinessSettings()
  if (!customer?.email) return { skipped: true, reason: 'No customer email' }

  const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`
  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid || 0)
  const daysOverdue = invoice.due_date ? Math.floor((new Date() - new Date(invoice.due_date)) / 86400000) : 0

  return await callSendEmail({
    to: customer.email,
    to_name: customerName,
    subject: `Friendly reminder: Invoice ${invoice.invoice_number} is past due`,
    email_type: 'overdue_reminder',
    related_id: invoice.id,
    related_type: 'invoice',
    html: brandedTemplate({
      business,
      headline: `Invoice ${invoice.invoice_number} is past due`,
      body: `
        <p>Hi ${customerName},</p>
        <p>This is a friendly reminder that your invoice from us is now ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due.</p>
        <div style="margin-top:16px;padding:16px;background:#FEE2E2;border-left:3px solid #DC2626;">
          <div style="font-size:13px;color:#7F1D1D;">Balance Due</div>
          <div style="font-family:Georgia,serif;font-size:28px;color:#DC2626;font-weight:bold;">$${balance.toFixed(2)}</div>
          ${invoice.due_date ? `<div style="margin-top:4px;font-size:12px;color:#7F1D1D;">Was due ${format(new Date(invoice.due_date), 'MMMM d, yyyy')}</div>` : ''}
        </div>
        <p style="margin-top:16px;">If you've already sent payment, please disregard this note. Otherwise, reply to this email or give us a call so we can sort it out together.</p>
      `,
      footerNote: 'We appreciate your business.',
    }),
  })
}

// ===== SERVICE REQUEST ACKNOWLEDGEMENT =====
export async function sendRequestAcknowledgement(request, customer) {
  const business = await getBusinessSettings()
  if (!business?.notify_on_new_request) return { skipped: true }
  if (!customer?.email && !request.contact_email) return { skipped: true, reason: 'No email' }

  const customerName = customer?.customer_type === 'commercial' ? customer.company_name : `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || request.customer_name

  return await callSendEmail({
    to: request.contact_email || customer.email,
    to_name: customerName,
    subject: `We got your service request — ${business?.business_name || 'Genesis Air Systems'}`,
    email_type: 'request_acknowledged',
    related_id: request.id,
    related_type: 'service_request',
    html: brandedTemplate({
      business,
      headline: `Got it — we'll be in touch`,
      body: `
        <p>Hi ${customerName},</p>
        <p>Thanks for reaching out. We received your request for <strong>${request.service_type}</strong> and someone will contact you within 1 business day to confirm a time.</p>
        ${request.preferred_date ? `
          <p style="margin-top:12px;font-size:13px;color:#64748B;">You requested: ${format(new Date(request.preferred_date), 'EEEE, MMMM d')} (${request.preferred_time_window || 'anytime'})</p>
        ` : ''}
        ${request.description ? `
          <div style="margin-top:16px;padding:12px;background:#F8F9FC;border-left:3px solid #1E3A8A;font-size:13px;">
            <strong>Your note:</strong><br>${request.description}
          </div>
        ` : ''}
      `,
      footerNote: 'Need to update or cancel? Just reply to this email.',
    }),
  })
}

// ===== JOB SCHEDULED =====
export async function sendJobScheduledEmail(job, customer) {
  const business = await getBusinessSettings()
  if (!customer?.email) return { skipped: true, reason: 'No customer email' }

  const customerName = customer.customer_type === 'commercial' ? customer.company_name : `${customer.first_name} ${customer.last_name}`

  return await callSendEmail({
    to: customer.email,
    to_name: customerName,
    subject: `Service scheduled: ${format(new Date(job.scheduled_at), 'EEE, MMM d')}`,
    email_type: 'job_scheduled',
    related_id: job.id,
    related_type: 'job',
    html: brandedTemplate({
      business,
      headline: `Your service is scheduled`,
      body: `
        <p>Hi ${customerName},</p>
        <p>We've scheduled your <strong>${job.service_type}</strong> appointment.</p>
        <div style="margin-top:16px;padding:16px;background:#F8F9FC;border-left:3px solid #EA580C;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#1E3A8A;">${format(new Date(job.scheduled_at), 'EEEE, MMMM d, yyyy')}</div>
          <div style="font-size:14px;color:#64748B;margin-top:4px;">at ${format(new Date(job.scheduled_at), 'h:mm a')}</div>
          ${job.assigned_tech_name ? `<div style="margin-top:8px;font-size:13px;">Your technician: <strong>${job.assigned_tech_name}</strong></div>` : ''}
          <div style="margin-top:8px;font-size:13px;color:#64748B;">Job: ${job.job_number}</div>
        </div>
        <p style="margin-top:16px;">Need to reschedule? Reply to this email or give us a call.</p>
      `,
    }),
  })
}
