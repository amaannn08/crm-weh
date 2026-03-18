import React from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/header'
import SidebarNav from '../components/SidebarNav'

function AppLayout({ children }) {
  const location = useLocation()
  const isCallsRoute =
    location.pathname === '/calls' ||
    location.pathname === '/assistant' ||
    location.pathname.startsWith('/assistant/')

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[#FAFAF8] text-[#1A1815]">
      <Header />

      <div className="flex min-h-0 flex-1 border-t border-[#E8E5DE]">
        <SidebarNav />

        <main className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-[#FAFAF8]">
          <div
            className={`flex min-h-0 w-full flex-col gap-4 pb-2 ${isCallsRoute ? 'pt-0 px-0' : 'pt-4 px-6'
              }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout

