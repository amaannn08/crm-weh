import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDeals } from '../api/deals'

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

function DealsTableRow({ deal, onView }) {
  const lastMeeting = deal.meeting_date || deal.date || null
  const score = deal.founder_final_score ?? null
  const description = (deal.business_model || deal.sector || '').trim()

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
      <td className="px-4 py-3 align-top text-sm text-neutral-200">
        {deal.poc || '—'}
      </td>
      <td className="px-4 py-3 align-top text-sm text-neutral-300 max-w-[24rem]">
        <div className="line-clamp-2">{description || '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-neutral-200">
        {lastMeeting ? formatDate(lastMeeting) : '—'}
      </td>
      <td className="px-4 py-3 align-top text-sm font-medium text-neutral-50">
        {score != null ? Number(score).toFixed(1) : '—'}
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
        </div>
      </td>
    </tr>
  )
}

function DealsPage() {
  const navigate = useNavigate()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('0')
  const [industryFilter, setIndustryFilter] = useState('All industries')

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
      } catch {
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

      if (industryFilter !== 'All industries') {
        if ((deal.sector || '').trim() !== industryFilter) {
          return false
        }
      }

      const score = deal.founder_final_score
      if (score != null && Number(score) < min) {
        return false
      }

      return true
    })
  }, [deals, industryFilter, minScore, search])

  const handleViewDeal = (deal) => {
    navigate(`/deals/${deal.id}`)
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
    <div className="flex h-full flex-col gap-4 pt-4">
      <header className="space-y-2">
        <div>
          <h1 className="text-lg font-semibold text-neutral-50">Deals</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Clean, sortable view across all companies in your pipeline. Click a row to open the full deal evaluation.
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, tagline, or industry"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
          </div>
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
                <th className="px-4 py-2 text-left font-semibold">POC</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
                <th className="px-4 py-2 text-left font-semibold">
                  Last meeting
                </th>
                <th className="px-4 py-2 text-left font-semibold">Score</th>
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
    </div>
  )
}

export default DealsPage

