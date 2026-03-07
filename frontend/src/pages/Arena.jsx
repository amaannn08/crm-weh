import React, { useEffect, useState } from 'react'
import { fetchDeals, fetchDealScore } from '../api/deals'
import DealModal from '../components/DealModal'

const STAGES = ['New', 'Active', 'Evaluation', 'Pass', 'Watch', 'Portfolio']

function DealCard({ deal, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-left shadow-sm transition hover:border-neutral-500 hover:bg-neutral-900"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-neutral-50">
          {deal.company}
        </h3>
        {deal.founder_score != null && (
          <span className="text-xs font-medium text-emerald-400">
            {Number(deal.founder_score).toFixed(1)}
          </span>
        )}
      </div>
      {deal.sector && (
        <p className="mt-1 text-xs text-neutral-400">{deal.sector}</p>
      )}
      {deal.exciting_reason && (
        <p className="mt-2 line-clamp-2 text-xs text-neutral-300">
          {deal.exciting_reason}
        </p>
      )}
    </button>
  )
}

function Column({ title, deals, onSelectDeal }) {
  return (
    <div className="flex min-w-[220px] flex-1 flex-col gap-3 rounded-2xl border border-neutral-900 bg-[#121212] p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {title}
        </h2>
        <span className="text-xs text-neutral-500">{deals.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {deals.length === 0 ? (
          <p className="text-xs text-neutral-500">No deals in this stage.</p>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onSelectDeal(deal)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ArenaPage() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
      } catch (err) {
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

  const handleSelectDeal = async (deal) => {
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

  const grouped = STAGES.reduce(
    (acc, stage) => ({
      ...acc,
      [stage]: deals.filter(
        (deal) => (deal.status || 'New').toLowerCase() === stage.toLowerCase()
      )
    }),
    {}
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading arena…
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
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-semibold text-neutral-50">
            Arena board
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            Pipeline view of deals across stages. Click a card to see full
            notes and founder score.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <Column
            key={stage}
            title={stage}
            deals={grouped[stage] ?? []}
            onSelectDeal={handleSelectDeal}
          />
        ))}
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

export default ArenaPage

