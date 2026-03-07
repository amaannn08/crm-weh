import React, { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

function Header() {
  const [showHeader, setShowHeader] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 0) {
        setShowHeader(false)
      } else {
        setShowHeader(true)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinkBase =
    'text-sm font-medium px-2 py-1 rounded-md transition-colors hover:text-white hover:bg-neutral-700'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b h-20 border-neutral-800 bg-[#171717] backdrop-blur transform transition-transform duration-300 ease-out ${
        showHeader ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="mx-auto flex w-full h-full items-center gap-6 px-6">
        <div className="flex items-center gap-2">
          <img src="/images/logo-white.svg" alt="WH Logo" className="w-24" />
        </div>
        <nav className="ml-auto flex items-center gap-2">
          <NavLink
            to="/assistant"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'text-xl text-white' : 'text-neutral-400'}`
            }
          >
            Assistant
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Header
