import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const baseItemClasses =
  'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer'

function SidebarSection({ title, children }) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function PrimaryNavItem({ to, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          baseItemClasses,
          'group',
          isActive
            ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        ].join(' ')
      }
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90" />
        <span className="truncate">{label}</span>
      </span>
      {badge ? (
        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function SavedQueryItem({ label }) {
  return (
    <button
      type="button"
      className={`${baseItemClasses} w-full text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900`}
    >
      <span className="truncate">{label}</span>
    </button>
  )
}

function SidebarNav() {
  const location = useLocation()
  const onAssistant = location.pathname.startsWith('/assistant')

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-3 pt-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 text-slate-400"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search calls, LPs…"
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        <SidebarSection title="All views">
          <PrimaryNavItem to="/deals" label="All Deals" badge="Pipeline" />
          <PrimaryNavItem to="/meetings" label="All Meetings" />
          <PrimaryNavItem
            to={onAssistant ? location.pathname : '/assistant'}
            label="Jarvis AI"
            badge="Assistant"
          />
        </SidebarSection>

        <SidebarSection title="Segments">
          <SavedQueryItem label="LP Pipeline Health" />
          <SavedQueryItem label="Sector breakdown" />
          <SavedQueryItem label="Pending follow-ups" />
        </SidebarSection>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
        <p className="truncate">142 calls indexed · 187h transcripts</p>
      </div>
    </aside>
  )
}

export default SidebarNav

