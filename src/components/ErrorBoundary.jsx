import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      const env = {
        url: import.meta.env.VITE_SUPABASE_URL || '(missing)',
        keyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      }
      return (
        <div style={{
          minHeight: '100vh', padding: 32, fontFamily: '-apple-system, sans-serif',
          background: '#F8F9FC', color: '#1E3A8A',
        }}>
          <div style={{
            maxWidth: 720, margin: '40px auto', background: '#fff',
            border: '1px solid #DBEAFE', borderRadius: 8, padding: 32,
          }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 8 }}>
              ⚠ Application Error
            </div>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
              Something crashed while rendering. This page is shown instead of a white screen
              so we can see what happened.
            </p>

            <div style={{
              background: '#FEE2E2', border: '1px solid #FECACA', padding: 12,
              borderRadius: 6, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#7F1D1D',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error?.message || String(this.state.error)}
            </div>

            {this.state.info?.componentStack && (
              <details style={{ marginBottom: 16 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#64748B' }}>Component stack</summary>
                <pre style={{
                  fontSize: 11, color: '#475569', background: '#F8F9FC',
                  padding: 12, borderRadius: 4, overflow: 'auto', maxHeight: 240,
                }}>{this.state.info.componentStack}</pre>
              </details>
            )}

            <div style={{ fontSize: 12, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
              <strong>Environment check:</strong><br />
              VITE_SUPABASE_URL: <code>{env.url}</code><br />
              VITE_SUPABASE_ANON_KEY: <code>{env.keyPresent ? 'present' : '(missing)'}</code>
            </div>

            <button onClick={() => { window.location.href = '/' }}
              style={{
                marginTop: 16, padding: '8px 16px', background: '#EA580C', color: '#fff',
                border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 14,
              }}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
