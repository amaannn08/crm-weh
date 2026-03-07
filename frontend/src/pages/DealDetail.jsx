import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchDeal, updateDeal } from '../api/deals'

function formatDateForInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function DisplayField({ label, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="text-sm text-neutral-100 whitespace-pre-wrap">
        {children || <span className="text-neutral-500">Not set</span>}
      </div>
    </div>
  )
}

function DealDetailPage() {
  const { dealId } = useParams()
  const navigate = useNavigate()

  const [deal, setDeal] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDeal(dealId)
        if (cancelled) return
        setDeal(data.deal)
        setScoreData({ score: data.score, signals: data.signals })
        setInsights(data.insights || null)
        setForm({
          company: data.deal.company || '',
          date: formatDateForInput(data.deal.date || data.deal.meeting_date),
          poc: data.deal.poc || '',
          sector: data.deal.sector || '',
          status: data.deal.status || 'New',
          exciting_reason: data.deal.exciting_reason || '',
          risks: data.deal.risks || '',
          conviction_score:
            data.deal.conviction_score != null
              ? String(Number(data.deal.conviction_score))
              : '',
          pass_reasons: data.deal.pass_reasons || '',
          watch_reasons: data.deal.watch_reasons || '',
          action_required: data.deal.action_required || ''
        })
      } catch (_err) {
        if (!cancelled) {
          setError('Failed to load deal')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [dealId])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!deal) return
    setSaving(true)
    setError(null)
    try {
      const patch = {
        company: form.company || deal.company,
        poc: form.poc || null,
        sector: form.sector || null,
        status: form.status || null,
        exciting_reason: form.exciting_reason || null,
        risks: form.risks || null,
        conviction_score:
          form.conviction_score === ''
            ? null
            : Number(form.conviction_score),
        pass_reasons: form.pass_reasons || null,
        watch_reasons: form.watch_reasons || null,
        action_required: form.action_required || null
      }

      if (form.date) {
        patch.date = form.date
        patch.meeting_date = form.date
      }

      const updated = await updateDeal(deal.id, patch)
      setDeal(updated)
      setIsEditing(false)
    } catch (_err) {
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading deal…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-red-400">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => navigate('/deals')}
          className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-800"
        >
          Back to deals
        </button>
      </div>
    )
  }

  if (!deal) {
    return null
  }

  const finalScore =
    deal.conviction_score != null
      ? Number(deal.conviction_score)
      : scoreData?.score?.weighted_score ?? null

  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => navigate('/deals')}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          ← Back to deals
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-neutral-50">
              {deal.company}
            </h1>
            <p className="text-xs text-neutral-400">
              {deal.sector || deal.business_model || 'No sector set yet.'}
            </p>
          </div>
          {finalScore != null && (
            <div className="rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-medium text-emerald-300 border border-emerald-500/30">
              Score {finalScore.toFixed(1)} / 10
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-900 bg-[#121212] p-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:max-w-xl">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Score summary
            </h2>
            <p className="text-sm text-neutral-100 whitespace-pre-wrap">
              {deal.exciting_reason ||
                'Why this feels interesting — rolled up across the five founder pillars.'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Final score
            </div>
            <div className="text-3xl font-semibold text-neutral-50">
              {finalScore != null ? finalScore.toFixed(1) : '--'}
            </div>
            {scoreData?.score && (
              <div className="text-[11px] text-neutral-500">
                Founder score {Number(scoreData.score.weighted_score).toFixed(1)} / 10
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-900 bg-[#121212] p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Deal details
            </h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setForm({
                        company: deal.company || '',
                        date: formatDateForInput(
                          deal.date || deal.meeting_date
                        ),
                        poc: deal.poc || '',
                        sector: deal.sector || '',
                        status: deal.status || 'New',
                        exciting_reason: deal.exciting_reason || '',
                        risks: deal.risks || '',
                        conviction_score:
                          deal.conviction_score != null
                            ? String(Number(deal.conviction_score))
                            : '',
                        pass_reasons: deal.pass_reasons || '',
                        watch_reasons: deal.watch_reasons || '',
                        action_required: deal.action_required || ''
                      })
                    }}
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-800"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {isEditing ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Company
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={handleChange('date')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    POC
                  </label>
                  <input
                    type="text"
                    value={form.poc}
                    onChange={handleChange('poc')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={form.sector}
                    onChange={handleChange('sector')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={handleChange('status')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Active">Active</option>
                    <option value="Evaluation">Evaluation</option>
                    <option value="Pass">Pass</option>
                    <option value="Watch">Watch</option>
                    <option value="Portfolio">Portfolio</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Conviction score (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.conviction_score}
                    onChange={handleChange('conviction_score')}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <DisplayField label="Company">{deal.company}</DisplayField>
                <DisplayField label="Date">
                  {deal.date || deal.meeting_date
                    ? new Date(deal.date || deal.meeting_date).toLocaleDateString()
                    : null}
                </DisplayField>
                <DisplayField label="POC">{deal.poc}</DisplayField>
                <DisplayField label="Sector">{deal.sector}</DisplayField>
                <DisplayField label="Status">{deal.status || 'New'}</DisplayField>
                <DisplayField label="Conviction score">
                  {finalScore != null ? finalScore.toFixed(1) : null}
                </DisplayField>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Why is this exciting?
              </label>
              {isEditing ? (
                <textarea
                  value={form.exciting_reason}
                  onChange={handleChange('exciting_reason')}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
                  {deal.exciting_reason || (
                    <span className="text-neutral-500">No notes yet.</span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Risks
              </label>
              {isEditing ? (
                <textarea
                  value={form.risks}
                  onChange={handleChange('risks')}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
                  {deal.risks || (
                    <span className="text-neutral-500">No risks captured yet.</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Reasons for pass
              </label>
              {isEditing ? (
                <textarea
                  value={form.pass_reasons}
                  onChange={handleChange('pass_reasons')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
                  {deal.pass_reasons || (
                    <span className="text-neutral-500">None yet.</span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Reasons to watch
              </label>
              {isEditing ? (
                <textarea
                  value={form.watch_reasons}
                  onChange={handleChange('watch_reasons')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
                  {deal.watch_reasons || (
                    <span className="text-neutral-500">None yet.</span>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Action required
              </label>
              {isEditing ? (
                <textarea
                  value={form.action_required}
                  onChange={handleChange('action_required')}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              ) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap">
                  {deal.action_required || (
                    <span className="text-neutral-500">No follow-ups captured yet.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealDetailPage

