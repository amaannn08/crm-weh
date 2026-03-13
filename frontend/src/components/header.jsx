import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Header() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo-white.svg"
            alt="WH Logo"
            className="w-20"
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500">
            Call Intelligence
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
              <span className="rounded-full bg-amber-400 px-1.5 py-[1px] text-[10px] font-semibold text-white">
                142
              </span>
              <span>Calls indexed</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
              <span className="rounded-full bg-slate-900 px-1.5 py-[1px] text-[10px] font-semibold text-slate-100">
                187h
              </span>
              <span>Of transcripts</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden text-[11px] font-medium text-slate-500 hover:text-slate-800 sm:inline-flex"
          >
            Log out
          </button>

          <button
            type="button"
            onClick={() => navigate('/assistant')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(245,158,11,0.55)] hover:bg-amber-400"
            aria-label="Open assistant"
          >
            R
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
