import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

export default function Layout({ session }) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.5px',
            color: 'var(--accent)',
          }}>
            tally
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            credit layer api
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2h4v4H2V2zm7 0h4v4H9V2zM2 9h4v4H9V9zm7 0h4v4H9V9z" fill="currentColor"/></svg>
            Apps
          </NavLink>
          <NavLink to="/billing" style={({ isActive }) => navStyle(isActive)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 3h13v2H1V3zm0 4h13v1H1V7zm0 3h8v1H1v-1zm0 3h5v1H1v-1z" fill="currentColor"/></svg>
            Billing
          </NavLink>
          {session.user.email === ADMIN_EMAIL && (
            <NavLink to="/admin" style={({ isActive }) => ({
              ...navStyle(isActive),
              color: isActive ? 'var(--red)' : 'var(--text-3)',
              background: isActive ? 'rgba(255,68,68,0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(255,68,68,0.2)' : '1px solid transparent',
            })}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7 1a6 6 0 100 12A6 6 0 007 1zM4 7a3 3 0 116 0 3 3 0 01-6 0z" fill="currentColor"/></svg>
              Admin
            </NavLink>
          )}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </div>
          <button onClick={handleSignOut} style={{
            fontSize: 12,
            color: 'var(--text-2)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}
          onMouseEnter={e => e.target.style.color = 'var(--red)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-2)'}
          >
            sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}

function navStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--accent)' : 'var(--text-2)',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
    transition: 'all 0.15s',
  }
}
