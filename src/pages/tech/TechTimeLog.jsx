import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { format, parseISO, startOfWeek, isSameDay } from 'date-fns'
import { Clock, Play, Square, Calendar } from 'lucide-react'

export function TechTimeLog() {
  const { techRecord, activeTimer, setActiveTimer } = useOutletContext()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (techRecord?.id) load() }, [techRecord])

  async function load() {
    setLoading(true)
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const { data } = await supabase.from('tech_time_log')
      .select('*, job:job_id(job_number, customer_name)')
      .eq('technician_id', techRecord.id)
      .gte('clock_in', twoWeeksAgo.toISOString())
      .order('clock_in', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  async function toggleClock() {
    if (activeTimer) {
      await supabase.from('tech_time_log').update({ clock_out: new Date().toISOString() }).eq('id', activeTimer.id)
      setActiveTimer(null)
    } else {
      const { data } = await supabase.from('tech_time_log').insert({ technician_id: techRecord.id }).select().single()
      setActiveTimer(data)
    }
    load()
  }

  if (!techRecord) return <div className="card p-6 text-center text-sm text-slate-600">Not linked to a tech profile</div>

  // Group entries by day
  const grouped = entries.reduce((acc, e) => {
    const day = format(parseISO(e.clock_in), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = { date: e.clock_in, entries: [], totalMin: 0 }
    acc[day].entries.push(e)
    if (e.duration_minutes) acc[day].totalMin += e.duration_minutes
    return acc
  }, {})

  const weekStart = startOfWeek(new Date())
  const weekTotal = entries
    .filter(e => parseISO(e.clock_in) >= weekStart && e.duration_minutes)
    .reduce((s, e) => s + e.duration_minutes, 0)

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-navy-900 mb-3">Time Log</h1>

      <button onClick={toggleClock}
        className={`w-full p-4 rounded-md mb-4 flex items-center justify-between shadow-card ${
          activeTimer ? 'bg-emerald-600 text-white' : 'bg-navy-900 text-white'
        }`}>
        <div className="text-left">
          <div className="text-xs uppercase tracking-wider opacity-80">
            {activeTimer ? 'Clocked In' : 'Not Clocked In'}
          </div>
          <div className="font-serif text-xl">
            {activeTimer ? `Since ${format(new Date(activeTimer.clock_in), 'h:mm a')}` : 'Tap to Clock In'}
          </div>
        </div>
        <div className={`p-3 rounded-full ${activeTimer ? 'bg-white text-emerald-600' : 'bg-ember-600 text-white'}`}>
          {activeTimer ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">This Week</div>
          <div className="font-serif text-xl text-navy-900">{formatDuration(weekTotal)}</div>
        </div>
        <div className="card p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Today</div>
          <div className="font-serif text-xl text-navy-900">
            {formatDuration(grouped[format(new Date(), 'yyyy-MM-dd')]?.totalMin || 0)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-center text-sm text-slate-400">Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-8 text-center">
          <Clock size={28} className="text-navy-200 mx-auto mb-3" />
          <p className="text-sm text-slate-600">No time logged in the last 2 weeks</p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, info]) => (
          <div key={day} className="card mb-3 overflow-hidden">
            <div className="bg-navy-50/50 px-3 py-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-navy-700" />
                <span className="text-xs font-medium text-navy-900">{format(parseISO(info.date), 'EEEE, MMM d')}</span>
              </div>
              <span className="text-xs text-slate-600">{formatDuration(info.totalMin)}</span>
            </div>
            <div className="divide-y divide-navy-50">
              {info.entries.map(e => (
                <div key={e.id} className="px-3 py-2 text-sm flex justify-between items-center">
                  <div>
                    <div className="text-navy-900">
                      {format(parseISO(e.clock_in), 'h:mm a')}
                      {e.clock_out && ` → ${format(parseISO(e.clock_out), 'h:mm a')}`}
                      {!e.clock_out && <span className="text-emerald-600 ml-2 text-xs">● Active</span>}
                    </div>
                    {e.job && <div className="text-[10px] text-slate-500 mt-0.5">{e.job.job_number} · {e.job.customer_name}</div>}
                  </div>
                  {e.duration_minutes && (
                    <span className="text-xs text-slate-600">{formatDuration(e.duration_minutes)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
