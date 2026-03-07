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

function clampScoreValue(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return null
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10))
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
        const score = data.score ?? null
        setForm({
          company: data.deal.company || '',
          date: formatDateForInput(data.deal.date || data.deal.meeting_date),
          poc: data.deal.poc || '',
          sector: data.deal.sector || '',
          status: data.deal.status || 'New',
          exciting_reason: data.deal.exciting_reason || '',
          risks: data.deal.risks || '',
          pass_reasons: data.deal.pass_reasons || '',
          watch_reasons: data.deal.watch_reasons || '',
          action_required: data.deal.action_required || '',
          resilience:
            score?.resilience != null ? String(Number(score.resilience)) : '',
          ambition:
            score?.ambition != null ? String(Number(score.ambition)) : '',
          self_awareness:
            score?.self_awareness != null
              ? String(Number(score.self_awareness))
              : '',
          domain_fit:
            score?.domain_fit != null ? String(Number(score.domain_fit)) : '',
          storytelling:
            score?.storytelling != null
              ? String(Number(score.storytelling))
              : '',
          weighted_score:
            score?.weighted_score != null
              ? String(Number(score.weighted_score))
              : '',
          archetype: score?.archetype ?? ''
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
        pass_reasons: form.pass_reasons || null,
        watch_reasons: form.watch_reasons || null,
        action_required: form.action_required || null
      }

      if (form.date) {
        patch.date = form.date
        patch.meeting_date = form.date
      }

      const hasScoreValues =
        scoreData?.score ||
        (form.resilience ?? '') !== '' ||
        (form.ambition ?? '') !== '' ||
        (form.self_awareness ?? '') !== '' ||
        (form.domain_fit ?? '') !== '' ||
        (form.storytelling ?? '') !== '' ||
        (form.weighted_score ?? '') !== '' ||
        (form.archetype ?? '').trim() !== ''
      if (hasScoreValues) {
        patch.resilience =
          form.resilience === '' ? null : clampScoreValue(form.resilience)
        patch.ambition =
          form.ambition === '' ? null : clampScoreValue(form.ambition)
        patch.self_awareness =
          form.self_awareness === ''
            ? null
            : clampScoreValue(form.self_awareness)
        patch.domain_fit =
          form.domain_fit === '' ? null : clampScoreValue(form.domain_fit)
        patch.storytelling =
          form.storytelling === ''
            ? null
            : clampScoreValue(form.storytelling)
        patch.weighted_score =
          form.weighted_score === ''
            ? null
            : clampScoreValue(form.weighted_score)
        patch.archetype =
          form.archetype?.trim() === '' ? null : form.archetype?.trim()
      }

      const updated = await updateDeal(deal.id, patch)
      setDeal(updated.deal)
      setScoreData({
        score: updated.score ?? null,
        signals: updated.signals ?? scoreData?.signals ?? null
      })
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
    scoreData?.score?.weighted_score != null
      ? Number(scoreData.score.weighted_score)
      : deal.founder_score != null
          ? Number(deal.founder_score)
          : null

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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Founder score breakdown
          </h2>
          <p className="text-[11px] text-neutral-500 -mt-2">
            Edits override AI-generated values. Scores 0–10.
          </p>
          {isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Resilience
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.resilience ?? ''}
                  onChange={handleChange('resilience')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Ambition
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.ambition ?? ''}
                  onChange={handleChange('ambition')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Self awareness
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.self_awareness ?? ''}
                  onChange={handleChange('self_awareness')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Domain fit
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.domain_fit ?? ''}
                  onChange={handleChange('domain_fit')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Storytelling
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.storytelling ?? ''}
                  onChange={handleChange('storytelling')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Weighted score (0–10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.weighted_score ?? ''}
                  onChange={handleChange('weighted_score')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Archetype
                </label>
                <input
                  type="text"
                  value={form.archetype ?? ''}
                  onChange={handleChange('archetype')}
                  placeholder="e.g. Builder, Visionary"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-4">
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-neutral-400">Resilience</span>
                  <span className="font-medium text-neutral-50">
                    {scoreData?.score?.resilience != null
                      ? Number(scoreData.score.resilience).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-neutral-400">Ambition</span>
                  <span className="font-medium text-neutral-50">
                    {scoreData?.score?.ambition != null
                      ? Number(scoreData.score.ambition).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-neutral-400">Self awareness</span>
                  <span className="font-medium text-neutral-50">
                    {scoreData?.score?.self_awareness != null
                      ? Number(scoreData.score.self_awareness).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-neutral-400">Domain fit</span>
                  <span className="font-medium text-neutral-50">
                    {scoreData?.score?.domain_fit != null
                      ? Number(scoreData.score.domain_fit).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-neutral-400">Storytelling</span>
                  <span className="font-medium text-neutral-50">
                    {scoreData?.score?.storytelling != null
                      ? Number(scoreData.score.storytelling).toFixed(1)
                      : '–'}
                  </span>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-2 mt-2">
                <span className="text-neutral-400">Archetype</span>
                <span className="ml-2 font-medium text-neutral-50">
                  {scoreData?.score?.archetype || 'Not set'}
                </span>
              </div>
            </div>
          )}
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
                        pass_reasons: deal.pass_reasons || '',
                        watch_reasons: deal.watch_reasons || '',
                        action_required: deal.action_required || '',
                        resilience:
                          scoreData?.score?.resilience != null
                            ? String(Number(scoreData.score.resilience))
                            : '',
                        ambition:
                          scoreData?.score?.ambition != null
                            ? String(Number(scoreData.score.ambition))
                            : '',
                        self_awareness:
                          scoreData?.score?.self_awareness != null
                            ? String(Number(scoreData.score.self_awareness))
                            : '',
                        domain_fit:
                          scoreData?.score?.domain_fit != null
                            ? String(Number(scoreData.score.domain_fit))
                            : '',
                        storytelling:
                          scoreData?.score?.storytelling != null
                            ? String(Number(scoreData.score.storytelling))
                            : '',
                        weighted_score:
                          scoreData?.score?.weighted_score != null
                            ? String(Number(scoreData.score.weighted_score))
                            : '',
                        archetype: scoreData?.score?.archetype ?? ''
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
                <DisplayField label="Founder score">
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

