import React from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/header'
import SessionsBar from '../components/SessionsBar'

function AppLayout({ children }) {
  const location = useLocation()
  const isAssistant = location.pathname.startsWith('/assistant')

  return (
    <div className="min-h-screen bg-[#171717] text-neutral-100 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        {isAssistant && <SessionsBar />}
        <main className="flex-1 px-6 pb-10 max-w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

export default AppLayout

