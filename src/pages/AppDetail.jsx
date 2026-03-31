import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const TABS = ['API Keys', 'Users', 'Transactions', 'Analytics', 'Settings']

export default function AppDetail() {
  const { appId } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [tab, setTab] = useState('API Keys')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('apps').select('*').eq('id', appId).single()
      .then(({ data }) => { setApp(data); setLoading(false) })
  }, [appId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )
  if (!app) return <div style={{ padding: 48, color: 'var(--text-2)' }}>App not found.</div>

  return (
    <div style={{ padding: '48px 48px', maxWidth: 960 }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          ← all apps
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: 'var(--accent)', fontWeight: 800,
          }}>
            {app.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{app.name}</h1>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {appId}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up-1" style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-3)',
            fontSize: 13,
            fontWeight: tab === t ? 600 : 400,
            cursor: 'pointer',
            marginBottom: -1,
            transition: 'color 0.15s',
            fontFamily: 'var(--font-display)',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="fade-up-2">
        {tab === 'API Keys' && <ApiKeysTab appId={appId} />}
        {tab === 'Users' && <UsersTab appId={appId} />}
        {tab === 'Transactions' && <TransactionsTab appId={appId} />}
        {tab === 'Analytics' && <AnalyticsTab appId={appId} />}
        {tab === 'Settings' && <SettingsTab appId={appId} app={app} />}
      </div>
    </div>
  )
}

// ─── API Keys Tab ───────────────────────────────────────────────
function ApiKeysTab({ appId }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [revealed, setRevealed] = useState({})

  const fetchKeys = async () => {
    const { data } = await supabase.from('api_keys').select('*').eq('app_id', appId).order('created_at', { ascending: false })
    setKeys(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchKeys() }, [appId])

  const createKey = async () => {
    setCreating(true)
    const key = 'tally_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('api_keys').insert({ app_id: appId, key, label: newLabel || 'New key', is_active: true })
    setNewLabel('')
    await fetchKeys()
    setCreating(false)
  }

  const revokeKey = async (id) => {
    await supabase.from('api_keys').update({ is_active: false }).eq('id', id)
    await fetchKeys()
  }

  if (loading) return <Loader />

  return (
    <div>
      {/* Create new key */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Key label (e.g. Production)"
          style={{ ...inputStyle, maxWidth: 280 }}
          onKeyDown={e => e.key === 'Enter' && createKey()}
        />
        <button onClick={createKey} disabled={creating} style={btnPrimary}>
          {creating ? <div className="spinner" style={{ borderTopColor: '#000' }} /> : '+ Generate Key'}
        </button>
      </div>

      {/* Keys list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {keys.map(k => (
          <div key={k.id} style={{
            background: 'var(--bg-2)',
            border: `1px solid ${k.is_active ? 'var(--border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            opacity: k.is_active ? 1 : 0.4,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</span>
                <span style={{
                  fontSize: 10, padding: '2px 8px',
                  background: k.is_active ? 'var(--accent-dim)' : 'var(--bg-3)',
                  color: k.is_active ? 'var(--accent)' : 'var(--text-3)',
                  border: `1px solid ${k.is_active ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 4, fontFamily: 'var(--font-mono)',
                }}>
                  {k.is_active ? 'active' : 'revoked'}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>
                {revealed[k.id] ? k.key : k.key.slice(0, 12) + '••••••••••••••••••••••••••••••••'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setRevealed(r => ({ ...r, [k.id]: !r[k.id] }))} style={btnGhost}>
                {revealed[k.id] ? 'hide' : 'reveal'}
              </button>
              <button onClick={() => navigator.clipboard.writeText(k.key)} style={btnGhost}>
                copy
              </button>
              {k.is_active && (
                <button onClick={() => revokeKey(k.id)} style={{ ...btnGhost, color: 'var(--red)', borderColor: 'rgba(255,68,68,0.2)' }}>
                  revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Users Tab ──────────────────────────────────────────────────
function UsersTab({ appId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('app_users')
      .select('*, balances(balance)')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [appId])

  if (loading) return <Loader />

  const filtered = users.filter(u => u.external_id.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by user ID..."
        style={{ ...inputStyle, maxWidth: 320, marginBottom: 20 }}
      />

      {filtered.length === 0 ? (
        <Empty message="No users yet. They appear automatically when your API is called." />
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                <Th>User ID</Th>
                <Th>Balance</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Td mono>{u.external_id}</Td>
                  <Td>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {Number(u.balances?.balance ?? 0).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 4 }}>credits</span>
                  </Td>
                  <Td mono dim>{new Date(u.created_at).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Transactions Tab ───────────────────────────────────────────
function TransactionsTab({ appId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('ledger')
      .select('*, app_users!inner(app_id, external_id)')
      .eq('app_users.app_id', appId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [appId])

  if (loading) return <Loader />
  if (entries.length === 0) return <Empty message="No transactions yet." />

  const typeColor = { add: 'var(--accent)', deduct: 'var(--red)', refund: 'var(--yellow)' }
  const typeSign = { add: '+', deduct: '-', refund: '↩' }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <Th>User</Th>
            <Th>Type</Th>
            <Th>Amount</Th>
            <Th>Balance After</Th>
            <Th>Description</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
            >
              <Td mono>{e.app_users?.external_id}</Td>
              <Td>
                <span style={{
                  fontSize: 11, padding: '3px 8px',
                  background: typeColor[e.event_type] + '15',
                  color: typeColor[e.event_type],
                  border: `1px solid ${typeColor[e.event_type]}30`,
                  borderRadius: 4, fontFamily: 'var(--font-mono)',
                }}>
                  {e.event_type}
                </span>
              </Td>
              <Td>
                <span style={{ color: typeColor[e.event_type], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {typeSign[e.event_type]}{Number(e.amount).toLocaleString()}
                </span>
              </Td>
              <Td mono dim>{Number(e.balance_after).toLocaleString()}</Td>
              <Td dim>{e.description || '—'}</Td>
              <Td mono dim>{new Date(e.created_at).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Analytics Tab ──────────────────────────────────────────────
function AnalyticsTab({ appId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [usersRes, ledgerRes] = await Promise.all([
        supabase.from('app_users').select('id', { count: 'exact' }).eq('app_id', appId),
        supabase.from('ledger').select('event_type, amount, app_users!inner(app_id)').eq('app_users.app_id', appId),
      ])

      const ledger = ledgerRes.data || []
      const totalAdded = ledger.filter(e => e.event_type === 'add').reduce((s, e) => s + Number(e.amount), 0)
      const totalDeducted = ledger.filter(e => e.event_type === 'deduct').reduce((s, e) => s + Number(e.amount), 0)
      const totalRefunded = ledger.filter(e => e.event_type === 'refund').reduce((s, e) => s + Number(e.amount), 0)
      const totalTxns = ledger.length

      setStats({
        users: usersRes.count ?? 0,
        totalAdded,
        totalDeducted,
        totalRefunded,
        totalTxns,
        consumptionRate: totalAdded > 0 ? ((totalDeducted / totalAdded) * 100).toFixed(1) : 0,
      })
      setLoading(false)
    }
    load()
  }, [appId])

  if (loading) return <Loader />

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Users" value={stats.users.toLocaleString()} accent />
        <StatCard label="Credits Added" value={stats.totalAdded.toLocaleString()} />
        <StatCard label="Credits Consumed" value={stats.totalDeducted.toLocaleString()} />
        <StatCard label="Credits Refunded" value={stats.totalRefunded.toLocaleString()} />
        <StatCard label="Total Transactions" value={stats.totalTxns.toLocaleString()} />
        <StatCard label="Consumption Rate" value={`${stats.consumptionRate}%`} accent />
      </div>

      {/* Consumption bar */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Credit Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', width: 80, fontFamily: 'var(--font-mono)' }}>Added</div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'var(--accent)', borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', width: 80, textAlign: 'right' }}>
            {stats.totalAdded.toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', width: 80, fontFamily: 'var(--font-mono)' }}>Consumed</div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.consumptionRate}%`, background: 'var(--red)', borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--red)', width: 80, textAlign: 'right' }}>
            {stats.totalDeducted.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Settings Tab ───────────────────────────────────────────────
function SettingsTab({ appId, app }) {
  const [rate, setRate] = useState(app.credit_rate ?? 100)
  const [currency, setCurrency] = useState(app.rate_currency ?? 'gbp')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: 'var(--text-3)',
    fontFamily: 'var(--font-mono)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const save = async () => {
    setSaving(true)
    await supabase
      .from('apps')
      .update({ credit_rate: Number(rate), rate_currency: currency })
      .eq('id', appId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Credit Conversion Rate</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 24, lineHeight: 1.6 }}>
          Set how many credits a user receives per 1 unit of currency. Used automatically when <code style={{ background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 3 }}>tally_credits</code> is not passed in Stripe metadata.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Currency</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="gbp">GBP (£)</option>
              <option value="usd">USD ($)</option>
              <option value="eur">EUR (€)</option>
              <option value="ngn">NGN (₦)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Credits per 1 unit</label>
            <input
              type="number"
              min="1"
              value={rate}
              onChange={e => setRate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            Preview: £10 payment → <strong>{(10 * Number(rate)).toLocaleString()} credits</strong>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
            £1 = {Number(rate).toLocaleString()} credits
          </div>
        </div>

        <button onClick={save} disabled={saving} style={btnPrimary}>
          {saving ? <div className="spinner" style={{ borderTopColor: '#000' }} /> : saved ? '✓ Saved' : 'Save rate'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Webhook URLs</h3>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 20, lineHeight: 1.6 }}>
          Point your payment provider's webhook at your app-specific URL below. Pass <code style={{ background: 'var(--bg-3)', padding: '1px 6px', borderRadius: 3 }}>tally_user_id</code> in payment metadata.
        </p>
        {[
          { label: 'Stripe', path: 'stripe' },
          { label: 'Polar', path: 'polar' },
        ].map(({ label, path }) => {
          const url = `${import.meta.env.VITE_API_URL || 'https://your-api.railway.app'}/webhooks/${path}/${appId}`
          return (
            <div key={path} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ ...inputStyle, flex: 1, color: 'var(--text-3)', fontSize: 12, display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
                  {url}
                </div>
                <button onClick={() => navigator.clipboard.writeText(url)} style={btnGhost}>copy</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared Components ──────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg-2)', border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)', color: accent ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  )
}

function Th({ children }) {
  return <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{children}</th>
}

function Td({ children, mono, dim }) {
  return <td style={{ padding: '13px 16px', fontSize: 13, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', color: dim ? 'var(--text-2)' : 'var(--text)' }}>{children}</td>
}

function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
}

function Empty({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
      {message}
    </div>
  )
}

const btnPrimary = {
  padding: '10px 18px', background: 'var(--accent)', color: '#000',
  border: 'none', borderRadius: 'var(--radius)', fontSize: 13,
  fontWeight: 700, cursor: 'pointer', display: 'flex',
  alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)',
}

const btnGhost = {
  padding: '7px 14px', background: 'transparent', color: 'var(--text-2)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)',
}

const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-3)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text)', fontSize: 13, outline: 'none',
}

