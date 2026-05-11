import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { StatCard } from '../components/StatCard'
import { format } from 'date-fns'
import { Star, MessageCircle, TrendingUp, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react'

export function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('submitted')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let query = supabase.from('reviews')
      .select('*, job:job_id(job_number, service_type), technician:technician_id(full_name)')
      .order('created_at', { ascending: false })

    if (filter === 'submitted') query = query.not('submitted_at', 'is', null)
    else if (filter === 'pending') query = query.is('submitted_at', null)

    const { data } = await query.limit(100)
    setReviews(data || [])
    setLoading(false)
  }

  async function togglePublic(reviewId, current) {
    await supabase.from('reviews').update({ is_public: !current }).eq('id', reviewId)
    load()
  }

  const submitted = reviews.filter(r => r.submitted_at)
  const avgRating = submitted.length > 0
    ? submitted.reduce((s, r) => s + (r.rating || 0), 0) / submitted.length : 0
  const fiveStarCount = submitted.filter(r => r.rating === 5).length
  const lowRatings = submitted.filter(r => r.rating && r.rating <= 3)

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Customer feedback after completed jobs" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Avg Rating" value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'}
          sub={`${submitted.length} review${submitted.length !== 1 ? 's' : ''}`} icon={Star} />
        <StatCard label="5-Star" value={fiveStarCount}
          sub={submitted.length > 0 ? `${((fiveStarCount / submitted.length) * 100).toFixed(0)}% of all` : '—'} icon={TrendingUp} />
        <StatCard label="Below 4 Stars" value={lowRatings.length}
          sub={lowRatings.length > 0 ? 'Needs follow-up' : 'All good'} warning={lowRatings.length > 0} icon={MessageCircle} />
        <StatCard label="Pending" value={reviews.length - submitted.length}
          sub="Awaiting customer" icon={Clock} />
      </div>

      <div className="flex gap-1 mb-4">
        {[
          { id: 'submitted', label: 'Submitted' },
          { id: 'pending', label: 'Pending' },
          { id: 'all', label: 'All' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={filter === f.id ? 'btn-navy text-xs px-3 py-1.5' : 'btn-ghost text-xs'}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-400">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="card">
          <EmptyState icon={Star} title="No reviews yet"
            message="When a job is completed and the review email is sent, customer feedback will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              {r.submitted_at ? (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={14} className={n <= r.rating ? 'fill-ember-500 text-ember-500' : 'text-slate-200'} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-navy-900">{r.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublic(r.id, r.is_public)}
                        title={r.is_public ? 'Public — click to hide' : 'Private — click to make public'}
                        className={r.is_public ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-navy-700'}>
                        {r.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <span className="text-[10px] text-slate-500">{format(new Date(r.submitted_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-slate-700 mb-2">{r.comment}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-navy-50">
                    {r.job && <Link to={`/jobs/${r.job_id}`} className="hover:text-ember-600">{r.job.job_number} · {r.job.service_type}</Link>}
                    {r.technician && <span>Tech: {r.technician.full_name}</span>}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-600">Pending review from {r.customer_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Sent {format(new Date(r.created_at), 'MMM d')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
