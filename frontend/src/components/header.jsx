import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Header() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navLinkBase =
    'text-sm font-medium px-2 py-1 rounded-md transition-colors hover:text-white hover:bg-neutral-700'

  return (
    <header className="border-b h-20 border-neutral-800 bg-[#171717] backdrop-blur z-10">
      <div className="mx-auto flex w-full h-full items-center gap-6 px-6">
        <div className="flex items-center gap-2">
          <img src="/images/logo-white.svg" alt="WH Logo" className="w-24" />
        </div>
        <nav className="ml-auto flex items-center gap-2">
          <NavLink
            to="/deals"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'text-xl text-white' : 'text-neutral-400'}`
            }
          >
            Deals
          </NavLink>
          <NavLink
            to="/arena"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'text-xl text-white' : 'text-neutral-400'}`
            }
          >
            Arena
          </NavLink>
          <NavLink
            to="/assistant"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'text-xl text-white' : 'text-neutral-400'}`
            }
          >
            Assistant
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className={`${navLinkBase} text-neutral-400`}
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header
