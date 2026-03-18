import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDealData } from '../context/DealDataContext'

function Header() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { deals } = useDealData()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="z-20 border-b border-[#E8E5DE] bg-[#FAFAF8]/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-6">
        <button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/images/logo-black.svg" alt="WH Logo" className="w-20" />
          <span className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#FF7102] font-mono">
            Jarvis AI
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 md:flex font-mono">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#5A5650]">
              <span className="rounded-full bg-[#FFD0AB] px-1.5 py-[1px] text-[10px] font-medium text-[#1A1815]">
                {deals.length || '—'}
              </span>
              <span>Deals indexed</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden text-[11px] font-medium text-[#9A958E] hover:text-[#1A1815] sm:inline-flex"
          >
            Log out
          </button>

          <button
            type="button"
            onClick={() => navigate('/assistant')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7102] text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(255,113,2,0.35)] hover:bg-[#ff8a3a]"
            aria-label="Open Jarvis AI"
          >
            J
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
