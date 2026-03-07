import React, { useEffect, useMemo, useState } from 'react'
import { fetchDeals, fetchDealScore } from '../api/deals'
import DealModal from '../components/DealModal'

const STAGE_FILTERS = ['All stages', 'New', 'Active', 'Evaluation', 'Pass', 'Watch', 'Portfolio']

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

function riskBadge(riskLevel) {
  if (!riskLevel) return 'bg-neutral-800 text-neutral-200'
  const level = riskLevel.toLowerCase()
  if (level.includes('low')) return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
  if (level.includes('high')) return 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
  return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/40'
}

function DealsTableRow({ deal, onView }) {
  const stage = deal.stage || deal.status || 'New'
  const lastMeeting = deal.meeting_date || deal.date || null
  const score = deal.conviction_score ?? deal.founder_score ?? null

  return (
    <tr className="border-b border-neutral-800/80 hover:bg-neutral-900/60 transition-colors">
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <div className="text-sm font-medium text-neutral-50">{deal.company}</div>
          <div className="text-xs text-neutral-400">
            {deal.sector || deal.business_model || '—'}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-neutral-200 ring-1 ring-neutral-700">
          {stage}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-sm text-neutral-200">
        {lastMeeting ? formatDate(lastMeeting) : '—'}
      </td>
      <td className="px-4 py-3 align-top text-sm font-medium text-neutral-50">
        {score != null ? Number(score).toFixed(1) : '—'}
      </td>
      <td className="px-4 py-3 align-top">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${riskBadge(deal.risk_level)}`}>
          {deal.risk_level ? deal.risk_level : '—'}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-800"
          >
            View
          </button>
          <button
            type="button"
            disabled
            className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-400 cursor-not-allowed"
          >
            Add meeting
          </button>
        </div>
      </td>
    </tr>
  )
}

function DealsPage() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All stages')
  const [minScore, setMinScore] = useState('0')
  const [industryFilter, setIndustryFilter] = useState('All industries')

  const [selectedDeal, setSelectedDeal] = useState(null)
  const [selectedScore, setSelectedScore] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadDeals() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDeals()
        if (!cancelled) {
          setDeals(data)
        }
      } catch (_err) {
        if (!cancelled) {
          setError('Failed to load deals')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    loadDeals()
    return () => {
      cancelled = true
    }
  }, [])

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

    return deals.filter((deal) => {
      const nameMatch =
        !query ||
        deal.company.toLowerCase().includes(query) ||
        (deal.sector || '').toLowerCase().includes(query) ||
        (deal.business_model || '').toLowerCase().includes(query)

      if (!nameMatch) return false

      const dealStage = (deal.stage || deal.status || 'New').toLowerCase()
      if (
        stageFilter !== 'All stages' &&
        dealStage !== stageFilter.toLowerCase()
      ) {
        return false
      }

      if (industryFilter !== 'All industries') {
        if ((deal.sector || '').trim() !== industryFilter) {
          return false
        }
      }

      const score = deal.conviction_score ?? deal.founder_score
      if (score != null && Number(score) < min) {
        return false
      }

      return true
    })
  }, [deals, industryFilter, minScore, search, stageFilter])

  const handleViewDeal = async (deal) => {
    setSelectedDeal(deal)
    setSelectedScore(null)
    setScoreLoading(true)
    try {
      const data = await fetchDealScore(deal.id)
      setSelectedScore(data)
    } catch (_err) {
      setSelectedScore(null)
    } finally {
      setScoreLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading deals…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <header className="space-y-2">
        <div>
          <h1 className="text-lg font-semibold text-neutral-50">Deals</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Clean, sortable view across all companies in your pipeline. Click a row to open the full deal evaluation.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, tagline, or industry"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          >
            {STAGE_FILTERS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-neutral-400">
              Min score
            </span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
          >
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="mt-2 flex-1 overflow-hidden rounded-2xl border border-neutral-900 bg-[#121212]">
        <div className="max-h-full overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 border-b border-neutral-800/80 bg-neutral-950/80 text-xs font-semibold uppercase tracking-wide text-neutral-500 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Name</th>
                <th className="px-4 py-2 text-left font-semibold">Stage</th>
                <th className="px-4 py-2 text-left font-semibold">
                  Last meeting
                </th>
                <th className="px-4 py-2 text-left font-semibold">Score</th>
                <th className="px-4 py-2 text-left font-semibold">Risk</th>
                <th className="px-4 py-2 text-right font-semibold">Action</th>
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
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          scoreData={scoreLoading ? null : selectedScore}
          onClose={() => {
            setSelectedDeal(null)
            setSelectedScore(null)
          }}
        />
      )}
    </div>
  )
}

export default DealsPage

