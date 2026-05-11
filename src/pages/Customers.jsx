import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Plus, Search, Building2, Home, Phone, Mail, Users } from 'lucide-react'

export function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadCustomers()
  }, [filter])

  async function loadCustomers() {
    setLoading(true)
    let query = supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, customer_type, email, phone, city, state, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('customer_type', filter)

    const { data } = await query
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    const name = c.customer_type === 'commercial'
      ? c.company_name?.toLowerCase()
      : `${c.first_name} ${c.last_name}`.toLowerCase()
    return name?.includes(s) || c.email?.toLowerCase().includes(s) || c.phone?.includes(s)
  })

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} active customer${customers.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Add Customer
          </Link>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers…"
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}
          >
            All
          </button>
          <button
            onClick={() => setFilter('residential')}
            className={filter === 'residential' ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}
          >
            <Home size={12} className="inline mr-1" />
            Residential
          </button>
          <button
            onClick={() => setFilter('commercial')}
            className={filter === 'commercial' ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}
          >
            <Building2 size={12} className="inline mr-1" />
            Commercial
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="No customers yet"
            message="Add your first customer to start tracking their service history, jobs, and invoices."
            action={
              <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2">
                <Plus size={16} /> Add Customer
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(customer => (
            <Link
              to={`/customers/${customer.id}`}
              key={customer.id}
              className="card p-4 hover:shadow-elevated transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded flex items-center justify-center ${
                    customer.customer_type === 'commercial'
                      ? 'bg-ember-50 text-ember-700'
                      : 'bg-navy-50 text-navy-700'
                  }`}>
                    {customer.customer_type === 'commercial' ? <Building2 size={16} /> : <Home size={16} />}
                  </div>
                  <div>
                    <div className="font-medium text-navy-900 text-sm">
                      {customer.customer_type === 'commercial'
                        ? customer.company_name
                        : `${customer.first_name} ${customer.last_name}`}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {customer.customer_type}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                {customer.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {(customer.city || customer.state) && (
                  <div className="text-[11px] text-slate-500 pt-1.5 mt-1.5 border-t border-navy-50">
                    {[customer.city, customer.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
