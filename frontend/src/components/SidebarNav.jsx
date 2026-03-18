import React, { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDealData } from '../context/DealDataContext'


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

function RecentDealItem({ id, company, sector, status, score }) {
  const navigate = useNavigate()
  // Pick a dot color based on status
  const dotColor =
    status === 'Pass' ? '#B42318'
      : status === 'Portfolio' ? '#3D7A58'
        : status === 'Active Diligence' ? '#FF7102'
          : '#3A5F8C'

  const tagToneClass =
    status === 'Pass' ? 'bg-[#FEF3F2] text-[#B42318]'
      : status === 'Portfolio' ? 'bg-[#E8F5EE] text-[#3D7A58]'
        : status === 'Active Diligence' ? 'bg-[#FFEFE2] text-[#FF7102]'
          : 'bg-[#E8EEF7] text-[#3A5F8C]'

  return (
    <button
      type="button"
      onClick={() => navigate(`/deals/${id}`)}
      className="w-full rounded-lg px-2 py-2 text-left hover:bg-[#F5F4F0]"
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-[#1A1815]">
            {company}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-[3px] px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-[0.09em] font-mono ${tagToneClass}`}>
              {status || 'New'}
            </span>
            {sector && (
              <span className="text-[10px] text-[#C8C3BB] font-mono truncate">
                {sector}
              </span>
            )}
          </div>
        </div>
        {score != null && (
          <span className="shrink-0 text-[10px] font-mono font-medium text-[#9A958E]">
            {Number(score).toFixed(1)}
          </span>
        )}
      </div>
    </button>
  )
}

function SidebarNav() {
  const location = useLocation()
  const pathname = location.pathname
  const onDeals = pathname.startsWith('/deals')
  const onMeetings = pathname.startsWith('/meetings')
  const onPortfolioNews = pathname.startsWith('/portfolio-news')
  const onAssistant = pathname.startsWith('/assistant')

  const { deals, loadDeals, meetings } = useDealData()

  // Ensure deals are loaded regardless of which page the user lands on
  useEffect(() => { loadDeals() }, [loadDeals])

  // Recent deals: up to 4
  const recentDeals = deals.slice(0, 4)

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[#E8E5DE] bg-white">
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
          <FolderNavItem to="/dashboard" label="Dashboard" badge={null} emoji="🏠" active={pathname === '/dashboard'} />
          <FolderNavItem to="/assistant" label="Jarvis AI" badge={null} emoji="🤖" active={onAssistant} />
          <FolderNavItem to="/deals" label="Deals" badge={deals.length || null} emoji="📊" active={onDeals} />
          <FolderNavItem to="/meetings" label="Meetings" badge={meetings.length || null} emoji="📅" active={onMeetings} />
          <FolderNavItem to="/portfolio-news" label="Portfolio News" badge={null} emoji="📰" active={onPortfolioNews} />
        </div>

        <div className="mx-2 h-px bg-[#E8E5DE]" />

        {recentDeals.length > 0 && (
          <SidebarSection title="Recent deals">
            {recentDeals.map(deal => (
              <RecentDealItem
                key={deal.id}
                id={deal.id}
                company={deal.company}
                sector={deal.sector}
                status={deal.status}
                score={deal.founder_final_score}
              />
            ))}
          </SidebarSection>
        )}
      </div>

      <div className="border-t border-[#E8E5DE] px-4 py-3 text-[10px] text-[#C8C3BB] font-mono">
        <p className="truncate">Pipeline synced · Jarvis AI</p>
      </div>
    </aside>
  )
}

export default SidebarNav
