import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const LOGIN_URL = API_BASE ? `${API_BASE}/auth/login` : '/api/auth/login'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      if (data.token) {
        login(data.token)
        navigate('/deals', { replace: true })
      } else {
        setError('Invalid response from server')
      }
    } catch (err) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-8 flex items-center justify-center">
      <div className="w-full flex flex-row ml-[15%] items-center">
        <div className="space-y-4 text-left">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF7102]">
            WEH Call Intelligence
          </div>
          <h1 className="font-serif text-[40px] leading-[1.2] text-[#1A1815]">
            Sign in to unlock
            <br />
            your calls{' '}
            <span className="text-[#FF7102]">
              today.
            </span>
          </h1>
          <div className="h-px w-24 bg-[#D4CFC4]" />
          <p className="max-w-md text-[13px] leading-relaxed text-[#5A5650]">
            Secure access to your venture CRM, meeting transcripts, and Jarvis AI.
          </p>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#E8E5DE] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#1A1815]">Log in to WEH CRM</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E8E5DE] bg-[#FAFAF8] px-2 py-[3px] text-[9px] font-mono uppercase tracking-[0.16em] text-[#5A5650]">
                <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#3D7A58]" />
                <span>Secure</span>
              </span>
            </div>

            {error && (
              <p
                className="mb-4 rounded-[10px] border border-[#FEE4E2] bg-[#FEF3F2] px-3 py-2 text-[11px] text-[#B42318]"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-[11px] font-medium text-[#5A5650]">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-[10px] border border-[#E8E5DE] bg-[#FAFAF8] px-3.5 py-2.5 text-[13px] text-[#1A1815] placeholder:text-[#C8C3BB] focus:outline-none focus:ring-1 focus:ring-[#FF7102]/50 focus:border-[#FF7102]"
                placeholder="Login ID"
                autoComplete="username"
                required
              />
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-[11px] font-medium text-[#5A5650]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[10px] border border-[#E8E5DE] bg-[#FAFAF8] px-3.5 py-2.5 text-[13px] text-[#1A1815] placeholder:text-[#C8C3BB] focus:outline-none focus:ring-1 focus:ring-[#FF7102]/50 focus:border-[#FF7102]"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full h-[32px] items-center justify-center gap-2 rounded-[9px] bg-[#1A1815] px-4 text-[13px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            </button>

            <p className="mt-3 text-[10px] font-mono text-[#C8C3BB]">
              Internal tool · WEH team access only
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
