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
        navigate('/assistant', { replace: true })
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
    <div className="min-h-screen bg-[#171717] text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-lg"
        >
          <h1 className="text-xl font-semibold text-center mb-6">Log in</h1>
          {error && (
            <p className="text-red-400 text-sm mb-4 p-2 bg-red-900/20 rounded-md" role="alert">
              {error}
            </p>
          )}
          <label className="block text-sm text-neutral-400 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 mb-4"
            placeholder="Login ID"
            autoComplete="username"
            required
          />
          <label className="block text-sm text-neutral-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 mb-6"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-neutral-600 text-white rounded-lg font-medium hover:bg-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
