import React from 'react'
import Header from '../components/header'

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#171717] text-neutral-100">
      <Header />
      <main className="pt-20 px-6 pb-10 max-w-full mx-auto">{children}</main>
    </div>
  )
}

export default AppLayout

