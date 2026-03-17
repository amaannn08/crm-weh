import React, { useMemo, useState } from 'react'
import PageShell from '../components/PageShell'

function PortfolioNewsPage() {
  const [timeRange, setTimeRange] = useState('3m')

  const summaryCards = useMemo(
    () => [
      { label: 'Updates tracked', value: '—', helper: 'Connect sources to enable', tone: 'neutral' },
      { label: 'Portfolio companies', value: '—', helper: 'From deals + meetings', tone: 'subtle' },
      { label: 'Mentions this week', value: '—', helper: 'Auto-detected signals', tone: 'positive' },
      { label: 'Follow-ups needed', value: '—', helper: 'Watchlist items', tone: 'warm' }
    ],
    []
  )

  return (
    <PageShell
      title="Portfolio News"
      subtitle="Track news, announcements, and key signals across your portfolio. (Placeholder page — hook up data sources next.)"
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      summaryCards={summaryCards}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-[#E8E5DE] bg-[#FAFAF8] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#9A958E]">
              Signals
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-[11px] text-[#5A5650]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7102]" />
              <span>Coming soon</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="max-w-lg text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFEFE2] text-[#FF7102]">
              📰
            </div>
            <h2 className="mt-4 text-base font-semibold text-[#1A1815]">
              Portfolio News is ready
            </h2>
            <p className="mt-1 text-sm text-[#5A5650]">
              Next step is to connect a backend feed (RSS, Google Alerts, or internal notes)
              and map updates to your portfolio companies.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export default PortfolioNewsPage

