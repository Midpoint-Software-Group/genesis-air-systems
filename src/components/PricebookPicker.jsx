import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Search, BookOpen } from 'lucide-react'

export function PricebookPicker({ onSelect, onClose }) {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('pricebook_items').select('*').eq('is_active', true)
      .order('sort_order').order('category').order('name')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category))).sort()]
  const filtered = items.filter(i => {
    if (filterCat !== 'All' && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !i.description?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-elevated max-w-2xl w-full flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-start justify-between p-4 border-b border-navy-100">
          <div>
            <h2 className="font-serif text-xl text-navy-900 flex items-center gap-2">
              <BookOpen size={18} className="text-ember-600" /> Pricebook
            </h2>
            <p className="text-xs text-slate-500">Click an item to add it as a line item</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-navy-900" /></button>
        </div>

        <div className="p-3 border-b border-navy-100 flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="text" placeholder="Search…" className="input pl-8 py-1.5 text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)}
                className={filterCat === c ? 'btn-navy text-xs py-1 px-2' : 'btn-ghost text-xs py-1 px-2'}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading pricebook…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No items match</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-navy-50/90 backdrop-blur-sm">
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Item</th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-2">Cat</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-slate-500 font-medium py-2 px-4">Price / Unit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}
                    onClick={() => onSelect(item)}
                    className="border-t border-navy-50 hover:bg-ember-50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="text-sm font-medium text-navy-900">{item.name}</div>
                      {item.description && <div className="text-[11px] text-slate-500">{item.description}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-slate-500">{item.category}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-sm font-medium text-navy-900">${Number(item.unit_price).toFixed(2)}</span>
                      <span className="text-[11px] text-slate-500 ml-1">/ {item.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
