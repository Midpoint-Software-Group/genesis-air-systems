import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { EmptyState } from '../components/EmptyState'
import {
  Plus, Save, Trash2, Edit, X, BookOpen,
  Settings as SettingsIcon, Calendar, Star, BarChart3
} from 'lucide-react'

const SETTINGS_NAV = [
  { to: '/settings', label: 'Settings', icon: SettingsIcon, exact: true },
  { to: '/pricebook', label: 'Pricebook', icon: BookOpen },
  { to: '/inventory', label: 'Inventory', icon: BookOpen },
]

const CATEGORIES = ['Labor', 'Refrigerant', 'Parts', 'Filters', 'Equipment', 'Maintenance', 'Other']

function PricebookForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'Labor', unit: 'each',
    unit_price: '', unit_cost: '', is_taxable: true, is_active: true,
    ...item,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      unit_price: Number(form.unit_price) || 0,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
    }
    const result = item?.id
      ? await supabase.from('pricebook_items').update(payload).eq('id', item.id)
      : await supabase.from('pricebook_items').insert(payload)
    setSaving(false)
    if (result.error) setError(result.error.message)
    else onSave()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-elevated max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-serif text-xl text-navy-900">{item?.id ? 'Edit Item' : 'Add to Pricebook'}</h2>
          <button type="button" onClick={onCancel}><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="mb-3">
          <label className="label">Item Name *</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
        </div>
        <div className="mb-3">
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {['each', 'hour', 'lb', 'visit', 'vent', 'gal', 'ft', 'sqft'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Sell Price ($) *</label>
            <input type="number" step="0.01" min="0" className="input" value={form.unit_price}
              onChange={e => setForm({ ...form, unit_price: e.target.value })} required />
          </div>
          <div>
            <label className="label">Cost ($) <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="number" step="0.01" min="0" className="input" value={form.unit_cost}
              onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="Internal only" />
          </div>
        </div>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={form.is_taxable} onChange={e => setForm({ ...form, is_taxable: e.target.checked })}
            className="rounded border-navy-200 text-ember-600" />
          <span className="text-sm text-navy-900">Taxable</span>
        </label>
        {error && <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-3">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : (item?.id ? 'Save Changes' : 'Add Item')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function Pricebook() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('pricebook_items').select('*')
      .eq('is_active', true).order('sort_order').order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function deleteItem(id) {
    if (!confirm('Remove this item from the pricebook?')) return
    await supabase.from('pricebook_items').update({ is_active: false }).eq('id', id)
    load()
  }

  const categories = ['All', ...CATEGORIES.filter(c => items.some(i => i.category === c))]
  const filtered = items.filter(i => {
    if (filterCat !== 'All' && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalItems = items.length
  const avgMargin = items.filter(i => i.unit_cost > 0).length > 0
    ? items.filter(i => i.unit_cost > 0).reduce((s, i) => s + ((i.unit_price - i.unit_cost) / i.unit_price * 100), 0) /
      items.filter(i => i.unit_cost > 0).length
    : null

  return (
    <div>
      <PageHeader
        title="Pricebook"
        subtitle={`${totalItems} items${avgMargin ? ` · ${avgMargin.toFixed(0)}% avg margin` : ''}`}
        actions={
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Add Item
          </button>
        }
      />
      <SectionNav items={SETTINGS_NAV} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search pricebook…" className="input max-w-xs"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={filterCat === c ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={BookOpen} title="No items found"
          message="Add services, labor rates, and parts to your pricebook." /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50 border-b border-navy-100">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Item</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Category</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Unit</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Cost</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Price</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Margin</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Tax</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const margin = item.unit_cost > 0
                  ? ((item.unit_price - item.unit_cost) / item.unit_price * 100).toFixed(0)
                  : null
                return (
                  <tr key={item.id} className="border-t border-navy-50 hover:bg-navy-50/30 group">
                    <td className="py-2.5 px-4">
                      <div className="text-sm font-medium text-navy-900">{item.name}</div>
                      {item.description && <div className="text-[11px] text-slate-500">{item.description}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600">{item.category}</td>
                    <td className="py-2.5 px-2 text-xs text-slate-600">{item.unit}</td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 text-right">
                      {item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-sm font-medium text-navy-900 text-right">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-right">
                      {margin ? (
                        <span className={Number(margin) >= 50 ? 'text-emerald-700' : Number(margin) >= 30 ? 'text-amber-700' : 'text-red-700'}>
                          {margin}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-xs">
                      {item.is_taxable
                        ? <span className="pill bg-blue-50 text-blue-700">Tax</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 justify-end">
                        <button onClick={() => { setEditItem(item); setShowForm(true) }}
                          className="text-slate-400 hover:text-navy-900 p-1"><Edit size={12} /></button>
                        <button onClick={() => deleteItem(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PricebookForm item={editItem} onSave={() => { setShowForm(false); setEditItem(null); load() }}
          onCancel={() => { setShowForm(false); setEditItem(null) }} />
      )}
    </div>
  )
}
