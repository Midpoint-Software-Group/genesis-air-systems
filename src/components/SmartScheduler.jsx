import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rankTechsForJob, geocodeAddress } from '../lib/scheduler'
import { Sparkles, MapPin, AlertCircle } from 'lucide-react'

// Renders a list of tech recommendations with scores and reasons.
// onSelect(techId) is called when user picks a tech.
export function SmartScheduler({
  jobAddress,
  scheduledAt,
  durationMinutes = 60,
  priority = 'normal',
  selectedTechId = '',
  onSelect,
  existingJobId = null,
}) {
  const [techs, setTechs] = useState([])
  const [techJobs, setTechJobs] = useState({})
  const [jobCoords, setJobCoords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('technicians')
        .select('id, full_name, current_status, latitude, longitude, home_base_latitude, home_base_longitude')
        .eq('is_active', true).order('full_name'),
      supabase.from('jobs')
        .select('id, job_number, assigned_tech_id, scheduled_at, estimated_duration_minutes, status')
        .in('status', ['scheduled', 'en_route', 'in_progress'])
        .not('assigned_tech_id', 'is', null),
    ]).then(([t, j]) => {
      setTechs(t.data || [])
      const byTech = {}
      ;(j.data || []).forEach(job => {
        if (!byTech[job.assigned_tech_id]) byTech[job.assigned_tech_id] = []
        byTech[job.assigned_tech_id].push(job)
      })
      setTechJobs(byTech)
      setLoading(false)
    })
  }, [])

  // Geocode the job address when it changes
  useEffect(() => {
    if (!jobAddress?.address_line1) { setJobCoords(null); return }
    const fullAddress = [jobAddress.address_line1, jobAddress.city, jobAddress.state, jobAddress.zip_code].filter(Boolean).join(', ')
    if (fullAddress.length < 5) { setJobCoords(null); return }

    const timer = setTimeout(async () => {
      setGeocoding(true)
      setError('')
      try {
        const result = await geocodeAddress(fullAddress)
        if (result?.latitude) setJobCoords({ latitude: result.latitude, longitude: result.longitude })
        else setJobCoords(null)
      } catch (e) {
        setError('Could not look up address location')
      } finally {
        setGeocoding(false)
      }
    }, 800) // debounce
    return () => clearTimeout(timer)
  }, [jobAddress?.address_line1, jobAddress?.city, jobAddress?.state, jobAddress?.zip_code])

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading techs…</div>
  if (techs.length === 0) return <div className="text-xs text-slate-400 py-2">No active techs available</div>

  const jobInput = {
    id: existingJobId,
    latitude: jobCoords?.latitude,
    longitude: jobCoords?.longitude,
    scheduled_at: scheduledAt,
    estimated_duration_minutes: durationMinutes,
    priority,
  }
  const ranked = rankTechsForJob(jobInput, techs, techJobs)
  const top = ranked.slice(0, 4)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} className="text-ember-600" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Smart Suggestions</span>
        {geocoding && <span className="text-[10px] text-slate-400">geocoding address…</span>}
        {!geocoding && jobCoords && <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5"><MapPin size={9} />location found</span>}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded text-xs mb-2 inline-flex items-center gap-1.5">
          <AlertCircle size={10} /> {error}
        </div>
      )}

      <div className="space-y-1.5">
        {top.map((entry, idx) => {
          const isSelected = selectedTechId === entry.tech.id
          const isBest = idx === 0
          return (
            <button key={entry.tech.id} type="button"
              onClick={() => onSelect(entry.tech.id)}
              className={`w-full text-left p-2.5 rounded border-2 transition-all ${
                isSelected ? 'border-ember-500 bg-ember-50' :
                isBest ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300' :
                'border-navy-100 bg-white hover:border-navy-200'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-800 text-[10px] font-medium flex items-center justify-center">
                    {entry.tech.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-navy-900">{entry.tech.full_name}</div>
                    <div className="text-[10px] text-slate-500">{entry.reasons.slice(0, 2).join(' · ')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${
                    entry.score >= 80 ? 'text-emerald-700' :
                    entry.score >= 50 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {entry.score}
                  </div>
                  {entry.distance != null && <div className="text-[10px] text-slate-500">{entry.distance.toFixed(1)}mi</div>}
                </div>
              </div>
              {entry.conflicts.length > 0 && (
                <div className="text-[10px] text-red-700 mt-1 pt-1 border-t border-red-100">
                  ⛔ Conflicts with {entry.conflicts.map(c => c.job_number).join(', ')}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {!jobCoords && jobAddress?.address_line1 && (
        <p className="text-[10px] text-slate-400 mt-2">
          📍 Distance scoring needs a valid address. Showing availability-only ranking.
        </p>
      )}
    </div>
  )
}
