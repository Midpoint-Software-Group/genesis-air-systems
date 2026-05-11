import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { optimizeRoute, geocodeAddress, haversineMiles } from '../lib/scheduler'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { format, parseISO } from 'date-fns'
import {
  Map as MapIcon, Navigation, AlertCircle, Sparkles, Route as RouteIcon,
  ExternalLink, RefreshCw, Truck
} from 'lucide-react'

export function Routes() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [techs, setTechs] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTechId, setSelectedTechId] = useState('all')
  const [geocodingCount, setGeocodingCount] = useState(0)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true)
    const start = `${date}T00:00:00`
    const end = `${date}T23:59:59`

    const [{ data: t }, { data: j }] = await Promise.all([
      supabase.from('technicians')
        .select('id, full_name, home_base_latitude, home_base_longitude, latitude, longitude')
        .eq('is_active', true).order('full_name'),
      supabase.from('jobs')
        .select('id, job_number, customer_name, service_type, status, priority, scheduled_at, estimated_duration_minutes, latitude, longitude, address_line1, city, state, zip_code, assigned_tech_id, assigned_tech_name')
        .gte('scheduled_at', start).lte('scheduled_at', end)
        .in('status', ['scheduled', 'en_route', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: true }),
    ])

    setTechs(t || [])
    setJobs(j || [])
    setLoading(false)
  }

  async function geocodeMissing() {
    const missing = jobs.filter(j => !j.latitude && j.address_line1)
    if (missing.length === 0) return
    setGeocodingCount(missing.length)

    for (const job of missing) {
      const addr = [job.address_line1, job.city, job.state, job.zip_code].filter(Boolean).join(', ')
      try {
        const geo = await geocodeAddress(addr)
        if (geo?.latitude) {
          await supabase.from('jobs').update({
            latitude: geo.latitude, longitude: geo.longitude,
            geocoded_at: new Date().toISOString(),
          }).eq('id', job.id)
        }
      } catch (e) { /* skip */ }
      setGeocodingCount(c => c - 1)
      // Nominatim has 1 req/sec rate limit
      await new Promise(r => setTimeout(r, 1200))
    }
    setGeocodingCount(0)
    load()
  }

  // Group jobs by tech, then optimize routes per-tech
  const routes = useMemo(() => {
    const byTech = {}
    techs.forEach(t => { byTech[t.id] = { tech: t, jobs: [] } })
    byTech['unassigned'] = { tech: { id: 'unassigned', full_name: 'Unassigned' }, jobs: [] }

    jobs.forEach(j => {
      const key = j.assigned_tech_id || 'unassigned'
      if (!byTech[key]) byTech[key] = { tech: { id: key, full_name: j.assigned_tech_name || 'Unknown' }, jobs: [] }
      byTech[key].jobs.push(j)
    })

    // Optimize each
    Object.keys(byTech).forEach(key => {
      const entry = byTech[key]
      if (entry.jobs.length === 0) { entry.optimizedRoute = []; entry.totalMiles = 0; return }
      const startLat = entry.tech.home_base_latitude ?? entry.tech.latitude
      const startLon = entry.tech.home_base_longitude ?? entry.tech.longitude
      const opt = optimizeRoute(entry.jobs, startLat, startLon)
      entry.optimizedRoute = opt.route || []
      entry.totalMiles = opt.totalMiles || 0
    })

    return byTech
  }, [techs, jobs])

  const displayedRoutes = selectedTechId === 'all'
    ? Object.values(routes).filter(r => r.jobs.length > 0)
    : routes[selectedTechId] ? [routes[selectedTechId]] : []

  const jobsWithCoords = jobs.filter(j => j.latitude && j.longitude)
  const jobsWithoutCoords = jobs.filter(j => !j.latitude && j.address_line1)

  // For the embedded map preview, compute bounding box
  const bounds = jobsWithCoords.length > 0 ? {
    minLat: Math.min(...jobsWithCoords.map(j => j.latitude)),
    maxLat: Math.max(...jobsWithCoords.map(j => j.latitude)),
    minLon: Math.min(...jobsWithCoords.map(j => j.longitude)),
    maxLon: Math.max(...jobsWithCoords.map(j => j.longitude)),
  } : null

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle="Daily route optimization and field mapping"
        actions={
          <>
            <input type="date" className="input py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
            {jobsWithoutCoords.length > 0 && (
              <button onClick={geocodeMissing} disabled={geocodingCount > 0}
                className="btn-secondary inline-flex items-center gap-2 text-xs">
                <RefreshCw size={12} className={geocodingCount > 0 ? 'animate-spin' : ''} />
                {geocodingCount > 0
                  ? `Geocoding ${geocodingCount}…`
                  : `Geocode ${jobsWithoutCoords.length} address${jobsWithoutCoords.length > 1 ? 'es' : ''}`}
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="stat-card">
          <div className="stat-label">Jobs on this day</div>
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-delta">{jobsWithCoords.length} mapped</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total miles (optimized)</div>
          <div className="stat-value">
            {displayedRoutes.reduce((s, r) => s + (r.totalMiles || 0), 0).toFixed(1)}
          </div>
          <div className="stat-delta">Across all techs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Techs working</div>
          <div className="stat-value">{Object.values(routes).filter(r => r.jobs.length > 0 && r.tech.id !== 'unassigned').length}</div>
        </div>
      </div>

      {jobsWithoutCoords.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle size={14} className="text-amber-700 mt-0.5" />
          <div>
            <strong>{jobsWithoutCoords.length} job{jobsWithoutCoords.length > 1 ? 's are' : ' is'} missing coordinates.</strong>
            Click "Geocode addresses" above to look them up. Routes only optimize for mapped jobs.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <div>
          <div className="card p-4 mb-3">
            <label className="label mb-2">View tech</label>
            <select className="input" value={selectedTechId} onChange={(e) => setSelectedTechId(e.target.value)}>
              <option value="all">All techs</option>
              {Object.values(routes).filter(r => r.jobs.length > 0).map(r => (
                <option key={r.tech.id} value={r.tech.id}>
                  {r.tech.full_name} ({r.jobs.length} job{r.jobs.length > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : displayedRoutes.length === 0 ? (
            <div className="card p-8 text-center">
              <Truck size={28} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No jobs scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedRoutes.map(r => (
                <RouteCard key={r.tech.id} routeEntry={r} />
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden sticky top-20 h-fit">
          <div className="card-header">
            <span className="card-title-serif flex items-center gap-2">
              <MapIcon size={14} /> Map View
            </span>
            <span className="text-xs text-navy-200">{jobsWithCoords.length} pin{jobsWithCoords.length !== 1 ? 's' : ''}</span>
          </div>
          {bounds && jobsWithCoords.length > 0 ? (
            <RoutesMap jobs={jobsWithCoords} bounds={bounds} techsById={Object.fromEntries(techs.map(t => [t.id, t]))} />
          ) : (
            <div className="p-12 text-center bg-navy-50/30">
              <MapIcon size={32} className="text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No mapped jobs yet</p>
              {jobsWithoutCoords.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Click "Geocode addresses" to plot them</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RouteCard({ routeEntry }) {
  const { tech, optimizedRoute, totalMiles } = routeEntry
  const mappedJobs = optimizedRoute.filter(j => j.latitude && j.longitude)

  // Build a Google Maps directions URL with waypoints
  const directionsUrl = mappedJobs.length > 0
    ? `https://www.google.com/maps/dir/${mappedJobs.map(j => `${j.latitude},${j.longitude}`).join('/')}`
    : null

  return (
    <div className="card overflow-hidden">
      <div className="bg-navy-50/50 px-3 py-2 flex items-center justify-between border-b border-navy-100">
        <div>
          <div className="text-sm font-medium text-navy-900">{tech.full_name}</div>
          <div className="text-[10px] text-slate-500">
            {optimizedRoute.length} stop{optimizedRoute.length !== 1 ? 's' : ''}
            {totalMiles > 0 && ` · ~${totalMiles.toFixed(1)} mi`}
          </div>
        </div>
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-ember-600 hover:text-ember-800 inline-flex items-center gap-1">
            <Navigation size={12} /> Directions <ExternalLink size={10} />
          </a>
        )}
      </div>
      {optimizedRoute.length === 0 ? (
        <div className="p-3 text-xs text-slate-400 text-center">No jobs</div>
      ) : (
        <ol className="divide-y divide-navy-50">
          {optimizedRoute.map((job, idx) => (
            <li key={job.id} className="p-3 flex items-start gap-2">
              <div className={`w-6 h-6 rounded-full ${job.latitude ? 'bg-navy-900 text-white' : 'bg-slate-200 text-slate-500'} text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-navy-900 hover:text-ember-600">
                  {job.job_number} · {job.customer_name}
                </Link>
                <div className="text-[11px] text-slate-600">{job.service_type}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                  <span>{format(parseISO(job.scheduled_at), 'h:mm a')}</span>
                  {job.leg_distance != null && idx > 0 && <span>· {job.leg_distance.toFixed(1)}mi from prev</span>}
                  <StatusPill status={job.status} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function RoutesMap({ jobs, bounds }) {
  // Pad bounds 10%
  const padLat = (bounds.maxLat - bounds.minLat) * 0.15 || 0.02
  const padLon = (bounds.maxLon - bounds.minLon) * 0.15 || 0.02
  const minLat = bounds.minLat - padLat
  const maxLat = bounds.maxLat + padLat
  const minLon = bounds.minLon - padLon
  const maxLon = bounds.maxLon + padLon

  // Use OpenStreetMap embed
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`
  const markerStr = jobs.slice(0, 50).map((j, i) => `${j.latitude},${j.longitude}`).join('&marker=')
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerStr}`

  return (
    <div>
      <iframe
        title="Routes map"
        src={mapSrc}
        className="w-full h-96 border-0"
        loading="lazy"
      />
      <div className="px-3 py-2 border-t border-navy-100 text-[10px] text-slate-500 flex justify-between">
        <span>Powered by OpenStreetMap</span>
        <a href={`https://www.openstreetmap.org/?bbox=${bbox}&layers=N`} target="_blank" rel="noopener noreferrer"
          className="text-ember-600 hover:underline inline-flex items-center gap-0.5">
          Open larger map <ExternalLink size={8} />
        </a>
      </div>
    </div>
  )
}
