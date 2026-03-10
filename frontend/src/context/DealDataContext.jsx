import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { fetchDeals, fetchDeal } from '../api/deals'

const DealDataContext = createContext(null)

export function DealDataProvider({ children }) {
  const [deals, setDeals] = useState([])
  const [dealsLoaded, setDealsLoaded] = useState(false)
  const [dealsLoading, setDealsLoading] = useState(false)
  const [dealById, setDealById] = useState({})

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
      // also ensure deals list contains this deal (for deep links)
      if (bundle.deal) {
        setDeals((prev) => {
          const exists = prev.some((d) => d.id === bundle.deal.id)
          if (exists) {
            return prev.map((d) => (d.id === bundle.deal.id ? bundle.deal : d))
          }
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
      return {
        ...prev,
        [id]: { ...existing, deal: { ...existing.deal, ...updatedDeal } }
      }
    })
  }, [])

  const updateDealBundleInCache = useCallback((id, bundlePatch) => {
    setDealById((prev) => {
      const existing = prev[id] || {}
      return {
        ...prev,
        [id]: { ...existing, ...bundlePatch }
      }
    })
    if (bundlePatch.deal) {
      updateDealInCache(bundlePatch.deal)
    }
  }, [updateDealInCache])

  const value = useMemo(
    () => ({
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
        })
    }),
    [
      deals,
      dealsLoaded,
      dealsLoading,
      dealById,
      loadDeals,
      loadDealBundle,
      updateDealInCache,
      updateDealBundleInCache
    ]
  )

  return <DealDataContext.Provider value={value}>{children}</DealDataContext.Provider>
}

export function useDealData() {
  const ctx = useContext(DealDataContext)
  if (!ctx) throw new Error('useDealData must be used within DealDataProvider')
  return ctx
}

