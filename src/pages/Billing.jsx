import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: 0,
    priceLabel: '$0/mo',
    features: ['3 apps', '100 total users', 'Full ledger history', 'Community support'],
    limit: '100 users',
    stripePriceId: null,
  },
  {
    id: 'starter',
    label: 'Starter',
    price: 9,
    priceLabel: '$9/mo',
    features: ['Unlimited apps', '1,000 active users', 'Full ledger history', 'Email support'],
    limit: '1,000 users',
    stripePriceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID,
    popular: false,
  },
  {
    id: 'growth',
    label: 'Growth',
    price: 29,
    priceLabel: '$29/mo',
    features: ['Unlimited apps', '10,000 active users', 'Full ledger history', 'Priority support'],
    limit: '10,000 users',
    stripePriceId: import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID,
    popular: true,
  },
  {
    id: 'scale',
    label: 'Scale',
    price: 79,
    priceLabel: '$79/mo',
    features: ['Unlimited apps', 'Unlimited users', 'Full ledger history', 'SLA + priority support'],
    limit: 'Unlimited users',
    stripePriceId: import.meta.env.VITE_STRIPE_SCALE_PRICE_ID,
    popular: false,
  },
]

export default function Billing() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [appCount, setAppCount] = useState(0)
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    // Load subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_email', user.email)
      .single()

    setSubscription(sub || { plan: 'free', status: 'active' })

    // Load usage stats
    const { data: apps } = await supabase
      .from('apps')
      .select('id')
      .eq('owner_email', user.email)

    const appIds = (apps || []).map(a => a.id)
    setAppCount(appIds.length)

    if (appIds.length > 0) {
      const { count } = await supabase
        .from('app_users')
        .select('id', { count: 'exact' })
        .in('app_id', appIds)
      setUserCount(count || 0)
    }

    setLoading(false)
  }

  const handleUpgrade = async (plan) => {
    if (plan.id === 'free') return
    setUpgrading(plan.id)

    const { data: { user } } = await supabase.auth.getUser()
    const apiUrl = import.meta.env.VITE_API_URL || 'https://your-api.railway.app'

    try {
      const res = await fetch(`${apiUrl}/billing/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          priceId: plan.stripePriceId,
          plan: plan.id,
        }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
    }
    setUpgrading(null)
  }

  const handleManage = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const apiUrl = import.meta.env.VITE_API_URL || 'https://your-api.railway.app'

    try {
      const res = await fetch(`${apiUrl}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error('Portal error:', err)
    }
  }

  const currentPlan = PLANS.find(p => p.id === subscription?.plan) || PLANS[0]

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )

  return (
    <div style={{ padding: '48px 48px', maxWidth: 960 }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Billing</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          Manage your plan and usage
        </p>
      </div>

      {/* Current usage */}
      <div className="fade-up-1" style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              Current plan:
              <span style={{
                marginLeft: 8,
                padding: '3px 10px',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
              }}>
                {currentPlan.label}
              </span>
            </div>
            {subscription?.current_period_end && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
          {subscription?.plan !== 'free' && (
            <button onClick={handleManage} style={btnGhost}>
              Manage subscription →
            </button>
          )}
        </div>

        {/* Usage bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <UsageBar
            label="Apps"
            used={appCount}
            max={currentPlan.id === 'free' ? 3 : 999}
            unlimited={currentPlan.id !== 'free'}
          />
          <UsageBar
            label="Active users"
            used={userCount}
            max={currentPlan.id === 'free' ? 100 : currentPlan.id === 'starter' ? 1000 : currentPlan.id === 'growth' ? 10000 : -1}
            unlimited={currentPlan.id === 'scale'}
          />
        </div>
      </div>

      {/* Plans grid */}
      <div className="fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {PLANS.map(plan => {
          const isCurrent = subscription?.plan === plan.id
          return (
            <div key={plan.id} style={{
              background: 'var(--bg-2)',
              border: `1px solid ${plan.popular ? 'var(--accent-border)' : isCurrent ? 'var(--border-light)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#000',
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{plan.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: plan.popular ? 'var(--accent)' : 'var(--text)' }}>
                  {plan.priceLabel}
                </div>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{
                  padding: '10px',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                }}>
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={upgrading === plan.id || plan.id === 'free'}
                  style={{
                    padding: '10px',
                    background: plan.popular ? 'var(--accent)' : 'transparent',
                    color: plan.popular ? '#000' : 'var(--text)',
                    border: `1px solid ${plan.popular ? 'var(--accent)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: plan.id === 'free' ? 'default' : 'pointer',
                    fontFamily: 'var(--font-display)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: plan.id === 'free' ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {upgrading === plan.id
                    ? <div className="spinner" style={{ borderTopColor: plan.popular ? '#000' : 'var(--accent)' }} />
                    : plan.id === 'free' ? 'Downgrade' : `Upgrade to ${plan.label}`
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* No percentage note */}
      <div className="fade-up-3" style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        Flat monthly pricing. No percentage of revenue. No surprises.
      </div>
    </div>
  )
}

function UsageBar({ label, used, max, unlimited }) {
  const pct = unlimited || max === -1 ? 5 : Math.min((used / max) * 100, 100)
  const isWarning = pct > 80
  const isOver = pct >= 100

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isOver ? 'var(--red)' : 'var(--text-2)' }}>
          {used.toLocaleString()} / {unlimited || max === -1 ? '∞' : max.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: isOver ? 'var(--red)' : isWarning ? 'var(--yellow)' : 'var(--accent)',
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

const btnGhost = {
  padding: '8px 16px',
  background: 'transparent',
  color: 'var(--text-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
}
