import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusPill } from '../../components/StatusPill'
import { PhotoGallery } from '../../components/PhotoGallery'
import { format } from 'date-fns'
import {
  ArrowLeft, MapPin, Phone, User, Clock, Wrench, AlertTriangle,
  Play, CheckCircle, Truck, Edit3, Save, X, FileSignature
} from 'lucide-react'

const STATUS_TRANSITIONS = {
  scheduled: { next: 'en_route', label: 'Start Drive', icon: Truck, color: 'bg-amber-600' },
  en_route: { next: 'in_progress', label: 'Arrived on Site', icon: Play, color: 'bg-emerald-600' },
  in_progress: { next: 'completed', label: 'Complete Job', icon: CheckCircle, color: 'bg-ember-600' },
}

export function TechJobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { techRecord } = useOutletContext()
  const [job, setJob] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [showSignature, setShowSignature] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: j } = await supabase.from('jobs').select('*').eq('id', id).single()
    setJob(j)
    setNotes(j?.internal_notes || '')
    if (j?.customer_id) {
      const { data: c } = await supabase.from('customers').select('*').eq('id', j.customer_id).single()
      setCustomer(c)
    }
    setLoading(false)
  }

  async function advanceStatus() {
    setUpdating(true)
    const transition = STATUS_TRANSITIONS[job.status]
    const newStatus = transition.next
    const updates = { status: newStatus }
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString()
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()

    await supabase.from('jobs').update(updates).eq('id', id)

    if (techRecord) {
      const techUpdates = {}
      if (newStatus === 'en_route') { techUpdates.current_status = 'en_route'; techUpdates.current_job_id = id }
      if (newStatus === 'in_progress') { techUpdates.current_status = 'on_job'; techUpdates.current_job_id = id }
      if (newStatus === 'completed') { techUpdates.current_status = 'available'; techUpdates.current_job_id = null }
      if (Object.keys(techUpdates).length) await supabase.from('technicians').update(techUpdates).eq('id', techRecord.id)
    }

    setUpdating(false)
    load()
  }

  async function saveNotes() {
    await supabase.from('jobs').update({ internal_notes: notes }).eq('id', id)
    setEditingNotes(false)
    load()
  }

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
  if (!job) return <div className="p-8 text-center text-sm text-slate-400">Job not found</div>

  const transition = STATUS_TRANSITIONS[job.status]
  const Icon = transition?.icon

  return (
    <div>
      <button onClick={() => navigate('/tech')} className="text-slate-500 hover:text-navy-900 inline-flex items-center gap-1 text-sm mb-3">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="card p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs font-medium text-slate-500">{job.job_number}</div>
            <h1 className="font-serif text-xl text-navy-900 mt-0.5">{job.service_type}</h1>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <StatusPill status={job.status} />
            {job.priority === 'urgent' && (
              <span className="pill bg-red-100 text-red-800 inline-flex items-center gap-1">
                <AlertTriangle size={9} /> URGENT
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm mt-3 pt-3 border-t border-navy-50">
          <div className="flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            <span className="text-navy-900 font-medium">{job.customer_name}</span>
          </div>
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-navy-700">
              <Phone size={14} className="text-emerald-600" />
              <span>{customer.phone}</span>
            </a>
          )}
          {job.address_line1 && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address_line1}, ${job.city}, ${job.state}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 text-navy-700">
              <MapPin size={14} className="text-ember-600 mt-0.5" />
              <span>{job.address_line1}, {job.city}, {job.state}</span>
            </a>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={14} className="text-slate-400" />
            <span>{format(new Date(job.scheduled_at), 'EEE, MMM d · h:mm a')}</span>
          </div>
        </div>

        {job.description && (
          <div className="mt-3 pt-3 border-t border-navy-50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">From Dispatch</div>
            <p className="text-sm text-slate-700">{job.description}</p>
          </div>
        )}
      </div>

      {transition && (
        <button onClick={advanceStatus} disabled={updating}
          className={`w-full ${transition.color} text-white py-4 rounded-md font-medium mb-4 shadow-elevated active:scale-[0.98] transition-transform`}>
          <Icon size={20} className="inline-block mr-2" />
          {updating ? 'Updating…' : transition.label}
        </button>
      )}

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Job Notes</div>
          {!editingNotes ? (
            <button onClick={() => setEditingNotes(true)} className="text-ember-600 text-xs flex items-center gap-1">
              <Edit3 size={10} /> Edit
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => { setEditingNotes(false); setNotes(job.internal_notes || '') }}
                className="text-slate-500 text-xs">Cancel</button>
              <button onClick={saveNotes} className="text-ember-600 text-xs font-medium">
                <Save size={10} className="inline mr-0.5" /> Save
              </button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea autoFocus rows="4" className="input text-sm" value={notes}
            onChange={(e) => setNotes(e.target.value)} placeholder="What did you find? What did you do?" />
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[40px]">
            {job.internal_notes || <span className="text-slate-400 italic">Tap Edit to add notes</span>}
          </p>
        )}
      </div>

      <PhotoGallery jobId={id} />

      {job.status === 'completed' && !job.customer_signature_data && (
        <button onClick={() => setShowSignature(true)}
          className="w-full bg-navy-900 text-white py-3 rounded-md font-medium mt-4 inline-flex items-center justify-center gap-2">
          <FileSignature size={16} /> Capture Customer Signature
        </button>
      )}

      {job.customer_signature_data && (
        <div className="card p-4 mt-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Customer Signature</div>
          <div className="bg-white border border-navy-100 rounded p-2 mb-2">
            <img src={job.customer_signature_data} alt="Signature" className="max-h-32" />
          </div>
          <div className="text-xs text-slate-600">
            Signed by <strong>{job.customer_signature_name}</strong> on {format(new Date(job.customer_signature_date), 'MMM d, yyyy h:mm a')}
          </div>
        </div>
      )}

      {showSignature && (
        <SignaturePad jobId={id} onClose={() => setShowSignature(false)} onSaved={() => { setShowSignature(false); load() }} />
      )}
    </div>
  )
}

function SignaturePad({ jobId, onClose, onSaved }) {
  const canvasRef = useRef(null)
  const [signerName, setSignerName] = useState('')
  const [saving, setSaving] = useState(false)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1E3A8A'

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
      return { x: x * (canvas.width / rect.width), y: y * (canvas.height / rect.height) }
    }

    const start = (e) => {
      e.preventDefault()
      drawing.current = true
      const { x, y } = getCoords(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const move = (e) => {
      if (!drawing.current) return
      e.preventDefault()
      const { x, y } = getCoords(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasInk(true)
    }
    const stop = () => { drawing.current = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', stop)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', stop)
    }
  }, [])

  function clear() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasInk(false)
  }

  async function save() {
    if (!signerName.trim()) { alert('Please enter the signer name'); return }
    if (!hasInk) { alert('Please capture a signature'); return }
    setSaving(true)
    const dataUrl = canvasRef.current.toDataURL('image/png')
    await supabase.from('jobs').update({
      customer_signature_data: dataUrl,
      customer_signature_name: signerName.trim(),
      customer_signature_date: new Date().toISOString(),
    }).eq('id', jobId)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-navy-950/80 z-50 flex items-end sm:items-center justify-center p-2">
      <div className="bg-white rounded-md w-full max-w-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-serif text-lg text-navy-900">Customer Signature</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-navy-900"><X size={20} /></button>
        </div>

        <label className="label">Signer's Name</label>
        <input className="input mb-3" value={signerName} onChange={(e) => setSignerName(e.target.value)}
          placeholder="Person signing on behalf of customer" autoFocus />

        <label className="label">Sign Below</label>
        <div className="bg-navy-50 rounded border-2 border-dashed border-navy-200 mb-2">
          <canvas ref={canvasRef} width={600} height={200}
            className="w-full h-40 touch-none cursor-crosshair" />
        </div>
        <button onClick={clear} className="text-xs text-slate-500 hover:text-navy-900 mb-3">Clear & redo</button>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !hasInk || !signerName.trim()}
            className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Signature'}
          </button>
        </div>
      </div>
    </div>
  )
}
