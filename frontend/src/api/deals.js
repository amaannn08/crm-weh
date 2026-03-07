import { apiHeaders } from './client'
import { dealScoreUrl, dealUrl, routes } from './routes'

export async function fetchDeals() {
  const res = await fetch(routes.deals, {
    headers: apiHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch deals')
  }
  return res.json()
}

export async function fetchDeal(id) {
  const res = await fetch(dealUrl(id), {
    headers: apiHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch deal')
  }
  return res.json()
}

export async function createDeal(payload) {
  const res = await fetch(routes.deals, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error('Failed to create deal')
  }
  return res.json()
}

export async function updateDeal(id, patch) {
  const res = await fetch(dealUrl(id), {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(patch)
  })
  if (!res.ok) {
    throw new Error('Failed to update deal')
  }
  return res.json()
}

export async function fetchDealScore(id) {
  const res = await fetch(dealScoreUrl(id), {
    headers: apiHeaders()
  })
  if (!res.ok) {
    if (res.status === 404) {
      return null
    }
    throw new Error('Failed to fetch deal score')
  }
  return res.json()
}

export async function runDealScoring(id, transcript) {
  const res = await fetch(dealScoreUrl(id), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ transcript })
  })
  if (!res.ok) {
    throw new Error('Failed to run deal scoring')
  }
  return res.json()
}

