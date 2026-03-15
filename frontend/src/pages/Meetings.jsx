import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchDealFiles, deleteDealFile, dealFileUrl } from '../api/deals'
import {
  fetchMeetings,
  fetchDealMeeting,
  updateDealMeeting,
  deleteDealMeeting
} from '../api/meetings'
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

function MeetingsTable({ filteredMeetings, selectedId, onSelectDeal }) {
  return (
    <div className="min-h-0 h-full overflow-hidden rounded-2xl border border-[#E8E5DE] bg-white shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]">
      <div className="h-full overflow-y-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 border-b border-[#E8E5DE] bg-[#FAFAF8]/95 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A958E] backdrop-blur">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Company</th>
              <th className="px-2 py-2 text-left font-semibold">POC</th>
              <th className="px-2 py-2 text-left font-semibold">Last meeting</th>
              <th className="px-2 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-xs text-[#9A958E]"
                >
                  No companies match your search.
                </td>
              </tr>
            ) : (
              filteredMeetings.map((meeting) => {
                const isActive = meeting.deal_id === selectedId
                return (
                  <tr
                    key={meeting.id}
                    onClick={() => onSelectDeal(meeting.deal_id)}
                    className={`cursor-pointer border-b border-[#E8E5DE] transition-colors ${
                      isActive ? 'bg-[#FFEFE2]' : 'hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-[#1A1815]">
                        {meeting.company}
                      </div>
                      <div className="text-xs text-[#9A958E]">
                        {meeting.sector || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#5A5650]">
                      {meeting.poc || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#5A5650]">
                      {meeting.meeting_date ? formatDate(meeting.meeting_date) : '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#5A5650]">
                      {meeting.status || 'New'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MeetingsPage() {
  const { deals, loadDeals } = useDealData()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [meetings, setMeetings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState({
    exciting_reason: '',
    risks: '',
    pass_reasons: '',
    watch_reasons: '',
    action_required: '',
    status: 'New'
  })
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileDeletingId, setFileDeletingId] = useState(null)

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        await loadDeals()
        const data = await fetchMeetings()
        setMeetings(data)
      } catch (err) {
        console.error(err)
        setError('Failed to load meetings')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [loadDeals])

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return meetings
    return meetings.filter((m) => {
      const company = (m.company || '').toLowerCase()
      const sector = (m.sector || '').toLowerCase()
      const exciting = (m.exciting_reason || '').toLowerCase()
      return (
        company.includes(query) ||
        sector.includes(query) ||
        exciting.includes(query)
      )
    })
  }, [meetings, search])

  const selectedMeeting = useMemo(() => {
    if (!selectedId) return null
    return meetings.find((m) => m.deal_id === selectedId || m.id === selectedId) ?? null
  }, [meetings, selectedId])

  const selectedDeal = useMemo(() => {
    if (!selectedMeeting) return null
    return deals.find((deal) => deal.id === selectedMeeting.deal_id) ?? null
  }, [deals, selectedMeeting])

  useEffect(() => {
    if (!selectedMeeting) return
    setForm({
      exciting_reason: selectedMeeting.exciting_reason || '',
      risks: selectedMeeting.risks || '',
      pass_reasons: selectedMeeting.pass_reasons || '',
      watch_reasons: selectedMeeting.watch_reasons || '',
      action_required: selectedMeeting.action_required || '',
      status: selectedMeeting.status || 'New'
    })
  }, [selectedMeeting])

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
      const updated = await updateDealMeeting(selectedDeal.id, {
        exciting_reason: form.exciting_reason || null,
        risks: form.risks || null,
        pass_reasons: form.pass_reasons || null,
        watch_reasons: form.watch_reasons || null,
        action_required: form.action_required || null,
        status: form.status || null
      })
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === updated.id || m.deal_id === selectedDeal.id ? updated : m
        )
      )
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

  const handleDeleteMeeting = async () => {
    if (!selectedDeal) return
    const confirmed = window.confirm(
      'Delete this meeting? This will not delete the underlying deal.'
    )
    if (!confirmed) return
    setError(null)
    try {
      await deleteDealMeeting(selectedDeal.id)
      setMeetings((prev) =>
        prev.filter((m) => m.deal_id !== selectedDeal.id)
      )
      setSelectedId(null)
      setFiles([])
    } catch {
      setError('Failed to delete meeting')
    }
  }

  useEffect(() => {
    const dealIdParam = searchParams.get('dealId')
    if (!dealIdParam || !meetings.length) return
    const m =
      meetings.find((item) => item.deal_id === dealIdParam) ??
      meetings.find((item) => item.id === dealIdParam)
    if (m) {
      setSelectedId(m.deal_id)
    }
  }, [meetings, searchParams])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#5A5650]">
        Loading meetings…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 py-4 overflow-hidden">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-[#1A1815]">Meetings</h1>
        <p className="text-xs text-[#9A958E]">
          Manage meeting notes by company. Select a company and update notes on
          the right.
        </p>
        <input
          type="text"
          placeholder="Search by company, sector, or notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#E8E5DE] bg-white px-3 py-2 text-sm text-[#1A1815] placeholder:text-[#C8C3BB] focus:border-[#FF7102] focus:outline-none"
        />
      </header>

      {error && (
        <div className="rounded-lg border border-[#FEE4E2] bg-[#FEF3F2] px-3 py-2 text-xs text-[#B42318]">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <MeetingsTable
          filteredMeetings={filteredMeetings}
          selectedId={selectedId}
          onSelectDeal={handleSelectDeal}
        />

        <div className="min-h-0 rounded-2xl border border-[#E8E5DE] bg-white p-4 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]">
          {!selectedDeal ? (
            <div className="flex h-full items-center justify-center text-sm text-[#9A958E]">
              Select a company to manage meeting notes.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[#1A1815]">
                    {selectedDeal.company}
                  </h2>
                  <p className="text-xs text-[#9A958E]">
                    Meeting notes
                  </p>
                  {selectedMeeting?.poc && (
                    <p className="text-[11px] text-[#9A958E]">
                      POC: {selectedMeeting.poc}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteMeeting}
                    className="rounded-full border border-[#FEE4E2] bg-[#FEF3F2] px-3 py-1 text-xs font-medium text-[#B42318] hover:bg-[#FEE4E2]"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-[#1A1815] px-3 py-1 text-xs font-medium text-white hover:bg-[#2d2a26] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Why is this exciting?
                  </label>
                  <textarea
                    value={form.exciting_reason}
                    onChange={handleChange('exciting_reason')}
                    rows={4}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Risks
                </label>
                <textarea
                  value={form.risks}
                  onChange={handleChange('risks')}
                  rows={4}
                  className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Reasons for pass
                  </label>
                  <textarea
                    value={form.pass_reasons}
                    onChange={handleChange('pass_reasons')}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Reasons to watch
                  </label>
                  <textarea
                    value={form.watch_reasons}
                    onChange={handleChange('watch_reasons')}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                    Action required
                  </label>
                  <textarea
                    value={form.action_required}
                    onChange={handleChange('action_required')}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8E5DE] bg-white px-2 py-1.5 text-sm text-[#1A1815] focus:border-[#FF7102] focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2 border-t border-[#E8E5DE] pt-3 mt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9A958E]">
                  Meeting files
                </h3>
                {filesLoading ? (
                  <p className="text-[12px] text-[#9A958E]">Loading files…</p>
                ) : files.length === 0 ? (
                  <p className="text-[12px] text-[#9A958E]">No files uploaded yet for this deal.</p>
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
                          disabled={fileDeletingId === f.id}
                          className="rounded-full border border-[#E8E5DE] bg-white px-2 py-0.5 text-[11px] font-medium text-[#5A5650] hover:bg-[#F5F4F0] disabled:opacity-60"
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
