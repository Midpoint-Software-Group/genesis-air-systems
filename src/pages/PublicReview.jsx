import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FullLogo } from '../components/Logo'
import { Star, CheckCircle, AlertTriangle } from 'lucide-react'

export function PublicReview() {
  const { token } = useParams()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [business, setBusiness] = useState(null)

  useEffect(() => { load() }, [token])

  async function load() {
    setLoading(true)
    // Don't require login — query via anon role
    const { data, error } = await supabase.from('reviews')
      .select('id, review_token, submitted_at, customer_name, job_id')
      .eq('review_token', token).maybeSingle()

    if (error || !data) {
      setError('Review link is invalid or expired.')
    } else if (data.submitted_at) {
      setError('This review has already been submitted. Thank you!')
      setReview(data)
    } else {
      setReview(data)
      setName(data.customer_name || '')
    }

    const { data: bs } = await supabase.from('business_settings').select('business_name, business_tagline, primary_color, accent_color').eq('id', 1).maybeSingle()
    setBusiness(bs)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setError('Please pick a star rating'); return }
    setError('')
    setSubmitting(true)
    const { error } = await supabase.from('reviews').update({
      rating,
      comment,
      customer_name: name,
      is_public: isPublic,
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    }).eq('review_token', token).is('submitted_at', null)

    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="text-sm text-slate-400">Loading…</div>
      </div>
    )
  }

  if (error && !review) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <AlertTriangle size={40} className="text-ember-600 mx-auto mb-4" />
          <h1 className="font-serif text-xl text-navy-900 mb-2">Hmm, can't find that</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted || (review && review.submitted_at)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h1 className="font-serif text-2xl text-navy-900 mb-2">Thanks for your feedback</h1>
          <p className="text-sm text-slate-600">Your review helps us improve the service we provide.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-page py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-center mb-6">
          <FullLogo size="md" />
        </div>

        <div className="card p-6 md:p-8">
          <h1 className="font-serif text-2xl text-navy-900 mb-2 text-center">How did we do?</h1>
          <p className="text-sm text-slate-600 text-center mb-6">
            Your feedback helps {business?.business_name || 'us'} keep getting better.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="p-1 transition-transform hover:scale-110">
                    <Star size={40}
                      className={(hoverRating || rating) >= n ? 'fill-ember-500 text-ember-500' : 'text-navy-200'}
                      strokeWidth={1.5} />
                  </button>
                ))}
              </div>
              <div className="text-sm text-slate-500 h-5">
                {rating === 5 && '⭐ Excellent!'}
                {rating === 4 && 'Great'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Could be better'}
                {rating === 1 && 'Needs work'}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Your Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="mb-4">
              <label className="label">Tell us more <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span></label>
              <textarea rows="4" className="input" value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="What stood out? Anything we could improve?" />
            </div>

            <label className="flex items-start gap-2 mb-6 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 rounded border-navy-200 text-ember-600 focus:ring-ember-500" />
              <span className="text-sm text-slate-700">
                It's okay to feature this review publicly with my first name
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-4">{error}</div>
            )}

            <button type="submit" disabled={submitting || !rating}
              className="btn-primary w-full text-base py-3">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          © {new Date().getFullYear()} {business?.business_name || 'Genesis Air Systems'}
        </p>
      </div>
    </div>
  )
}
