import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { updateDeal, uploadDealFiles, deleteDealFile, dealFileUrl } from '../api/deals'
import { useDealData } from '../context/DealDataContext'

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
      <div className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
        {label}
      </div>
      <div className="text-sm text-[#1A1815] whitespace-pre-wrap">
        {children || <span className="text-[#9A958E]">Not set</span>}
      </div>
    </div>
  )
}

function DealDetailPage() {
  const { dealId } = useParams()
  const navigate = useNavigate()
  const { dealById, loadDealBundle, updateDealBundleInCache, setDealBundleFiles } = useDealData()

  const [deal, setDeal] = useState(null)
  const [scoreData, setScoreData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const cached = dealById[dealId]
        const data = cached || (await loadDealBundle(dealId))
        if (cancelled) return
        setDeal(data.deal)
        setScoreData({
          softScore: data.softScore,
          hardScore: data.hardScore,
          finalScore: data.finalScore
        })
        setFiles(data.files || [])
        const softScore = data.softScore ?? null
        const hardScore = data.hardScore ?? null
        setForm({
          company: data.deal.company || '',
          date: formatDateForInput(data.deal.date || data.deal.meeting_date),
          poc: data.deal.poc || '',
          sector: data.deal.sector || '',
          status: data.deal.status || 'New',
          resilience:
            softScore?.resilience != null
              ? String(Number(softScore.resilience))
              : '',
          ambition:
            softScore?.ambition != null ? String(Number(softScore.ambition)) : '',
          self_awareness:
            softScore?.self_awareness != null
              ? String(Number(softScore.self_awareness))
              : '',
          domain_fit:
            softScore?.domain_fit != null
              ? String(Number(softScore.domain_fit))
              : '',
          storytelling:
            softScore?.storytelling != null
              ? String(Number(softScore.storytelling))
              : '',
          education_tier:
            hardScore?.education_tier != null
              ? String(Number(hardScore.education_tier))
              : '',
          domain_work_experience:
            hardScore?.domain_work_experience != null
              ? String(Number(hardScore.domain_work_experience))
              : '',
          seniority_of_roles:
            hardScore?.seniority_of_roles != null
              ? String(Number(hardScore.seniority_of_roles))
              : '',
          previous_startup_experience:
            hardScore?.previous_startup_experience != null
              ? String(Number(hardScore.previous_startup_experience))
              : '',
          archetype: softScore?.archetype ?? ''
        })
      } catch {
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
  }, [dealById, dealId, loadDealBundle])

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
        status: form.status || null
      }

      if (form.date) {
        patch.date = form.date
        patch.meeting_date = form.date
      }

      const hasScoreValues =
        scoreData?.softScore ||
        scoreData?.hardScore ||
        (form.resilience ?? '') !== '' ||
        (form.ambition ?? '') !== '' ||
        (form.self_awareness ?? '') !== '' ||
        (form.domain_fit ?? '') !== '' ||
        (form.storytelling ?? '') !== '' ||
        (form.education_tier ?? '') !== '' ||
        (form.domain_work_experience ?? '') !== '' ||
        (form.seniority_of_roles ?? '') !== '' ||
        (form.previous_startup_experience ?? '') !== '' ||
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
        patch.education_tier =
          form.education_tier === ''
            ? null
            : clampScoreValue(form.education_tier)
        patch.domain_work_experience =
          form.domain_work_experience === ''
            ? null
            : clampScoreValue(form.domain_work_experience)
        patch.seniority_of_roles =
          form.seniority_of_roles === ''
            ? null
            : clampScoreValue(form.seniority_of_roles)
        patch.previous_startup_experience =
          form.previous_startup_experience === ''
            ? null
            : clampScoreValue(form.previous_startup_experience)
        patch.archetype =
          form.archetype?.trim() === '' ? null : form.archetype?.trim()
      }

      const updated = await updateDeal(deal.id, patch)
      setDeal(updated.deal)
      setScoreData({
        softScore: updated.softScore ?? null,
        hardScore: updated.hardScore ?? null,
        finalScore: updated.finalScore ?? null
      })
      updateDealBundleInCache(deal.id, {
        deal: updated.deal,
        softScore: updated.softScore ?? null,
        hardScore: updated.hardScore ?? null,
        finalScore: updated.finalScore ?? null
      })
      setIsEditing(false)
    } catch {
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#5A5650]">
        Loading deal…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-red-600">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => navigate('/deals')}
          className="rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-xs font-medium text-[#5A5650] hover:bg-[#F5F4F0]"
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
    scoreData?.finalScore?.final_score != null
      ? Number(scoreData.finalScore.final_score)
      : deal.founder_final_score != null
          ? Number(deal.founder_final_score)
          : null
  const softWeightedScore =
    scoreData?.softScore?.soft_weighted_score != null
      ? Number(scoreData.softScore.soft_weighted_score)
      : deal.founder_soft_score != null
          ? Number(deal.founder_soft_score)
          : null
  const hardWeightedScore =
    scoreData?.hardScore?.hard_weighted_score != null
      ? Number(scoreData.hardScore.hard_weighted_score)
      : deal.founder_hard_score != null
          ? Number(deal.founder_hard_score)
          : null
  const ddRecommendation =
    scoreData?.finalScore?.dd_recommendation ?? deal.dd_recommendation ?? null
  const resetFormFromCurrent = () => {
    setForm({
      company: deal.company || '',
      date: formatDateForInput(deal.date || deal.meeting_date),
      poc: deal.poc || '',
      sector: deal.sector || '',
      status: deal.status || 'New',
      resilience:
        scoreData?.softScore?.resilience != null
          ? String(Number(scoreData.softScore.resilience))
          : '',
      ambition:
        scoreData?.softScore?.ambition != null
          ? String(Number(scoreData.softScore.ambition))
          : '',
      self_awareness:
        scoreData?.softScore?.self_awareness != null
          ? String(Number(scoreData.softScore.self_awareness))
          : '',
      domain_fit:
        scoreData?.softScore?.domain_fit != null
          ? String(Number(scoreData.softScore.domain_fit))
          : '',
      storytelling:
        scoreData?.softScore?.storytelling != null
          ? String(Number(scoreData.softScore.storytelling))
          : '',
      education_tier:
        scoreData?.hardScore?.education_tier != null
          ? String(Number(scoreData.hardScore.education_tier))
          : '',
      domain_work_experience:
        scoreData?.hardScore?.domain_work_experience != null
          ? String(Number(scoreData.hardScore.domain_work_experience))
          : '',
      seniority_of_roles:
        scoreData?.hardScore?.seniority_of_roles != null
          ? String(Number(scoreData.hardScore.seniority_of_roles))
          : '',
      previous_startup_experience:
        scoreData?.hardScore?.previous_startup_experience != null
          ? String(Number(scoreData.hardScore.previous_startup_experience))
          : '',
      archetype: scoreData?.softScore?.archetype ?? ''
    })
  }

  const handleUploadFiles = async () => {
    if (!deal || !fileInputRef.current || !fileInputRef.current.files.length) return
    setUploading(true)
    setUploadError('')
    try {
      const res = await uploadDealFiles(deal.id, fileInputRef.current.files)
      if (res?.files) {
        setFiles((prev) => [...res.files, ...prev])
        setDealBundleFiles(deal.id, [...res.files, ...files])
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (e) {
      setUploadError(e.message || 'Failed to upload files')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!deal) return
    const confirmed = window.confirm('Delete this file?')
    if (!confirmed) return
    setDeletingId(fileId)
    setDeleteError('')
    try {
      await deleteDealFile(deal.id, fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setDealBundleFiles(
        deal.id,
        files.filter((f) => f.id !== fileId)
      )
    } catch (e) {
      setDeleteError(e.message || 'Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 bg-[#FAFAF8] py-4 px-4 overflow-y-auto">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => navigate('/deals')}
          className="text-xs text-[#5A5650] hover:text-[#1A1815]"
        >
          ← Back to deals
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[#1A1815]">
              {deal.company}
            </h1>
            <p className="text-xs text-[#9A958E]">
              {deal.sector || deal.business_model || 'No sector set yet.'}
            </p>
          </div>
          {finalScore != null && (
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
              Score {finalScore.toFixed(1)} / 10
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#E8E5DE] bg-white p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)] md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:max-w-xl">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
              Score summary
            </h2>
            <p className="text-sm text-[#5A5650] whitespace-pre-wrap">
              Founder quality and recommendation summary.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
              Final score
            </div>
            <div className="text-3xl font-semibold text-[#1A1815]">
              {finalScore != null ? finalScore.toFixed(1) : '--'}
            </div>
            {scoreData?.finalScore && (
              <div className="text-[11px] text-[#9A958E]">
                DD recommendation: {ddRecommendation || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E5DE] bg-white p-4 space-y-4 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
              Founder score breakdown
            </h2>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-[#1A1815] px-3 py-1 text-xs font-medium text-white hover:bg-[#2d2a26] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      resetFormFromCurrent()
                    }}
                    className="rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-xs font-medium text-[#5A5650] hover:bg-[#F5F4F0]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-xs font-medium text-[#5A5650] hover:bg-[#F5F4F0]"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#9A958E] -mt-2">
            Edits override AI-generated values. Scores 0–10.
          </p>
          {isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Resilience
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.resilience ?? ''}
                  onChange={handleChange('resilience')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Ambition
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.ambition ?? ''}
                  onChange={handleChange('ambition')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Self awareness
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.self_awareness ?? ''}
                  onChange={handleChange('self_awareness')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Domain fit
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.domain_fit ?? ''}
                  onChange={handleChange('domain_fit')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Storytelling
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.storytelling ?? ''}
                  onChange={handleChange('storytelling')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Education tier
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.education_tier ?? ''}
                  onChange={handleChange('education_tier')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Domain work experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.domain_work_experience ?? ''}
                  onChange={handleChange('domain_work_experience')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Seniority of roles
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.seniority_of_roles ?? ''}
                  onChange={handleChange('seniority_of_roles')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Previous startup experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={form.previous_startup_experience ?? ''}
                  onChange={handleChange('previous_startup_experience')}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Archetype
                </label>
                <input
                  type="text"
                  value={form.archetype ?? ''}
                  onChange={handleChange('archetype')}
                  placeholder="e.g. Builder, Visionary"
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] placeholder:text-[#C8C3BB] focus:border-[#FF7102] focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-[#E8E5DE] bg-[#FAFAF8] px-3 py-2 text-sm">
              {softWeightedScore != null && (
                <div className="text-[13px]">
                  <span className="text-[#9A958E]">Soft score</span>
                  <span className="ml-2 font-medium text-[#1A1815]">
                    {softWeightedScore.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-4">
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-[#9A958E]">Resilience</span>
                  <span className="font-medium text-[#1A1815]">
                    {scoreData?.softScore?.resilience != null
                      ? Number(scoreData.softScore.resilience).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-[#9A958E]">Ambition</span>
                  <span className="font-medium text-[#1A1815]">
                    {scoreData?.softScore?.ambition != null
                      ? Number(scoreData.softScore.ambition).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-[#9A958E]">Self awareness</span>
                  <span className="font-medium text-[#1A1815]">
                    {scoreData?.softScore?.self_awareness != null
                      ? Number(scoreData.softScore.self_awareness).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-[#9A958E]">Domain fit</span>
                  <span className="font-medium text-[#1A1815]">
                    {scoreData?.softScore?.domain_fit != null
                      ? Number(scoreData.softScore.domain_fit).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 sm:gap-4">
                  <span className="text-[#9A958E]">Storytelling</span>
                  <span className="font-medium text-[#1A1815]">
                    {scoreData?.softScore?.storytelling != null
                      ? Number(scoreData.softScore.storytelling).toFixed(1)
                      : '–'}
                  </span>
                </div>
              </div>
              <div className="border-t border-[#E8E5DE] pt-2 mt-2 space-y-1">
                <div className="text-[13px]">
                  <span className="text-[#9A958E]">Hard score</span>
                  <span className="ml-2 font-medium text-[#1A1815]">
                    {hardWeightedScore != null ? hardWeightedScore.toFixed(1) : 'Not set'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <div className="flex gap-1">
                    <span className="text-[#9A958E]">Education tier</span>
                    <span className="font-medium text-[#1A1815]">
                      {scoreData?.hardScore?.education_tier != null
                        ? Number(scoreData.hardScore.education_tier).toFixed(1)
                        : '–'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[#9A958E]">Domain work exp.</span>
                    <span className="font-medium text-[#1A1815]">
                      {scoreData?.hardScore?.domain_work_experience != null
                        ? Number(scoreData.hardScore.domain_work_experience).toFixed(1)
                        : '–'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[#9A958E]">Seniority of roles</span>
                    <span className="font-medium text-[#1A1815]">
                      {scoreData?.hardScore?.seniority_of_roles != null
                        ? Number(scoreData.hardScore.seniority_of_roles).toFixed(1)
                        : '–'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-[#9A958E]">Prev. startup exp.</span>
                    <span className="font-medium text-[#1A1815]">
                      {scoreData?.hardScore?.previous_startup_experience != null
                        ? Number(scoreData.hardScore.previous_startup_experience).toFixed(1)
                        : '–'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#E8E5DE] pt-2 mt-2">
                <span className="text-[#9A958E]">Archetype</span>
                <span className="ml-2 font-medium text-[#1A1815]">
                  {scoreData?.softScore?.archetype || 'Not set'}
                </span>
              </div>
              <div className="border-t border-[#E8E5DE] pt-2 mt-2">
                <span className="text-[#9A958E]">DD recommendation</span>
                <span className="ml-2 font-medium text-[#1A1815]">
                  {ddRecommendation || 'Not set'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E8E5DE] bg-white p-4 space-y-4 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
              Deal details
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {isEditing ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Company
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={handleChange('company')}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={handleChange('date')}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    POC
                  </label>
                  <input
                    type="text"
                    value={form.poc}
                    onChange={handleChange('poc')}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={form.sector}
                    onChange={handleChange('sector')}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={handleChange('status')}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
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
                <DisplayField label="Date">
                  {deal.date || deal.meeting_date
                    ? new Date(deal.date || deal.meeting_date).toLocaleDateString()
                    : null}
                </DisplayField>
                <DisplayField label="POC">{deal.poc}</DisplayField>
                <DisplayField label="Sector">{deal.sector}</DisplayField>
              </>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E8E5DE] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
              Meeting files
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-[#9A958E]">
              Upload relevant transcripts, decks, or notes for this deal.
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="text-[11px] text-[#5A5650] file:mr-2 file:rounded-md file:border file:border-[#E8E5DE] file:bg-white file:px-3 file:py-1.5 file:text-xs file:text-[#1A1815] hover:file:bg-[#F5F4F0]"
              />
              <button
                type="button"
                onClick={handleUploadFiles}
                disabled={uploading}
                className="rounded-full border border-[#E8E5DE] bg-white px-3 py-1 text-xs font-medium text-[#5A5650] hover:bg-[#F5F4F0] disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
          {uploadError && (
            <div className="text-[11px] text-red-600">
              {uploadError}
            </div>
          )}
          {deleteError && (
            <div className="text-[11px] text-red-600">
              {deleteError}
            </div>
          )}
          <div className="border-t border-[#E8E5DE] pt-2 mt-1">
            {files.length === 0 ? (
              <p className="text-[12px] text-[#9A958E]">No files uploaded yet.</p>
            ) : (
              <ul className="space-y-1 text-[13px] text-[#1A1815]">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <a
                        href={dealFileUrl(f)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[#1A1815] hover:text-[#FF7102] underline-offset-2 hover:underline"
                      >
                        {f.file_name}
                      </a>
                      {f.uploaded_at && (
                        <span className="text-[11px] text-[#9A958E] shrink-0">
                          {new Date(f.uploaded_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.id)}
                      disabled={deletingId === f.id}
                      className="rounded-full border border-[#E8E5DE] bg-white px-2 py-0.5 text-[11px] font-medium text-[#5A5650] hover:bg-[#F5F4F0] disabled:opacity-60"
                    >
                      {deletingId === f.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealDetailPage

