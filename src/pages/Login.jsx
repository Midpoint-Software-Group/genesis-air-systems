import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullLogo } from '../components/Logo'
import { Wind } from 'lucide-react'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 hidden lg:flex bg-navy-900 relative items-center justify-center p-12">
        <div className="absolute top-8 left-8">
          <FullLogo size="md" dark />
        </div>
        <div className="max-w-md text-center">
          <Wind size={64} className="text-ember-500 mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="font-serif text-3xl text-white mb-3">
            Professional Field Service Management
          </h2>
          <p className="text-navy-200 text-sm leading-relaxed">
            Built for HVAC professionals serving residential and commercial clients.
            Track jobs, dispatch techs, and grow your service business.
          </p>
        </div>
        <div className="absolute bottom-8 left-8 right-8 flex justify-between text-xs text-navy-300">
          <div>Heating · Cooling · Service</div>
          <div>Est. 2026</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-bg-page">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <FullLogo size="md" />
          </div>
          <h1 className="font-serif text-2xl text-navy-900 mb-2">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-8">Sign in to your Genesis Air Systems account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signup" className="text-sm text-navy-700 hover:text-ember-600">
              Need an account? Sign up
            </Link>
          </div>

          <div className="mt-12 text-center text-xs text-slate-400">
            © 2026 Genesis Air Systems · Powered by Midpoint
          </div>
        </div>
      </div>
    </div>
  )
}
