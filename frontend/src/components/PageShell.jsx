import React, { useMemo } from 'react'

// Compact stat chips replacing the old large summary cards
export function StatChip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DE] bg-white px-3 py-1.5 text-[11px] font-medium text-[#5A5650] shadow-sm">
      <span className="font-semibold text-[#1A1815]">{value}</span>
      <span>{label}</span>
    </span>
  )
}

// Keep SummaryCard exported for any page still using it
export function SummaryCard({ label, value, tone = 'neutral', helper }) {
  const toneClasses = {
    neutral: 'bg-white border-slate-200',
    positive: 'bg-emerald-50 border-emerald-200',
    warm: 'bg-amber-50 border-amber-200',
    subtle: 'bg-slate-50 border-slate-200'
  }[tone]

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border px-4 py-3 text-left shadow-sm ${toneClasses}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-slate-900">{value}</span>
        {helper && (
          <span className="text-[11px] font-medium text-slate-500 truncate">
            {helper}
          </span>
        )}
      </div>
    </div>
  )
}

function defaultTimeRanges() {
  return [
    { id: '3m', label: 'Last 3 months' },
    { id: '6m', label: 'Last 6 months' },
    { id: '12m', label: 'Last 12 months' },
    { id: 'all', label: 'All time' }
  ]
}

function PageShell({
  title,
  subtitle,
  timeRange,
  onTimeRangeChange,
  timeRanges,
  summaryCards,
  children,
  rightHeaderSlot
}) {
  const ranges = timeRanges || defaultTimeRanges()

  const activeRange = useMemo(
    () => ranges.find((r) => r.id === timeRange) || ranges[0],
    [ranges, timeRange]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 max-w-xl">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {rightHeaderSlot}
          {timeRange != null && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="whitespace-nowrap text-slate-700">
                {activeRange.label}
              </span>
              {onTimeRangeChange && (
                <select
                  value={activeRange.id}
                  onChange={(e) => onTimeRangeChange(e.target.value)}
                  className="ml-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 focus:border-amber-400 focus:outline-none"
                >
                  {ranges.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </header>

      {/* compact stat chips — only total deals and avg score */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {summaryCards
            .filter((c) => c.label === 'Total deals' || c.label === 'Avg founder score')
            .map((card) => (
              <StatChip key={card.label} label={card.label} value={card.value} />
            ))}
        </div>
      )}

      <section className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-2xl border border-[#E8E5DE] bg-white">
        {children}
      </section>
    </div>
  )
}

export default PageShell

