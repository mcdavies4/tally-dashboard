import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // login | signup
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handle = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        opacity: 0.3,
      }} />

      <div className="fade-up" style={{
        width: '100%',
        maxWidth: 400,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '-1px',
            fontFamily: 'var(--font-display)',
          }}>
            tally
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            the credit layer for developers
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handle()}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && handle()}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              {message}
            </div>
          )}

          <button
            onClick={handle}
            disabled={loading}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? <div className="spinner" style={{ borderTopColor: '#000' }} /> : null}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-display)' }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-3)',
  fontFamily: 'var(--font-mono)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}
