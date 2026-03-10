import React from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/header'
import SessionsBar from '../components/SessionsBar'

function AppLayout({ children }) {
  const location = useLocation()
  const isAssistant = location.pathname.startsWith('/assistant')

  return (
    <div className="h-screen bg-[#171717] text-neutral-100 flex flex-col">
  <Header />

  <div className="flex flex-1 overflow-hidden">
    
    {isAssistant && (
      <div className="w-72 border-r border-neutral-800 overflow-y-auto scrollbar-hide">
        <SessionsBar />
      </div>
    )}

    <main className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-10 max-w-full mx-auto">
      {children}
    </main>

  </div>
</div>
  )
}

export default AppLayout

