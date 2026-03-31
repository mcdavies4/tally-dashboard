import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function Admin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState(null)
  const [developers, setDevelopers] = useState([])
  const [selectedDev, setSelectedDev] = useState(null)
  const [devApps, setDevApps] = useState([])
  const [devTransactions, setDevTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    setAuthorized(true)
    await loadData()
    setLoading(false)
  }

  const loadData = async () => {
    // Total developers (unique owner emails in apps)
    const { data: apps } = await supabase
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: allUsers } = await supabase
      .from('app_users')
      .select('id', { count: 'exact' })

    const { data: allLedger } = await supabase
      .from('ledger')
      .select('event_type, amount')

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')

    const totalCreditsAdded = (allLedger || [])
      .filter(e => e.event_type === 'add')
      .reduce((s, e) => s + Number(e.amount), 0)

    const totalCreditsDeducted = (allLedger || [])
      .filter(e => e.event_type === 'deduct')
      .reduce((s, e) => s + Number(e.amount), 0)

    // Group apps by developer
    const devMap = {}
    ;(apps || []).forEach(app => {
      if (!devMap[app.owner_email]) {
        devMap[app.owner_email] = { email: app.owner_email, apps: [], created_at: app.created_at }
      }
      devMap[app.owner_email].apps.push(app)
    })

    // Attach subscription info
    ;(subs || []).forEach(sub => {
      if (devMap[sub.owner_email]) {
        devMap[sub.owner_email].plan = sub.plan
        devMap[sub.owner_email].status = sub.status
      }
    })

    const devList = Object.values(devMap).map(d => ({
      ...d,
      plan: d.plan || 'free',
      app_count: d.apps.length,
    }))

    const planCounts = { free: 0, starter: 0, growth: 0, scale: 0 }
    devList.forEach(d => { planCounts[d.plan] = (planCounts[d.plan] || 0) + 1 })

    const mrr = (planCounts.starter * 9) + (planCounts.growth * 29) + (planCounts.scale * 79)

    setStats({
      totalDevs: devList.length,
      totalApps: (apps || []).length,
      totalUsers: allUsers?.length || 0,
      totalTransactions: (allLedger || []).length,
      totalCreditsAdded,
      totalCreditsDeducted,
      mrr,
      planCounts,
    })

    setDevelopers(devList)
  }

  const loadDevDetail = async (dev) => {
    setSelectedDev(dev)
    setTab('developer')

    const appIds = dev.apps.map(a => a.id)

    // Get user counts per app
    const appsWithCounts = await Promise.all(dev.apps.map(async app => {
      const { count } = await supabase
        .from('app_users')
        .select('id', { count: 'exact' })
        .eq('app_id', app.id)
      return { ...app, user_count: count || 0 }
    }))
    setDevApps(appsWithCounts)

    // Get recent transactions
    if (appIds.length > 0) {
      const { data: txns } = await supabase
        .from('ledger')
        .select('*, app_users!inner(app_id, external_id)')
        .in('app_users.app_id', appIds)
        .order('created_at', { ascending: false })
        .limit(20)
      setDevTransactions(txns || [])
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )

  if (!authorized) return null

  const filtered = developers.filter(d =>
    d.email.toLowerCase().includes(search.toLowerCase())
  )

  const planColor = { free: '#555', starter: '#66b3ff', growth: '#00ff88', scale: '#ffcc00' }

  return (
    <div style={{ padding: '48px 48px', maxWidth: 1100 }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {tab === 'developer' && (
            <button onClick={() => setTab('overview')} style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer', padding: 0,
            }}>← back</button>
          )}
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {tab === 'developer' ? selectedDev?.email : 'Admin'}
          </h1>
          <span style={{
            fontSize: 10, padding: '3px 10px',
            background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)',
            color: 'var(--red)', borderRadius: 4, fontFamily: 'var(--font-mono)',
          }}>PRIVATE</span>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          {tab === 'developer' ? `${selectedDev?.app_count} apps · ${selectedDev?.plan} plan` : 'Full platform overview'}
        </p>
      </div>

      {tab === 'overview' && stats && (
        <>
          {/* Stats grid */}
          <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
            <StatCard label="MRR" value={`$${stats.mrr}`} accent />
            <StatCard label="Developers" value={stats.totalDevs} />
            <StatCard label="Total Apps" value={stats.totalApps} />
            <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} />
            <StatCard label="Transactions" value={stats.totalTransactions.toLocaleString()} />
            <StatCard label="Credits Added" value={stats.totalCreditsAdded.toLocaleString()} />
            <StatCard label="Credits Used" value={stats.totalCreditsDeducted.toLocaleString()} />
            <StatCard label="Paid Devs" value={stats.planCounts.starter + stats.planCounts.growth + stats.planCounts.scale} accent />
          </div>

          {/* Plan breakdown */}
          <div className="fade-up-2" style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 28,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan breakdown</div>
            <div style={{ display: 'flex', gap: 24 }}>
              {Object.entries(stats.planCounts).map(([plan, count]) => (
                <div key={plan}>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: planColor[plan] }}>{count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{plan}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Developers table */}
          <div className="fade-up-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                All developers ({filtered.length})
              </div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email..."
                style={{
                  padding: '8px 14px', background: 'var(--bg-3)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text)', fontSize: 12, outline: 'none',
                  fontFamily: 'var(--font-mono)', width: 240,
                }}
              />
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                    <Th>Email</Th>
                    <Th>Plan</Th>
                    <Th>Apps</Th>
                    <Th>Joined</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((dev, i) => (
                    <tr key={dev.email}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Td mono>{dev.email}</Td>
                      <Td>
                        <span style={{
                          fontSize: 11, padding: '3px 8px',
                          background: planColor[dev.plan] + '15',
                          color: planColor[dev.plan],
                          border: `1px solid ${planColor[dev.plan]}30`,
                          borderRadius: 4, fontFamily: 'var(--font-mono)',
                        }}>{dev.plan}</span>
                      </Td>
                      <Td mono>{dev.app_count}</Td>
                      <Td mono dim>{new Date(dev.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <button onClick={() => loadDevDetail(dev)} style={{
                          fontSize: 11, padding: '5px 12px',
                          background: 'transparent', color: 'var(--text-2)',
                          border: '1px solid var(--border)', borderRadius: 4,
                          cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        }}>view →</button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'developer' && selectedDev && (
        <>
          {/* Dev apps */}
          <div className="fade-up-1" style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Apps</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {devApps.map(app => (
                <div key={app.id} style={{
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 20,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                    {new Date(app.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {app.user_count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>users</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="fade-up-2">
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recent transactions (last 20)
            </div>
            {devTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                No transactions yet
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                      <Th>User</Th>
                      <Th>Type</Th>
                      <Th>Amount</Th>
                      <Th>Balance after</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {devTransactions.map((t, i) => {
                      const typeColor = { add: 'var(--accent)', deduct: 'var(--red)', refund: 'var(--yellow)' }
                      const typeSign = { add: '+', deduct: '-', refund: '↩' }
                      return (
                        <tr key={t.id}
                          style={{ borderBottom: i < devTransactions.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <Td mono>{t.app_users?.external_id}</Td>
                          <Td>
                            <span style={{
                              fontSize: 11, padding: '3px 8px',
                              background: typeColor[t.event_type] + '15',
                              color: typeColor[t.event_type],
                              border: `1px solid ${typeColor[t.event_type]}30`,
                              borderRadius: 4, fontFamily: 'var(--font-mono)',
                            }}>{t.event_type}</span>
                          </Td>
                          <Td>
                            <span style={{ color: typeColor[t.event_type], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {typeSign[t.event_type]}{Number(t.amount).toLocaleString()}
                            </span>
                          </Td>
                          <Td mono dim>{Number(t.balance_after).toLocaleString()}</Td>
                          <Td mono dim>{new Date(t.created_at).toLocaleDateString()}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
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
