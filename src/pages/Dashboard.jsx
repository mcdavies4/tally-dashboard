import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const navigate = useNavigate()

  const [planLimit, setPlanLimit] = useState(3)
  const [currentPlan, setCurrentPlan] = useState('free')

  const fetchApps = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('apps')
      .select('*')
      .eq('owner_email', user.email)
      .order('created_at', { ascending: false })
    setApps(data || [])

    // Get plan limits
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('owner_email', user.email)
      .single()

    const plan = sub?.plan || 'free'
    setCurrentPlan(plan)

    const { data: limits } = await supabase
      .from('plan_limits')
      .select('max_apps')
      .eq('plan', plan)
      .single()

    setPlanLimit(limits?.max_apps ?? 3)
    setLoading(false)
  }

  useEffect(() => { fetchApps() }, [])

  const createApp = async () => {
    if (!newAppName.trim()) return
    if (currentPlan === 'free' && apps.length >= planLimit) {
      setShowCreate(false)
      return
    }
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Create app
    const { data: app, error } = await supabase
      .from('apps')
      .insert({ name: newAppName.trim(), owner_email: user.email })
      .select()
      .single()

    if (!error && app) {
      // Auto-generate live + test keys
      const liveKey = 'tally_live_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0')).join('')
      const testKey = 'tally_test_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      await supabase.from('api_keys').insert([
        { app_id: app.id, key: liveKey, label: 'Live key', is_active: true, is_sandbox: false },
        { app_id: app.id, key: testKey, label: 'Test key', is_active: true, is_sandbox: true },
      ])

      setNewAppName('')
      setShowCreate(false)
      await fetchApps()
      navigate(`/apps/${app.id}`)
    }
    setCreating(false)
  }

  return (
    <div style={{ padding: '48px 48px', maxWidth: 900 }}>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Your Apps</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            Each app gets its own API keys and user credit ledger
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {currentPlan === 'free' && (
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {apps.length}/{planLimit} apps
            </span>
          )}
          <button
            onClick={() => {
              if (currentPlan === 'free' && apps.length >= planLimit) {
                window.location.href = '/billing'
              } else {
                setShowCreate(true)
              }
            }}
            style={{
              ...btnPrimary,
              background: currentPlan === 'free' && apps.length >= planLimit ? 'var(--yellow)' : 'var(--accent)',
              color: '#000',
            }}
          >
            {currentPlan === 'free' && apps.length >= planLimit ? '⚡ Upgrade to add more' : '+ New App'}
          </button>
        </div>
      </div>

      {/* Create App Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, backdropFilter: 'blur(4px)',
        }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="fade-up" style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 32, width: 400,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create a new app</h3>
            <label style={labelStyle}>App name</label>
            <input
              autoFocus
              value={newAppName}
              onChange={e => setNewAppName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createApp()}
              placeholder="My AI Tool"
              style={{ ...inputStyle, marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={createApp} disabled={creating} style={btnPrimary}>
                {creating ? <div className="spinner" style={{ borderTopColor: '#000' }} /> : 'Create App'}
              </button>
              <button onClick={() => setShowCreate(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Apps Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      ) : apps.length === 0 ? (
        <div className="fade-up-1" style={{
          border: '1px dashed var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: 64,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No apps yet. Create your first one.</p>
          <button onClick={() => setShowCreate(true)} style={{ ...btnPrimary, marginTop: 20 }}>
            + New App
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {apps.map((app, i) => (
            <AppCard key={app.id} app={app} index={i} onClick={() => navigate(`/apps/${app.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AppCard({ app, index, onClick }) {
  const [keyCount, setKeyCount] = useState('—')
  const [userCount, setUserCount] = useState('—')

  useEffect(() => {
    supabase.from('api_keys').select('id', { count: 'exact' }).eq('app_id', app.id).eq('is_active', true)
      .then(({ count }) => setKeyCount(count ?? 0))
    supabase.from('app_users').select('id', { count: 'exact' }).eq('app_id', app.id)
      .then(({ count }) => setUserCount(count ?? 0))
  }, [app.id])

  return (
    <div
      className={`fade-up-${Math.min(index + 1, 4)}`}
      onClick={onClick}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent-border)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'var(--accent)',
        }}>
          {app.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {new Date(app.created_at).toLocaleDateString()}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{app.name}</div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Stat label="API Keys" value={keyCount} />
        <Stat label="Users" value={userCount} />
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

const btnPrimary = {
  padding: '10px 20px',
  background: 'var(--accent)',
  color: '#000',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'var(--font-display)',
}

const btnGhost = {
  padding: '10px 20px',
  background: 'transparent',
  color: 'var(--text-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-display)',
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
}
