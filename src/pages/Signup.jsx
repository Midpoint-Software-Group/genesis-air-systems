import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullLogo } from '../components/Logo'

export function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-page">
        <div className="card max-w-md w-full p-8 text-center">
          <FullLogo size="md" />
          <h2 className="font-serif text-2xl text-navy-900 mt-8 mb-3">Check your email</h2>
          <p className="text-sm text-slate-600 mb-6">
            We sent a confirmation link to <strong className="text-navy-900">{email}</strong>.
            Click the link to verify your account.
          </p>
          <Link to="/login" className="btn-secondary inline-block">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-bg-page">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <FullLogo size="md" />
        </div>
        <h1 className="font-serif text-2xl text-navy-900 mb-2">Create your account</h1>
        <p className="text-sm text-slate-500 mb-8">Join Genesis Air Systems</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-navy-700 hover:text-ember-600">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
