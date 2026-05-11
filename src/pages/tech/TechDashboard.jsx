import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusPill } from '../../components/StatusPill'
import { format, isToday, isTomorrow } from 'date-fns'
import { Clock, MapPin, Phone, ChevronRight, Wrench, AlertTriangle, Play, Square } from 'lucide-react'

const STATUS_TRANSITIONS = {
  scheduled: 'en_route',
  en_route: 'in_progress',
  in_progress: 'completed',
}

export function TechDashboard() {
  const { techRecord, activeTimer, setActiveTimer } = useOutletContext()
  const [todayJobs, setTodayJobs] = useState([])
  const [upcomingJobs, setUpcomingJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { if (techRecord?.id) load() }, [techRecord])

  // GPS: update tech location when the dashboard mounts and on an interval
  useEffect(() => {
    if (!techRecord?.id) return
    function updateLocation() {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        pos => {
          supabase.from('technicians').update({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).eq('id', techRecord.id).then()
        },
        () => { /* permission denied — silently skip */ },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
    updateLocation()
    const interval = setInterval(updateLocation, 5 * 60 * 1000) // every 5 min
    return () => clearInterval(interval)
  }, [techRecord])

  async function load() {
    setLoading(true)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const sevenDaysOut = new Date()
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)

    const { data } = await supabase.from('jobs')
      .select('id, job_number, customer_name, customer_type, service_type, priority, status, scheduled_at, address_line1, city, state, description')
      .eq('assigned_tech_id', techRecord.id)
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', sevenDaysOut.toISOString())
      .in('status', ['scheduled', 'en_route', 'in_progress'])
      .order('scheduled_at', { ascending: true })

    const today = []
    const upcoming = []
    ;(data || []).forEach(job => {
      if (isToday(new Date(job.scheduled_at))) today.push(job)
      else upcoming.push(job)
    })
    setTodayJobs(today)
    setUpcomingJobs(upcoming)
    setLoading(false)
  }

  async function advanceJob(job) {
    setUpdating(job.id)
    const newStatus = STATUS_TRANSITIONS[job.status]
    if (!newStatus) { setUpdating(null); return }

    const updates = { status: newStatus }
    if (newStatus === 'in_progress') updates.started_at = new Date().toISOString()
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()

    await supabase.from('jobs').update(updates).eq('id', job.id)

    // Update tech status
    if (newStatus === 'en_route') await supabase.from('technicians').update({ current_status: 'en_route', current_job_id: job.id }).eq('id', techRecord.id)
    if (newStatus === 'in_progress') await supabase.from('technicians').update({ current_status: 'on_job', current_job_id: job.id }).eq('id', techRecord.id)
    if (newStatus === 'completed') await supabase.from('technicians').update({ current_status: 'available', current_job_id: null }).eq('id', techRecord.id)

    setUpdating(null)
    load()
  }

  async function toggleClock() {
    if (activeTimer) {
      await supabase.from('tech_time_log').update({ clock_out: new Date().toISOString() }).eq('id', activeTimer.id)
      setActiveTimer(null)
    } else {
      const { data } = await supabase.from('tech_time_log').insert({
        technician_id: techRecord.id,
      }).select().single()
      setActiveTimer(data)
    }
  }

  if (!techRecord) {
    return (
      <div className="card p-6 text-center">
        <Wrench size={32} className="text-navy-200 mx-auto mb-3" />
        <h2 className="font-serif text-lg text-navy-900 mb-2">Not linked to a tech profile</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your account isn't linked to a technician record yet. Ask the admin to set this up.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-2xl text-navy-900">Hey, {techRecord.full_name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <button onClick={toggleClock}
        className={`w-full p-4 rounded-md mb-4 flex items-center justify-between shadow-card transition-all ${
          activeTimer ? 'bg-emerald-600 text-white' : 'bg-navy-900 text-white'
        }`}>
        <div className="text-left">
          <div className="text-xs uppercase tracking-wider opacity-80">
            {activeTimer ? 'Currently Clocked In' : 'Not Clocked In'}
          </div>
          <div className="font-serif text-xl">
            {activeTimer ? format(new Date(activeTimer.clock_in), 'h:mm a') : 'Tap to Clock In'}
          </div>
        </div>
        <div className={`p-3 rounded-full ${activeTimer ? 'bg-white text-emerald-600' : 'bg-ember-600 text-white'}`}>
          {activeTimer ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </div>
      </button>

      {loading ? (
        <div className="card p-6 text-center text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {todayJobs.length > 0 && (
            <div className="mb-4">
              <h2 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                Today · {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-2">
                {todayJobs.map(job => (
                  <JobCard key={job.id} job={job} onAdvance={advanceJob} updating={updating === job.id} />
                ))}
              </div>
            </div>
          )}

          {upcomingJobs.length > 0 && (
            <div className="mb-4">
              <h2 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                Upcoming · Next 7 days
              </h2>
              <div className="space-y-2">
                {upcomingJobs.map(job => (
                  <JobCard key={job.id} job={job} compact />
                ))}
              </div>
            </div>
          )}

          {todayJobs.length === 0 && upcomingJobs.length === 0 && (
            <div className="card p-8 text-center">
              <Wrench size={28} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No jobs assigned right now</p>
              <p className="text-xs text-slate-400 mt-1">Check back later or ask dispatch</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function JobCard({ job, onAdvance, updating, compact }) {
  const nextStatus = STATUS_TRANSITIONS[job.status]
  const nextLabel = {
    en_route: 'Start Drive',
    in_progress: 'Arrive on Site',
    completed: 'Complete Job',
  }[nextStatus]

  return (
    <Link to={`/tech/jobs/${job.id}`}
      className="block bg-white rounded-md border border-navy-100 overflow-hidden hover:shadow-card transition-shadow">
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium text-navy-700">{job.job_number}</span>
              <StatusPill status={job.status} />
              {job.priority === 'urgent' && (
                <span className="pill bg-red-100 text-red-800 inline-flex items-center gap-1">
                  <AlertTriangle size={9} /> URGENT
                </span>
              )}
            </div>
            <div className="font-medium text-navy-900">{job.customer_name}</div>
            <div className="text-sm text-slate-600 mt-0.5">{job.service_type}</div>
          </div>
          <div className="text-right ml-2">
            <div className="text-sm font-medium text-navy-900">{format(new Date(job.scheduled_at), 'h:mm a')}</div>
            {!compact && <div className="text-[10px] text-slate-500">{format(new Date(job.scheduled_at), 'MMM d')}</div>}
          </div>
        </div>

        {!compact && job.address_line1 && (
          <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-navy-50 text-xs text-slate-600">
            <MapPin size={11} className="text-ember-600 mt-0.5 flex-shrink-0" />
            <span>{job.address_line1}, {job.city}, {job.state}</span>
          </div>
        )}
      </div>

      {!compact && nextStatus && (
        <button onClick={(e) => { e.preventDefault(); onAdvance(job) }} disabled={updating}
          className={`w-full text-white py-3 text-sm font-medium transition-colors ${
            nextStatus === 'completed' ? 'bg-ember-600 hover:bg-ember-700' : 'bg-navy-900 hover:bg-navy-800'
          }`}>
          {updating ? 'Updating…' : `${nextLabel} →`}
        </button>
      )}
    </Link>
  )
}
