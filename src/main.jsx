import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './index.css'

// Early sanity check — if env vars are missing, show a clear error before React mounts
const envCheck = {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

if (!envCheck.url || !envCheck.key) {
  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;padding:32px;font-family:-apple-system,sans-serif;background:#F8F9FC;color:#1E3A8A;">
      <div style="max-width:720px;margin:40px auto;background:#fff;border:1px solid #DBEAFE;border-radius:8px;padding:32px;">
        <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;">⚠ Configuration Error</h1>
        <p style="font-size:14px;color:#475569;">
          Supabase environment variables are missing from this build.
          The site needs <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> set on Netlify
          and must be rebuilt after setting them.
        </p>
        <pre style="background:#F8F9FC;padding:12px;border-radius:4px;font-size:12px;margin-top:16px;">
VITE_SUPABASE_URL: ${envCheck.url || '(missing)'}
VITE_SUPABASE_ANON_KEY: ${envCheck.key ? '(present)' : '(missing)'}
        </pre>
      </div>
    </div>
  `
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
