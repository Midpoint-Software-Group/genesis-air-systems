import { Plus, Trash2, GripVertical } from 'lucide-react'

export function LineItemEditor({ items, onChange, taxRate = 0, discountAmount = 0 }) {
  const addItem = () => {
    onChange([
      ...items,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        description: '',
        quantity: 1,
        unit_price: 0,
        is_taxable: true,
        sort_order: items.length,
        _isNew: true,
      },
    ])
  }

  const updateItem = (idx, field, value) => {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: value }
    onChange(next)
  }

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx))
  }

  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next.map((item, i) => ({ ...item, sort_order: i })))
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const taxableSubtotal = items
    .filter(item => item.is_taxable)
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const discountedSubtotal = Math.max(0, subtotal - (Number(discountAmount) || 0))
  // Discount applies proportionally; tax on net taxable amount
  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1
  const netTaxable = taxableSubtotal * discountRatio
  const taxAmount = netTaxable * (Number(taxRate) || 0)
  const total = discountedSubtotal + taxAmount

  return (
    <div>
      <div className="border border-navy-100 rounded-md overflow-hidden">
        <div className="bg-navy-50/50 grid grid-cols-[24px_1fr_80px_110px_50px_110px_36px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          <div></div>
          <div>Description</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Unit Price</div>
          <div className="text-center">Tax</div>
          <div className="text-right">Total</div>
          <div></div>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400 border-t border-navy-50">
            No line items yet. Click "Add Line" below to get started.
          </div>
        ) : items.map((item, idx) => {
          const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
          return (
            <div key={item.id} className="grid grid-cols-[24px_1fr_80px_110px_50px_110px_36px] gap-2 px-3 py-2 border-t border-navy-50 items-center hover:bg-navy-50/20">
              <div className="flex flex-col">
                <button type="button" onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0} className="text-slate-300 hover:text-navy-700 disabled:opacity-30">
                  <GripVertical size={12} />
                </button>
              </div>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="Service or part description"
                className="input py-1 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.quantity}
                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                className="input py-1 text-sm text-right"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.unit_price}
                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                className="input py-1 text-sm text-right"
              />
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={item.is_taxable}
                  onChange={(e) => updateItem(idx, 'is_taxable', e.target.checked)}
                  className="rounded border-navy-200 text-ember-600 focus:ring-ember-500"
                />
              </div>
              <div className="text-right text-sm font-medium text-navy-900 px-2">
                ${lineTotal.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-slate-400 hover:text-red-600 flex justify-center"
                aria-label="Remove line"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}

        <div className="border-t border-navy-50 p-3">
          <button type="button" onClick={addItem} className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <Plus size={12} /> Add Line
          </button>
        </div>
      </div>

      {/* Totals section */}
      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium text-navy-900">${subtotal.toFixed(2)}</span>
          </div>
          {Number(discountAmount) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span className="font-medium text-ember-600">−${Number(discountAmount).toFixed(2)}</span>
            </div>
          )}
          {Number(taxRate) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Tax ({(Number(taxRate) * 100).toFixed(3)}%)</span>
              <span className="font-medium text-navy-900">${taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t-2 border-navy-900">
            <span className="font-serif text-base text-navy-900">Total</span>
            <span className="font-serif text-lg text-ember-600 font-bold">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper exported for parent forms to recalculate totals before saving
export function calculateTotals(items, taxRate = 0, discountAmount = 0) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const taxableSubtotal = items
    .filter(item => item.is_taxable)
    .reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0)
  const discountedSubtotal = Math.max(0, subtotal - (Number(discountAmount) || 0))
  const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1
  const netTaxable = taxableSubtotal * discountRatio
  const taxAmount = netTaxable * (Number(taxRate) || 0)
  const total = discountedSubtotal + taxAmount
  return { subtotal, taxAmount, total, discountAmount: Number(discountAmount) || 0 }
}
