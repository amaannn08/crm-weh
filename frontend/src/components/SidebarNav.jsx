import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const baseItemClasses =
  'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer'

function SidebarSection({ title, children }) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#C8C3BB] font-mono">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function FolderNavItem({ to, label, badge, emoji, active }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const isOn = active ?? isActive
        return [
          'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors',
          isOn ? 'bg-[#FFEFE2]' : 'hover:bg-[#F5F4F0]'
        ].join(' ')
      }}
    >
      {({ isActive }) => {
        const isOn = active ?? isActive
        return (
          <>
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={[
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[13px]',
                  isOn ? 'bg-[#FFD0AB] text-[#FF7102]' : 'bg-[#EEECE7] text-[#9A958E]'
                ].join(' ')}
                aria-hidden="true"
              >
                {emoji}
              </span>
              <span className="min-w-0 truncate text-[12px] font-semibold text-[#5A5650]">
                {label}
              </span>
            </span>
            {badge != null ? (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#9A958E] border border-[#E8E5DE] font-mono">
                {badge}
              </span>
            ) : null}
          </>
        )
      }}
    </NavLink>
  )
}

function RecentItem({ title, meta, dotColor, tag, tagTone = 'lp' }) {
  const tagStyles =
    tagTone === 'pitch'
      ? 'bg-[#FFEFE2] text-[#FF7102]'
      : tagTone === 'portfolio'
        ? 'bg-[#E8F5EE] text-[#3D7A58]'
        : tagTone === 'internal'
          ? 'bg-[#F0E8F5] text-[#7A4A8C]'
          : 'bg-[#E8EEF7] text-[#3A5F8C]'
  return (
    <button
      type="button"
      className="w-full rounded-lg px-2 py-2 text-left hover:bg-[#F5F4F0]"
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-[#1A1815]">
            {title}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-[3px] px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-[0.09em] font-mono ${tagStyles}`}>
              {tag}
            </span>
            {meta ? (
              <span className="text-[10px] text-[#C8C3BB] font-mono">
                {meta}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}

function SavedQueryItem({ label }) {
  return (
    <button
      type="button"
      className="w-full rounded-lg px-2 py-2 text-left hover:bg-[#F5F4F0]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[6px] bg-[#EEECE7] text-[11px] text-[#9A958E]">
          ⚡
        </span>
        <span className="truncate text-[12px] font-semibold text-[#5A5650]">
          {label}
        </span>
      </div>
    </button>
  )
}

function SidebarNav() {
  const location = useLocation()
  const pathname = location.pathname
  const onDeals = pathname.startsWith('/deals')
  const onMeetings = pathname.startsWith('/meetings')
  const onAssistant = pathname.startsWith('/assistant')

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#E8E5DE] bg-white">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#E8E5DE] bg-[#F5F4F0] px-3 py-2">
          <input
            type="text"
            placeholder="Search…"
            className="flex-1 bg-transparent text-[11px] text-[#5A5650] placeholder:text-[#C8C3BB] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-1 px-2 pb-4">
          <FolderNavItem to="/deals" label="Deals" badge="142" emoji="📊" active={onDeals} />
          <FolderNavItem to="/meetings" label="Meetings" badge="48" emoji="📅" active={onMeetings} />
          <FolderNavItem to="/assistant" label="Jarvis AI" badge={null} emoji="🤖" active={onAssistant} />
        </div>

        <div className="mx-2 h-px bg-[#E8E5DE]" />

        <SidebarSection title="Recent">
          <RecentItem title="Ananya Mehta - HNI Intro" meta="Mar 11 · 45 min" dotColor="#3A5F8C" tag="LP" tagTone="lp" />
          <RecentItem title="AgriStack - Seed Pitch" meta="Mar 6 · 35 min" dotColor="#FF7102" tag="Pitch" tagTone="pitch" />
          <RecentItem title="Jar - Q1 Update" meta="Mar 8 · 60 min" dotColor="#3D7A58" tag="Portfolio" tagTone="portfolio" />
          <RecentItem title="Fund III - IC Meeting" meta="Feb 27 · 90 min" dotColor="#7A4A8C" tag="Internal" tagTone="internal" />
        </SidebarSection>

        <div className="mx-2 h-px bg-[#E8E5DE]" />

        <SidebarSection title="Saved Queries">
          <SavedQueryItem label="LP Pipeline Health" />
          <SavedQueryItem label="Sector Breakdown" />
          <SavedQueryItem label="Pending Follow-ups" />
        </SidebarSection>
      </div>

      <div className="border-t border-[#E8E5DE] px-4 py-3 text-[10px] text-[#C8C3BB] font-mono">
        <p className="truncate">Pipeline synced · Jarvis AI</p>
      </div>
    </aside>
  )
}

export default SidebarNav

