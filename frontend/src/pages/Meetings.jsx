import React, { useEffect, useMemo, useState } from 'react'
import { updateDeal, fetchDealFiles, deleteDealFile, dealFileUrl } from '../api/deals'
import { useDealData } from '../context/DealDataContext'

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

function MeetingsPage() {
  const { deals, loadDeals, updateDealInCache } = useDealData()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({
    exciting_reason: '',
    risks: '',
    pass_reasons: '',
    watch_reasons: '',
    action_required: ''
  })
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileDeletingId, setFileDeletingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadDeals()
      .catch(() => {
        setError('Failed to load meetings')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [loadDeals])

  const filteredDeals = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return deals
    return deals.filter((deal) => {
      return (
        deal.company.toLowerCase().includes(query) ||
        (deal.sector || '').toLowerCase().includes(query) ||
        (deal.exciting_reason || '').toLowerCase().includes(query)
      )
    })
  }, [deals, search])

  const selectedDeal = useMemo(() => {
    return deals.find((deal) => deal.id === selectedId) ?? null
  }, [deals, selectedId])

  useEffect(() => {
    if (!selectedDeal) return
    setForm({
      exciting_reason: selectedDeal.exciting_reason || '',
      risks: selectedDeal.risks || '',
      pass_reasons: selectedDeal.pass_reasons || '',
      watch_reasons: selectedDeal.watch_reasons || '',
      action_required: selectedDeal.action_required || ''
    })
  }, [selectedDeal])

  useEffect(() => {
    if (!selectedDeal) {
      setFiles([])
      return
    }
    let cancelled = false
    async function loadFiles() {
      setFilesLoading(true)
      try {
        const res = await fetchDealFiles(selectedDeal.id)
        if (!cancelled) {
          setFiles(res.files || [])
        }
      } catch {
        if (!cancelled) {
          setFiles([])
        }
      } finally {
        if (!cancelled) {
          setFilesLoading(false)
        }
      }
    }
    loadFiles()
    return () => {
      cancelled = true
    }
  }, [selectedDeal])

  const handleSelectDeal = (dealId) => {
    setSelectedId(dealId)
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!selectedDeal) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateDeal(selectedDeal.id, {
        exciting_reason: form.exciting_reason || null,
        risks: form.risks || null,
        pass_reasons: form.pass_reasons || null,
        watch_reasons: form.watch_reasons || null,
        action_required: form.action_required || null
      })
      updateDealInCache(updated.deal)
    } catch {
      setError('Failed to save meeting notes')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!selectedDeal) return
    const confirmed = window.confirm('Delete this file?')
    if (!confirmed) return
    setFileDeletingId(fileId)
    try {
      await deleteDealFile(selectedDeal.id, fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      // keep simple; Meetings stays best-effort for errors
    } finally {
      setFileDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        Loading meetings…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 py-4 overflow-hidden">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-neutral-50">Meetings</h1>
        <p className="text-xs text-neutral-400">
          Manage meeting notes by company. Select a company and update notes on
          the right.
        </p>
        <input
          type="text"
          placeholder="Search by company, sector, or notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </header>

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="min-h-0 h-full overflow-hidden rounded-2xl border border-neutral-900 bg-[#121212]">
          <div className="h-full overflow-y-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 border-b border-neutral-800/80 bg-neutral-950/80 text-xs font-semibold uppercase tracking-wide text-neutral-500 backdrop-blur">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Company</th>
                  <th className="px-4 py-2 text-left font-semibold">Last meeting</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-xs text-neutral-500"
                    >
                      No companies match your search.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const isActive = deal.id === selectedId
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => handleSelectDeal(deal.id)}
                        className={`cursor-pointer border-b border-neutral-800/80 transition-colors ${
                          isActive ? 'bg-neutral-900/80' : 'hover:bg-neutral-900/60'
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium text-neutral-50">
                            {deal.company}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {deal.sector || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-neutral-300">
                          {deal.meeting_date || deal.date
                            ? formatDate(deal.meeting_date || deal.date)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-neutral-300">
                          {deal.status || 'New'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-h-0 rounded-2xl border border-neutral-900 bg-[#121212] p-4">
          {!selectedDeal ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Select a company to manage meeting notes.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100">
                    {selectedDeal.company}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Meeting notes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Why is this exciting?
                  </label>
                  <textarea
                    value={form.exciting_reason}
                    onChange={handleChange('exciting_reason')}
                    rows={4}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Risks
                  </label>
                  <textarea
                    value={form.risks}
                    onChange={handleChange('risks')}
                    rows={4}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Reasons for pass
                  </label>
                  <textarea
                    value={form.pass_reasons}
                    onChange={handleChange('pass_reasons')}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Reasons to watch
                  </label>
                  <textarea
                    value={form.watch_reasons}
                    onChange={handleChange('watch_reasons')}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Action required
                  </label>
                  <textarea
                    value={form.action_required}
                    onChange={handleChange('action_required')}
                    rows={3}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2 border-t border-neutral-800 pt-3 mt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Meeting files
                </h3>
                {filesLoading ? (
                  <p className="text-[12px] text-neutral-500">Loading files…</p>
                ) : files.length === 0 ? (
                  <p className="text-[12px] text-neutral-500">No files uploaded yet for this deal.</p>
                ) : (
                  <ul className="space-y-1 text-[13px] text-neutral-100">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <a
                            href={dealFileUrl(f)}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-neutral-100 hover:text-neutral-300 underline-offset-2 hover:underline"
                          >
                            {f.file_name}
                          </a>
                          {f.uploaded_at && (
                            <span className="text-[11px] text-neutral-500 shrink-0">
                              {new Date(f.uploaded_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(f.id)}
                          disabled={fileDeletingId === f.id}
                          className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800 disabled:opacity-60"
                        >
                          {fileDeletingId === f.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MeetingsPage
