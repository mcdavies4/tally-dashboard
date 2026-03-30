import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import AppDetail from './pages/AppDetail'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div className="spinner" style={{ width: 24, height: 24 }} />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Layout session={session} /> : <Navigate to="/auth" />}>
          <Route index element={<Dashboard />} />
          <Route path="apps/:appId" element={<AppDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
