import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionNav } from '../components/SectionNav'
import { EmptyState } from '../components/EmptyState'
import { format } from 'date-fns'
import {
  Plus, Save, X, Edit, AlertTriangle, Package,
  BookOpen, Settings as SettingsIcon
} from 'lucide-react'

const SETTINGS_NAV = [
  { to: '/settings', label: 'Settings', icon: SettingsIcon, exact: true },
  { to: '/pricebook', label: 'Pricebook', icon: BookOpen },
  { to: '/inventory', label: 'Inventory', icon: Package },
]

function InventoryForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', sku: '', category: 'Parts', unit: 'each',
    quantity_on_hand: 0, quantity_min: 0,
    cost_price: '', sell_price: '', supplier: '', supplier_part_no: '', location: '',
    ...item,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      quantity_on_hand: Number(form.quantity_on_hand) || 0,
      quantity_min: Number(form.quantity_min) || 0,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      sell_price: form.sell_price ? Number(form.sell_price) : null,
    }
    const result = item?.id
      ? await supabase.from('inventory_items').update(payload).eq('id', item.id)
      : await supabase.from('inventory_items').insert(payload)
    setSaving(false)
    if (result.error) setError(result.error.message)
    else onSave()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-elevated max-w-xl w-full p-6 my-8">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-serif text-xl text-navy-900">{item?.id ? 'Edit Part' : 'Add to Inventory'}</h2>
          <button type="button" onClick={onCancel}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="label">Part Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="label">SKU / Part #</label>
            <input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Capacitors, Filters…" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {['each', 'lb', 'gal', 'ft', 'pack', 'box'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">On Hand</label>
            <input type="number" step="0.01" min="0" className="input" value={form.quantity_on_hand}
              onChange={e => setForm({ ...form, quantity_on_hand: e.target.value })} />
          </div>
          <div>
            <label className="label">Reorder At</label>
            <input type="number" step="0.01" min="0" className="input" value={form.quantity_min}
              onChange={e => setForm({ ...form, quantity_min: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Cost Price ($)</label>
            <input type="number" step="0.01" min="0" className="input" value={form.cost_price}
              onChange={e => setForm({ ...form, cost_price: e.target.value })} />
          </div>
          <div>
            <label className="label">Sell Price ($)</label>
            <input type="number" step="0.01" min="0" className="input" value={form.sell_price}
              onChange={e => setForm({ ...form, sell_price: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Supplier</label>
            <input className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
          </div>
          <div>
            <label className="label">Supplier Part #</label>
            <input className="input" value={form.supplier_part_no} onChange={e => setForm({ ...form, supplier_part_no: e.target.value })} />
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Storage Location</label>
          <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
            placeholder="Van shelf 2, warehouse bin A3…" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-3">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : (item?.id ? 'Save Changes' : 'Add Part')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*')
      .eq('is_active', true).order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function adjustQty(id, delta) {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newQty = Math.max(0, Number(item.quantity_on_hand) + delta)
    await supabase.from('inventory_items').update({ quantity_on_hand: newQty }).eq('id', id)
    load()
  }

  const lowStock = items.filter(i => Number(i.quantity_on_hand) <= Number(i.quantity_min) && i.quantity_min > 0)
  const filtered = items.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = items.reduce((s, i) => s + (Number(i.quantity_on_hand) * Number(i.cost_price || 0)), 0)

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} parts${totalValue > 0 ? ` · $${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} stock value` : ''}${lowStock.length > 0 ? ` · ${lowStock.length} low stock` : ''}`}
        actions={
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Add Part
          </button>
        }
      />
      <SectionNav items={SETTINGS_NAV} />

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertTriangle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <span className="text-amber-800">
            <strong>{lowStock.length} part{lowStock.length > 1 ? 's' : ''} low on stock:</strong>{' '}
            {lowStock.map(i => i.name).join(', ')}
          </span>
        </div>
      )}

      <input type="text" placeholder="Search parts…" className="input max-w-xs mb-4"
        value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Package} title="No inventory yet"
          message="Track parts and materials you use on jobs." /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50/50 border-b border-navy-100">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Part</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">SKU</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Location</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Cost</th>
                <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Sell</th>
                <th className="text-center text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Qty</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = Number(item.quantity_on_hand) <= Number(item.quantity_min) && item.quantity_min > 0
                return (
                  <tr key={item.id} className={`border-t border-navy-50 group ${isLow ? 'bg-amber-50/30' : 'hover:bg-navy-50/30'}`}>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />}
                        <div>
                          <div className="text-sm font-medium text-navy-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">{item.category}{item.supplier ? ` · ${item.supplier}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 font-mono">{item.sku || '—'}</td>
                    <td className="py-2.5 px-2 text-xs text-slate-600">{item.location || '—'}</td>
                    <td className="py-2.5 px-2 text-xs text-slate-600 text-right">
                      {item.cost_price ? `$${Number(item.cost_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-navy-900 font-medium text-right">
                      {item.sell_price ? `$${Number(item.sell_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => adjustQty(item.id, -1)}
                          className="w-6 h-6 rounded bg-navy-100 hover:bg-navy-200 text-navy-700 text-sm flex items-center justify-center">−</button>
                        <span className={`text-sm font-medium w-8 text-center ${isLow ? 'text-amber-700' : 'text-navy-900'}`}>
                          {Number(item.quantity_on_hand)}
                        </span>
                        <button onClick={() => adjustQty(item.id, 1)}
                          className="w-6 h-6 rounded bg-navy-100 hover:bg-navy-200 text-navy-700 text-sm flex items-center justify-center">+</button>
                      </div>
                      {item.quantity_min > 0 && (
                        <div className="text-[10px] text-slate-400 text-center">min {item.quantity_min}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <button onClick={() => { setEditItem(item); setShowForm(true) }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-navy-900 p-1">
                        <Edit size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <InventoryForm item={editItem} onSave={() => { setShowForm(false); setEditItem(null); load() }}
          onCancel={() => { setShowForm(false); setEditItem(null) }} />
      )}
    </div>
  )
}
