import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchDeals, fetchDeal } from '../api/deals'
import { fetchMeetings } from '../api/meetings'

const DealDataContext = createContext(null)

export function DealDataProvider({ children }) {
  // ── Deals ──────────────────────────────────────────────────────────────────
  const [deals, setDeals] = useState([])
  const [dealsLoaded, setDealsLoaded] = useState(false)
  const [dealsLoading, setDealsLoading] = useState(false)
  const [dealById, setDealById] = useState({})

  // ── Meetings ────────────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState([])
  const [meetingsLoaded, setMeetingsLoaded] = useState(false)
  const [meetingsLoading, setMeetingsLoading] = useState(false)

  // ── Eager boot fetch — populate sidebar/header immediately ─────────────────
  useEffect(() => {
    fetchDeals()
      .then(data => { setDeals(data); setDealsLoaded(true) })
      .catch(() => { })
    fetchMeetings()
      .then(data => { setMeetings(Array.isArray(data) ? data : []); setMeetingsLoaded(true) })
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount only

  // ── Deals loaders ───────────────────────────────────────────────────────────
  const loadDeals = useCallback(
    async (force = false) => {
      if (dealsLoaded && !force) return
      if (dealsLoading && !force) return
      setDealsLoading(true)
      try {
        const data = await fetchDeals()
        setDeals(data)
        setDealsLoaded(true)
      } finally {
        setDealsLoading(false)
      }
    },
    [dealsLoaded, dealsLoading]
  )

  const loadDealBundle = useCallback(
    async (id) => {
      if (dealById[id]) return dealById[id]
      const bundle = await fetchDeal(id)
      setDealById((prev) => ({ ...prev, [id]: bundle }))
      if (bundle.deal) {
        setDeals((prev) => {
          const exists = prev.some((d) => d.id === bundle.deal.id)
          if (exists) return prev.map((d) => (d.id === bundle.deal.id ? bundle.deal : d))
          return [bundle.deal, ...prev]
        })
      }
      return bundle
    },
    [dealById]
  )

  const updateDealInCache = useCallback((updatedDeal) => {
    if (!updatedDeal?.id) return
    const id = updatedDeal.id
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...updatedDeal } : d)))
    setDealById((prev) => {
      const existing = prev[id]
      if (!existing) return prev
      return { ...prev, [id]: { ...existing, deal: { ...existing.deal, ...updatedDeal } } }
    })
  }, [])

  const updateDealBundleInCache = useCallback(
    (id, bundlePatch) => {
      setDealById((prev) => {
        const existing = prev[id] || {}
        return { ...prev, [id]: { ...existing, ...bundlePatch } }
      })
      if (bundlePatch.deal) updateDealInCache(bundlePatch.deal)
    },
    [updateDealInCache]
  )

  // ── Meetings loaders ────────────────────────────────────────────────────────
  const loadMeetings = useCallback(
    async (force = false) => {
      if (meetingsLoaded && !force) return
      if (meetingsLoading && !force) return
      setMeetingsLoading(true)
      try {
        const data = await fetchMeetings()
        setMeetings(Array.isArray(data) ? data : [])
        setMeetingsLoaded(true)
      } finally {
        setMeetingsLoading(false)
      }
    },
    [meetingsLoaded, meetingsLoading]
  )

  /** Replace one meeting in the cache after an update */
  const updateMeetingInCache = useCallback((updatedMeeting) => {
    if (!updatedMeeting?.id) return
    setMeetings((prev) =>
      prev.map((m) => (m.id === updatedMeeting.id ? { ...m, ...updatedMeeting } : m))
    )
  }, [])

  /** Remove a meeting from the cache after deletion */
  const removeMeetingFromCache = useCallback((meetingId) => {
    setMeetings((prev) => prev.filter((m) => m.id !== meetingId))
  }, [])

  /** Push a new meeting into the cache (e.g. after createDealMeeting) */
  const addMeetingToCache = useCallback((newMeeting) => {
    if (!newMeeting?.id) return
    setMeetings((prev) => {
      const exists = prev.some((m) => m.id === newMeeting.id)
      return exists ? prev : [newMeeting, ...prev]
    })
  }, [])

  // ── Context value ───────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      // deals
      deals,
      dealsLoaded,
      dealsLoading,
      dealById,
      loadDeals,
      loadDealBundle,
      updateDealInCache,
      updateDealBundleInCache,
      setDealBundleFiles: (id, files) =>
        setDealById((prev) => {
          const existing = prev[id] || {}
          return { ...prev, [id]: { ...existing, files } }
        }),

      // meetings
      meetings,
      meetingsLoaded,
      meetingsLoading,
      loadMeetings,
      updateMeetingInCache,
      removeMeetingFromCache,
      addMeetingToCache,
    }),
    [
      deals, dealsLoaded, dealsLoading, dealById,
      loadDeals, loadDealBundle, updateDealInCache, updateDealBundleInCache,
      meetings, meetingsLoaded, meetingsLoading,
      loadMeetings, updateMeetingInCache, removeMeetingFromCache, addMeetingToCache,
    ]
  )

  return <DealDataContext.Provider value={value}>{children}</DealDataContext.Provider>
}

export function useDealData() {
  const ctx = useContext(DealDataContext)
  if (!ctx) throw new Error('useDealData must be used within DealDataProvider')
  return ctx
}
