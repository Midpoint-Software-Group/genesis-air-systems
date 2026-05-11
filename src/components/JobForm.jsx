import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ClipboardCheck, Save, CheckSquare, Square, AlertCircle, CheckCircle } from 'lucide-react'

const FORM_TYPES = [
  { id: 'ac_tuneup', label: 'AC Tune-up' },
  { id: 'heating_tuneup', label: 'Heating Tune-up' },
  { id: 'safety_inspection', label: 'Safety Inspection' },
  { id: 'general_service', label: 'General Service' },
]

const AC_CHECKLIST = [
  'Inspect and clean air filter',
  'Check thermostat operation and calibration',
  'Inspect electrical connections and tighten if needed',
  'Check capacitors',
  'Inspect contactor',
  'Clean condenser coil',
  'Check refrigerant levels',
  'Measure superheat / subcooling',
  'Check supply and return temperatures',
  'Inspect blower motor and wheel',
  'Check drain line, clear if needed',
  'Inspect evaporator coil',
  'Lubricate moving parts',
  'Test safety controls',
  'Check disconnect',
]

const HEAT_CHECKLIST = [
  'Inspect and replace air filter',
  'Check thermostat operation',
  'Inspect heat exchanger',
  'Check burners and flame sensor',
  'Test ignitor',
  'Inspect flue and venting',
  'Check gas pressure',
  'Measure temperature rise',
  'Check blower motor and belt',
  'Test safety limits',
  'Inspect drain system',
  'Check electrical connections',
  'Carbon monoxide test',
  'Test all safety controls',
]

const SAFETY_CHECKLIST = [
  'Carbon monoxide levels — safe',
  'No refrigerant leaks detected',
  'Electrical panel and wiring — safe',
  'No gas leaks detected',
  'Venting system — intact',
  'Heat exchanger — no cracks',
  'Combustion air — adequate',
  'Emergency shutoffs — accessible',
  'Smoke / CO detectors — present',
]

function getDefaultChecklist(formType) {
  if (formType === 'ac_tuneup') return AC_CHECKLIST
  if (formType === 'heating_tuneup') return HEAT_CHECKLIST
  if (formType === 'safety_inspection') return SAFETY_CHECKLIST
  return AC_CHECKLIST
}

export function JobForm({ jobId }) {
  const [forms, setForms] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [formType, setFormType] = useState('ac_tuneup')
  const [readings, setReadings] = useState({
    refrigerant_type: 'R-410A', suction_pressure: '', discharge_pressure: '',
    superheat: '', subcooling: '', supply_temp: '', return_temp: '',
    delta_t: '', outdoor_temp: '', compressor_amps: '', fan_motor_amps: '',
  })
  const [checklist, setChecklist] = useState({})
  const [technician_notes, setNotes] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [passed, setPassed] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) load()
  }, [jobId])

  useEffect(() => {
    // Reset checklist when form type changes
    const items = getDefaultChecklist(formType)
    const init = {}
    items.forEach(i => { init[i] = false })
    setChecklist(init)
  }, [formType])

  async function load() {
    const { data } = await supabase.from('job_forms').select('*').eq('job_id', jobId).order('created_at', { ascending: false })
    setForms(data || [])
    setLoading(false)
  }

  const toggleItem = (item) => setChecklist(prev => ({ ...prev, [item]: !prev[item] }))

  const checkedCount = Object.values(checklist).filter(Boolean).length
  const totalItems = Object.keys(checklist).length

  async function saveForm() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const delta = readings.supply_temp && readings.return_temp
      ? (Number(readings.return_temp) - Number(readings.supply_temp)).toFixed(1)
      : null

    const payload = {
      job_id: jobId,
      form_type: formType,
      form_label: FORM_TYPES.find(f => f.id === formType)?.label,
      completed_by: user?.id,
      completed_at: new Date().toISOString(),
      checklist,
      technician_notes,
      recommendations,
      passed,
      refrigerant_type: readings.refrigerant_type,
      suction_pressure: readings.suction_pressure ? Number(readings.suction_pressure) : null,
      discharge_pressure: readings.discharge_pressure ? Number(readings.discharge_pressure) : null,
      superheat: readings.superheat ? Number(readings.superheat) : null,
      subcooling: readings.subcooling ? Number(readings.subcooling) : null,
      supply_temp: readings.supply_temp ? Number(readings.supply_temp) : null,
      return_temp: readings.return_temp ? Number(readings.return_temp) : null,
      delta_t: delta ? Number(delta) : null,
      outdoor_temp: readings.outdoor_temp ? Number(readings.outdoor_temp) : null,
      compressor_amps: readings.compressor_amps ? Number(readings.compressor_amps) : null,
      fan_motor_amps: readings.fan_motor_amps ? Number(readings.fan_motor_amps) : null,
    }

    await supabase.from('job_forms').insert(payload)
    setSaving(false)
    setShowNew(false)
    load()
  }

  const updateReading = (field, value) => setReadings(prev => ({ ...prev, [field]: value }))

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <span className="card-title-serif flex items-center gap-2">
          <ClipboardCheck size={14} /> Service Forms ({forms.length})
        </span>
        <button onClick={() => setShowNew(!showNew)} className="text-xs text-navy-200 hover:text-white">
          + New Form
        </button>
      </div>

      {showNew && (
        <div className="p-4 border-b border-navy-100">
          <div className="mb-3">
            <label className="label">Form Type</label>
            <select className="input" value={formType} onChange={e => setFormType(e.target.value)}>
              {FORM_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>

          {/* HVAC Readings */}
          <div className="bg-navy-50/50 rounded p-3 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-3">System Readings</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="label">Refrigerant</label>
                <select className="input py-1 text-xs" value={readings.refrigerant_type} onChange={e => updateReading('refrigerant_type', e.target.value)}>
                  {['R-410A', 'R-22', 'R-454B', 'R-32', 'Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Suction PSI</label>
                <input type="number" className="input py-1 text-xs" value={readings.suction_pressure} onChange={e => updateReading('suction_pressure', e.target.value)} placeholder="e.g. 118" />
              </div>
              <div>
                <label className="label">Discharge PSI</label>
                <input type="number" className="input py-1 text-xs" value={readings.discharge_pressure} onChange={e => updateReading('discharge_pressure', e.target.value)} placeholder="e.g. 400" />
              </div>
              <div>
                <label className="label">Superheat °F</label>
                <input type="number" className="input py-1 text-xs" value={readings.superheat} onChange={e => updateReading('superheat', e.target.value)} placeholder="e.g. 10" />
              </div>
              <div>
                <label className="label">Subcooling °F</label>
                <input type="number" className="input py-1 text-xs" value={readings.subcooling} onChange={e => updateReading('subcooling', e.target.value)} placeholder="e.g. 10" />
              </div>
              <div>
                <label className="label">Outdoor Temp °F</label>
                <input type="number" className="input py-1 text-xs" value={readings.outdoor_temp} onChange={e => updateReading('outdoor_temp', e.target.value)} placeholder="e.g. 85" />
              </div>
              <div>
                <label className="label">Supply Temp °F</label>
                <input type="number" className="input py-1 text-xs" value={readings.supply_temp} onChange={e => updateReading('supply_temp', e.target.value)} placeholder="e.g. 55" />
              </div>
              <div>
                <label className="label">Return Temp °F</label>
                <input type="number" className="input py-1 text-xs" value={readings.return_temp} onChange={e => updateReading('return_temp', e.target.value)} placeholder="e.g. 72" />
              </div>
              <div>
                <label className="label">ΔT (auto)</label>
                <div className="input py-1 text-xs bg-navy-50 text-slate-600">
                  {readings.supply_temp && readings.return_temp
                    ? `${(Number(readings.return_temp) - Number(readings.supply_temp)).toFixed(1)}°F`
                    : '—'}
                </div>
              </div>
              <div>
                <label className="label">Comp. Amps</label>
                <input type="number" step="0.1" className="input py-1 text-xs" value={readings.compressor_amps} onChange={e => updateReading('compressor_amps', e.target.value)} />
              </div>
              <div>
                <label className="label">Fan Amps</label>
                <input type="number" step="0.1" className="input py-1 text-xs" value={readings.fan_motor_amps} onChange={e => updateReading('fan_motor_amps', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Checklist</div>
              <span className="text-xs text-slate-500">{checkedCount}/{totalItems} complete</span>
            </div>
            <div className="bg-white border border-navy-100 rounded p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {Object.keys(checklist).map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer hover:bg-navy-50/30 rounded px-1">
                  <button type="button" onClick={() => toggleItem(item)} className="flex-shrink-0">
                    {checklist[item]
                      ? <CheckSquare size={16} className="text-emerald-600" />
                      : <Square size={16} className="text-slate-300" />}
                  </button>
                  <span className={`text-xs ${checklist[item] ? 'text-slate-500 line-through' : 'text-navy-900'}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Technician Notes</label>
              <textarea rows="3" className="input text-sm" value={technician_notes} onChange={e => setNotes(e.target.value)} placeholder="What was found, what was done…" />
            </div>
            <div>
              <label className="label">Recommendations</label>
              <textarea rows="3" className="input text-sm" value={recommendations} onChange={e => setRecommendations(e.target.value)} placeholder="Parts needed, follow-up work suggested…" />
            </div>
          </div>

          {/* Pass/Fail */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={() => setPassed(true)}
                className={`px-4 py-1.5 rounded border-2 text-sm font-medium ${passed ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-navy-100 text-slate-600'}`}>
                ✓ Pass
              </button>
              <button type="button" onClick={() => setPassed(false)}
                className={`px-4 py-1.5 rounded border-2 text-sm font-medium ${!passed ? 'border-red-400 bg-red-50 text-red-800' : 'border-navy-100 text-slate-600'}`}>
                ✗ Needs Attention
              </button>
            </div>
            <button onClick={saveForm} disabled={saving} className="btn-primary inline-flex items-center gap-2 text-sm">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Form'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400">Loading forms…</div>
      ) : forms.length === 0 && !showNew ? (
        <div className="p-6 text-center">
          <ClipboardCheck size={24} className="text-navy-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-2">No service forms yet</p>
          <button onClick={() => setShowNew(true)} className="btn-secondary text-xs">+ Create Form</button>
        </div>
      ) : (
        <div className="divide-y divide-navy-50">
          {forms.map(f => {
            const checkedItems = Object.values(f.checklist || {}).filter(Boolean).length
            const totalCheck = Object.keys(f.checklist || {}).length
            return (
              <div key={f.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-navy-900">{f.form_label || f.form_type}</span>
                      {f.passed === true && <span className="pill bg-emerald-100 text-emerald-800 inline-flex items-center gap-1"><CheckCircle size={10} /> Pass</span>}
                      {f.passed === false && <span className="pill bg-red-100 text-red-800 inline-flex items-center gap-1"><AlertCircle size={10} /> Needs Attention</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(f.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {totalCheck > 0 && ` · ${checkedItems}/${totalCheck} checklist items`}
                    </div>
                  </div>
                </div>
                {/* Show key readings */}
                {(f.suction_pressure || f.discharge_pressure || f.delta_t) && (
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                    {f.refrigerant_type && <span>⚗ {f.refrigerant_type}</span>}
                    {f.suction_pressure && <span>Suction: {f.suction_pressure} PSI</span>}
                    {f.discharge_pressure && <span>Discharge: {f.discharge_pressure} PSI</span>}
                    {f.delta_t && <span>ΔT: {f.delta_t}°F</span>}
                    {f.superheat && <span>SH: {f.superheat}°F</span>}
                    {f.subcooling && <span>SC: {f.subcooling}°F</span>}
                  </div>
                )}
                {f.technician_notes && <p className="text-xs text-slate-700 mt-2 italic">"{f.technician_notes}"</p>}
                {f.recommendations && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs text-amber-800">
                    <strong>Recommended:</strong> {f.recommendations}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
