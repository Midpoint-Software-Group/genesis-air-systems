import { supabase } from './supabase'

// Haversine distance in miles
export function haversineMiles(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const R = 3959
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Geocode an address — caches via Edge Function (uses Nominatim)
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  if (!r.ok) return null
  return await r.json()
}

// Score techs for a given job
// Inputs:
//   job: { latitude, longitude, scheduled_at, estimated_duration_minutes, priority }
//   techs: technician records (must include id, full_name, current_status, latitude/longitude, home_base_lat/lng)
//   jobsByTech: optional map of techId -> array of scheduled jobs
//
// Returns array sorted by score descending. Each entry: { tech, score, reasons, distance, conflicts }
export function rankTechsForJob(job, techs, jobsByTech = {}) {
  if (!techs?.length) return []

  return techs.map(tech => {
    const reasons = []
    let score = 100
    let distance = null

    // ---- Distance scoring (up to -40 pts based on distance) ----
    const techLat = tech.latitude ?? tech.home_base_latitude
    const techLon = tech.longitude ?? tech.home_base_longitude
    if (job.latitude && job.longitude && techLat && techLon) {
      distance = haversineMiles(job.latitude, job.longitude, techLat, techLon)
      if (distance != null) {
        if (distance < 5) { reasons.push('🟢 Very close (<5 mi)') }
        else if (distance < 15) { score -= 5; reasons.push(`🟡 ${distance.toFixed(1)} mi away`) }
        else if (distance < 30) { score -= 15; reasons.push(`🟠 ${distance.toFixed(1)} mi away`) }
        else { score -= 30; reasons.push(`🔴 ${distance.toFixed(1)} mi away`) }
      }
    } else if (job.latitude && job.longitude) {
      score -= 10
      reasons.push('⚪ No location data for tech')
    }

    // ---- Availability scoring ----
    if (tech.current_status === 'off_duty') {
      score -= 50
      reasons.push('⚠ Currently off duty')
    } else if (tech.current_status === 'available') {
      reasons.push('✓ Available now')
    } else if (tech.current_status === 'on_break') {
      score -= 10
      reasons.push('On break')
    }

    // ---- Conflict detection ----
    const techJobs = jobsByTech[tech.id] || []
    const jobStart = new Date(job.scheduled_at)
    const jobEnd = new Date(jobStart.getTime() + (job.estimated_duration_minutes || 60) * 60000)
    const conflicts = techJobs.filter(j => {
      if (j.id === job.id) return false // skip self
      if (j.status === 'completed' || j.status === 'cancelled') return false
      const jStart = new Date(j.scheduled_at)
      const jEnd = new Date(jStart.getTime() + (j.estimated_duration_minutes || 60) * 60000)
      return jStart < jobEnd && jEnd > jobStart
    })
    if (conflicts.length > 0) {
      score -= 60
      reasons.push(`⛔ Conflict with ${conflicts[0].job_number}`)
    }

    // ---- Workload (jobs scheduled same day) ----
    const sameDayCount = techJobs.filter(j => {
      const jDate = new Date(j.scheduled_at).toDateString()
      return jDate === jobStart.toDateString() && j.id !== job.id &&
        !['completed', 'cancelled'].includes(j.status)
    }).length
    if (sameDayCount >= 6) { score -= 25; reasons.push(`📋 ${sameDayCount} jobs that day`) }
    else if (sameDayCount >= 4) { score -= 10; reasons.push(`📋 ${sameDayCount} jobs that day`) }
    else if (sameDayCount > 0) { reasons.push(`📋 ${sameDayCount} job${sameDayCount > 1 ? 's' : ''} that day`) }
    else { score += 5; reasons.push('📅 Free day') }

    // ---- Urgent priority bonus for available techs ----
    if (job.priority === 'urgent' && tech.current_status === 'available') {
      score += 10
      reasons.push('🚨 Available for urgent')
    }

    return {
      tech,
      score: Math.max(0, score),
      reasons,
      distance,
      conflicts,
    }
  }).sort((a, b) => b.score - a.score)
}

// Optimize a list of jobs into a route (nearest-neighbor from a start point)
// Used for "Today's route" view per tech
export function optimizeRoute(jobs, startLat, startLon) {
  const unrouted = jobs.filter(j => j.latitude && j.longitude)
  if (unrouted.length === 0) return []

  const route = []
  let currentLat = startLat ?? unrouted[0].latitude
  let currentLon = startLon ?? unrouted[0].longitude
  const remaining = [...unrouted]
  let totalMiles = 0

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = haversineMiles(currentLat, currentLon, remaining[0].latitude, remaining[0].longitude) ?? Infinity
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineMiles(currentLat, currentLon, remaining[i].latitude, remaining[i].longitude) ?? Infinity
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const next = remaining.splice(bestIdx, 1)[0]
    route.push({ ...next, leg_distance: bestDist })
    totalMiles += bestDist || 0
    currentLat = next.latitude
    currentLon = next.longitude
  }

  return { route, totalMiles }
}
