import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { EquipmentList } from '../components/EquipmentList'
import { format } from 'date-fns'
import {
  Building2, Home, ArrowLeft, Mail, Phone, MapPin, Plus,
  ClipboardList, FileText, Receipt, Edit
} from 'lucide-react'

export function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomer()
  }, [id])

  async function loadCustomer() {
    setLoading(true)
    const [customerRes, jobsRes, invoicesRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('jobs').select('id, job_number, service_type, status, scheduled_at, assigned_tech_name')
        .eq('customer_id', id).order('scheduled_at', { ascending: false }).limit(20),
      supabase.from('invoices').select('id, invoice_number, total_amount, status, due_date')
        .eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
    ])
    setCustomer(customerRes.data)
    setJobs(jobsRes.data || [])
    setInvoices(invoicesRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading customer…</div>
  if (!customer) return <div className="p-8 text-center text-sm text-slate-400">Customer not found</div>

  const displayName = customer.customer_type === 'commercial'
    ? customer.company_name
    : `${customer.first_name} ${customer.last_name}`

  return (
    <div>
      <PageHeader
        title={displayName}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            {customer.customer_type === 'commercial' ? <Building2 size={12} /> : <Home size={12} />}
            <span className="capitalize">{customer.customer_type}</span>
            {customer.contact_name && <> · Contact: {customer.contact_name}</>}
          </span>
        }
        actions={
          <>
            <button onClick={() => navigate('/customers')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn-secondary inline-flex items-center gap-2">
              <Edit size={16} /> Edit
            </button>
            <Link to={`/jobs/new?customer=${id}`} className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} /> New Job
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
              Contact Information
            </div>
            <div className="space-y-3 text-sm">
              {customer.email && (
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-navy-700 hover:text-ember-600 break-all">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-navy-700 hover:text-ember-600">
                    {customer.phone}
                  </a>
                </div>
              )}
              {(customer.address_line1 || customer.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-navy-700">
                    {customer.address_line1 && <div>{customer.address_line1}</div>}
                    {customer.address_line2 && <div>{customer.address_line2}</div>}
                    {(customer.city || customer.state) && (
                      <div>
                        {[customer.city, customer.state].filter(Boolean).join(', ')} {customer.zip_code}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {customer.notes && (
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3 pb-2 border-b border-navy-50">
                Notes
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}

          <div className="bg-navy-900 rounded p-4 text-white">
            <div className="text-[10px] uppercase tracking-wider text-navy-300 font-medium mb-3">
              Account Summary
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-navy-300">Total Jobs</span><span className="font-medium">{jobs.length}</span></div>
              <div className="flex justify-between"><span className="text-navy-300">Total Invoices</span><span className="font-medium">{invoices.length}</span></div>
              <div className="flex justify-between"><span className="text-navy-300">Customer Since</span><span className="font-medium">{format(new Date(customer.created_at), 'MMM yyyy')}</span></div>
            </div>
          </div>

          <EquipmentList customerId={customer.id} />
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header">
              <span className="card-title-serif flex items-center gap-2">
                <ClipboardList size={14} /> Job History
              </span>
              <Link to={`/jobs/new?customer=${id}`} className="text-xs text-navy-200 hover:text-white">+ New job</Link>
            </div>
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No jobs yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-50">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Job</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Service</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Date</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Tech</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/40">
                      <td className="py-2.5 px-4"><Link to={`/jobs/${job.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{job.job_number}</Link></td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{job.service_type}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{format(new Date(job.scheduled_at), 'MMM d, yyyy')}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{job.assigned_tech_name || '—'}</td>
                      <td className="py-2.5 px-2"><StatusPill status={job.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {invoices.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header">
                <span className="card-title-serif flex items-center gap-2">
                  <Receipt size={14} /> Invoices
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-50">
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-4">Invoice</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Due</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Amount</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-navy-50 last:border-0">
                      <td className="py-2.5 px-4"><Link to={`/invoices/${inv.id}`} className="text-xs font-medium text-navy-900 hover:text-ember-600">{inv.invoice_number}</Link></td>
                      <td className="py-2.5 px-2 text-xs text-slate-600">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</td>
                      <td className="py-2.5 px-2 text-xs text-navy-900 text-right font-medium">${parseFloat(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-2"><StatusPill status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
