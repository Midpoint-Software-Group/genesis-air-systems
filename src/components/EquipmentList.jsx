import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, Edit, Trash2, Wind, Flame, Thermometer, Droplets, Box, X, Save } from 'lucide-react'

const TYPE_LABELS = {
  ac_central: 'Central AC',
  ac_window: 'Window AC',
  furnace: 'Furnace',
  heat_pump: 'Heat Pump',
  mini_split: 'Mini-Split',
  boiler: 'Boiler',
  water_heater: 'Water Heater',
  thermostat: 'Thermostat',
  air_handler: 'Air Handler',
  package_unit: 'Package Unit',
  other: 'Other',
}

const TYPE_ICONS = {
  ac_central: Wind, ac_window: Wind, mini_split: Wind, heat_pump: Wind,
  furnace: Flame, boiler: Flame,
  water_heater: Droplets,
  thermostat: Thermometer,
  air_handler: Box, package_unit: Box, other: Box,
}

const FUEL_OPTIONS = ['', 'electric', 'natural_gas', 'propane', 'oil']

function EquipmentForm({ equipment, customerId, onSave, onCancel }) {
  const [form, setForm] = useState({
    equipment_type: 'ac_central',
    nickname: '',
    make: '',
    model: '',
    serial_number: '',
    install_date: '',
    warranty_expires: '',
    capacity: '',
    fuel_type: '',
    location_notes: '',
    last_service_date: '',
    next_service_due: '',
    internal_notes: '',
    ...equipment,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      customer_id: customerId,
      install_date: form.install_date || null,
      warranty_expires: form.warranty_expires || null,
      last_service_date: form.last_service_date || null,
      next_service_due: form.next_service_due || null,
      fuel_type: form.fuel_type || null,
    }

    const result = equipment?.id
      ? await supabase.from('equipment').update(payload).eq('id', equipment.id)
      : await supabase.from('equipment').insert(payload)

    setSaving(false)
    if (result.error) setError(result.error.message)
    else onSave()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-md shadow-elevated max-w-2xl w-full p-6 my-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl text-navy-900">
              {equipment?.id ? 'Edit Equipment' : 'Add Equipment'}
            </h2>
            <p className="text-sm text-slate-500">HVAC unit or appliance at this property</p>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-navy-900">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Equipment Type *</label>
            <select name="equipment_type" className="input" value={form.equipment_type} onChange={handleChange} required>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nickname / Location</label>
            <input name="nickname" className="input" value={form.nickname} onChange={handleChange}
              placeholder="e.g., Upstairs unit, Garage" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Make</label>
            <input name="make" className="input" value={form.make} onChange={handleChange} placeholder="Carrier" />
          </div>
          <div>
            <label className="label">Model</label>
            <input name="model" className="input" value={form.model} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Serial #</label>
            <input name="serial_number" className="input" value={form.serial_number} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Capacity</label>
            <input name="capacity" className="input" value={form.capacity} onChange={handleChange} placeholder="3 ton / 60,000 BTU" />
          </div>
          <div>
            <label className="label">Fuel Type</label>
            <select name="fuel_type" className="input" value={form.fuel_type} onChange={handleChange}>
              {FUEL_OPTIONS.map(f => <option key={f} value={f}>{f ? f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Install Date</label>
            <input type="date" name="install_date" className="input" value={form.install_date} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Warranty Expires</label>
            <input type="date" name="warranty_expires" className="input" value={form.warranty_expires} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Last Service</label>
            <input type="date" name="last_service_date" className="input" value={form.last_service_date} onChange={handleChange} />
          </div>
          <div>
            <label className="label">Next Service Due</label>
            <input type="date" name="next_service_due" className="input" value={form.next_service_due} onChange={handleChange} />
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Location Notes</label>
          <input name="location_notes" className="input" value={form.location_notes} onChange={handleChange}
            placeholder="Access info: 'Code 1234 for gate', 'Use side door', etc." />
        </div>

        <div className="mb-4">
          <label className="label">Internal Notes (staff only)</label>
          <textarea name="internal_notes" rows="2" className="input" value={form.internal_notes} onChange={handleChange} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-3">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : (equipment?.id ? 'Save Changes' : 'Add Equipment')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function EquipmentList({ customerId }) {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    if (customerId) loadEquipment()
  }, [customerId])

  async function loadEquipment() {
    const { data } = await supabase.from('equipment')
      .select('*').eq('customer_id', customerId).eq('is_active', true)
      .order('install_date', { ascending: false, nullsFirst: false })
    setEquipment(data || [])
    setLoading(false)
  }

  async function deleteEquipment(id) {
    if (!confirm('Remove this equipment from the customer?')) return
    await supabase.from('equipment').update({ is_active: false }).eq('id', id)
    loadEquipment()
  }

  function getServiceStatus(item) {
    if (!item.next_service_due) return null
    const days = differenceInDays(parseISO(item.next_service_due), new Date())
    if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, color: 'text-red-700 bg-red-50' }
    if (days < 30) return { label: `Due in ${days}d`, color: 'text-amber-700 bg-amber-50' }
    return { label: `Due ${format(parseISO(item.next_service_due), 'MMM d')}`, color: 'text-slate-600 bg-slate-50' }
  }

  function getWarrantyStatus(item) {
    if (!item.warranty_expires) return null
    const days = differenceInDays(parseISO(item.warranty_expires), new Date())
    if (days < 0) return { label: 'Out of warranty', color: 'text-slate-500' }
    if (days < 60) return { label: `Warranty: ${days}d left`, color: 'text-amber-700' }
    return { label: `Warranty thru ${format(parseISO(item.warranty_expires), 'MMM yyyy')}`, color: 'text-emerald-700' }
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <span className="card-title-serif">Equipment</span>
        <button onClick={() => { setEditingItem(null); setShowForm(true) }}
          className="text-xs text-navy-200 hover:text-white flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
      ) : equipment.length === 0 ? (
        <div className="p-6 text-center">
          <Wind size={24} className="text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-3">No equipment on file yet</p>
          <button onClick={() => { setEditingItem(null); setShowForm(true) }}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs">
            <Plus size={12} /> Add First Unit
          </button>
        </div>
      ) : (
        <div className="divide-y divide-navy-50">
          {equipment.map(item => {
            const Icon = TYPE_ICONS[item.equipment_type] || Box
            const service = getServiceStatus(item)
            const warranty = getWarrantyStatus(item)

            return (
              <div key={item.id} className="p-4 hover:bg-navy-50/20 group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-navy-50 text-navy-700 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm text-navy-900">
                          {item.nickname || TYPE_LABELS[item.equipment_type]}
                          {item.nickname && (
                            <span className="text-[11px] text-slate-500 font-normal ml-2">
                              {TYPE_LABELS[item.equipment_type]}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {[item.make, item.model].filter(Boolean).join(' · ')}
                          {item.capacity && <span> · {item.capacity}</span>}
                        </div>
                        {item.serial_number && (
                          <div className="text-[10px] text-slate-400 mt-0.5">S/N: {item.serial_number}</div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => { setEditingItem(item); setShowForm(true) }}
                          className="text-slate-400 hover:text-navy-900 p-1" aria-label="Edit">
                          <Edit size={12} />
                        </button>
                        <button onClick={() => deleteEquipment(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1" aria-label="Remove">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {service && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${service.color}`}>
                          {service.label}
                        </span>
                      )}
                      {warranty && (
                        <span className={`text-[10px] ${warranty.color}`}>
                          {warranty.label}
                        </span>
                      )}
                      {item.install_date && (
                        <span className="text-[10px] text-slate-500">
                          Installed {format(parseISO(item.install_date), 'MMM yyyy')}
                        </span>
                      )}
                    </div>

                    {item.location_notes && (
                      <p className="text-[11px] text-slate-500 mt-1.5 italic">{item.location_notes}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <EquipmentForm
          equipment={editingItem}
          customerId={customerId}
          onSave={() => { setShowForm(false); setEditingItem(null); loadEquipment() }}
          onCancel={() => { setShowForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
