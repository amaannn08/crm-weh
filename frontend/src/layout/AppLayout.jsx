import React from 'react'
import Header from '../components/header'
import SidebarNav from '../components/SidebarNav'

function AppLayout({ children }) {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-50 text-slate-900">
      <Header />

      <div className="flex min-h-0 flex-1 border-t border-slate-200">
        <SidebarNav />

        <main className="relative flex min-h-0 flex-1 justify-center overflow-hidden bg-slate-50">
          <div className="flex min-h-0 w-full max-w-6xl flex-col gap-4 px-6 pb-10 pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout

