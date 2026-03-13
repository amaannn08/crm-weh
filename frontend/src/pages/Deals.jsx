import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDealData } from '../context/DealDataContext'
import PageShell from '../components/PageShell'

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function DealsTableRow({ deal, onView, onAddMeeting }) {
  const lastMeeting = deal.meeting_date || deal.date || null
  const score = deal.founder_final_score ?? null
  const description = (deal.business_model || deal.sector || '').trim()

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-900">{deal.company}</div>
          <div className="text-xs text-slate-500">
            {deal.sector || deal.business_model || '—'}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-slate-700">
        {deal.poc || '—'}
      </td>
      <td className="px-4 py-3 align-top text-sm text-slate-700 max-w-[24rem]">
        <div className="line-clamp-2">{description || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-slate-700">
        {lastMeeting ? formatDate(lastMeeting) : '—'}
      </td>
      <td className="px-4 py-3 align-top text-sm font-medium text-slate-900">
        {score != null ? Number(score).toFixed(1) : '—'}
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onAddMeeting}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Add meeting
          </button>
          <button
            type="button"
            onClick={onView}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  )
}

function DealsPage() {
  const navigate = useNavigate()
  const { deals, loadDeals, dealsLoading } = useDealData()
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('0')
  const [industryFilter, setIndustryFilter] = useState('All industries')
  const [timeRange, setTimeRange] = useState('3m')

  useEffect(() => {
    loadDeals().catch(() => {
      setError('Failed to load deals')
    })
  }, [loadDeals])

  const industries = useMemo(() => {
    const sectors = new Set(
      deals
        .map((d) => d.sector)
        .filter(Boolean)
        .map((s) => s.trim())
    )
    return ['All industries', ...Array.from(sectors)]
  }, [deals])

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase()
    const min = Number(minScore) || 0

    const now = new Date()
    const monthsBack =
      timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : null
    const cutoff =
      monthsBack != null
        ? new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate())
        : null

    return deals.filter((deal) => {
      const nameMatch =
        !query ||
        deal.company.toLowerCase().includes(query) ||
        (deal.sector || '').toLowerCase().includes(query) ||
        (deal.business_model || '').toLowerCase().includes(query)

      if (!nameMatch) return false

      if (industryFilter !== 'All industries') {
        if ((deal.sector || '').trim() !== industryFilter) {
          return false
        }
      }

      const score = deal.founder_final_score
      if (score != null && Number(score) < min) {
        return false
      }

      if (cutoff) {
        const dateValue = deal.meeting_date || deal.date || null
        if (dateValue) {
          const d = new Date(dateValue)
          if (!Number.isNaN(d.getTime()) && d < cutoff) {
            return false
          }
        }
      }

      return true
    })
  }, [deals, industryFilter, minScore, search, timeRange])

  const summaryCards = useMemo(() => {
    const total = filteredDeals.length
    const portfolio = filteredDeals.filter(
      (d) => (d.status || '').toLowerCase() === 'portfolio'
    ).length
    const active = filteredDeals.filter(
      (d) => (d.status || '').toLowerCase() === 'active'
    ).length

    const scored = filteredDeals.filter(
      (d) => d.founder_final_score != null && d.founder_final_score !== ''
    )
    const avgScore =
      scored.length === 0
        ? '—'
        : (scored.reduce((acc, d) => acc + Number(d.founder_final_score || 0), 0) /
            scored.length
          ).toFixed(1)

    return [
      {
        label: 'Total deals',
        value: total || '0',
        helper: 'Across all stages',
        tone: 'neutral'
      },
      {
        label: 'Active',
        value: active || '0',
        helper: 'In current pipeline',
        tone: 'positive'
      },
      {
        label: 'Portfolio',
        value: portfolio || '0',
        helper: 'Closed and invested',
        tone: 'subtle'
      },
      {
        label: 'Avg founder score',
        value: avgScore,
        helper: scored.length ? `${scored.length} scored` : 'No scores yet',
        tone: 'warm'
      }
    ]
  }, [filteredDeals])

  const handleViewDeal = (deal) => {
    navigate(`/deals/${deal.id}`)
  }

  const handleAddMeeting = (deal) => {
    navigate(`/meetings?dealId=${encodeURIComponent(deal.id)}`)
  }
  if (dealsLoading && !deals.length) {
    return (
      <PageShell
        title="All deals"
        subtitle="Clean, sortable view across all companies in your pipeline. Click a row to open the full evaluation."
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        summaryCards={summaryCards}
      >
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          Loading deals…
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell
        title="All deals"
        subtitle="Clean, sortable view across all companies in your pipeline."
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        summaryCards={summaryCards}
      >
        <div className="flex h-full items-center justify-center text-sm text-red-400">
          {error}
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="All deals"
      subtitle="Over the selected period, track every company in your funnel across intros, follow-ups, and diligence conversations."
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      summaryCards={summaryCards}
      rightHeaderSlot={
        <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Pipeline up to date</span>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-4 pb-3 pt-3 bg-slate-50">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1.1fr))]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, tagline, or industry"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs text-slate-500">
                Min score
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
            >
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">POC</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Last meeting
                </th>
                <th className="px-4 py-3 text-left font-semibold">Score</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-neutral-500"
                  >
                    No deals match your filters yet.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => (
                  <DealsTableRow
                    key={deal.id}
                    deal={deal}
                    onView={() => handleViewDeal(deal)}
                    onAddMeeting={() => handleAddMeeting(deal)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}

export default DealsPage

