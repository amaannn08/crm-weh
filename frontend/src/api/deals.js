import { apiHeaders } from './client'
import { API_BASE, dealScoreUrl, dealUrl, routes } from './routes'

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

export async function deleteDeal(id) {
  const res = await fetch(dealUrl(id), {
    method: 'DELETE',
    headers: apiHeaders()
  })
  if (!res.ok && res.status !== 404) {
    throw new Error('Failed to delete deal')
  }
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

export async function uploadDealFiles(id, files) {
  const formData = new FormData()
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    formData.append('files', file)
  }
  const res = await fetch(`${dealUrl(id)}/files`, {
    method: 'POST',
    headers: apiHeaders(null),
    body: formData
  })
  if (!res.ok) {
    throw new Error('Failed to upload deal files')
  }
  return res.json()
}

export async function fetchDealFiles(id) {
  const res = await fetch(`${dealUrl(id)}/files`, {
    headers: apiHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch deal files')
  }
  return res.json()
}

export async function deleteDealFile(dealId, fileId) {
  const res = await fetch(`${dealUrl(dealId)}/files/${fileId}`, {
    method: 'DELETE',
    headers: apiHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to delete file')
  }
}

export function dealFileUrl(file) {
  const raw = file?.stored_path || file?.file_name || ''
  const name = raw.split(/[/\\]/).pop()
  if (!name) return ''
  const base = API_BASE ? `${API_BASE}/uploads/deal-files` : '/uploads/deal-files'
  return `${base}/${encodeURIComponent(name)}`
}

export async function ingestTranscript(file) {
  const formData = new FormData()
  formData.append('transcript', file)
  const base = API_BASE ? `${API_BASE}/deals` : '/api/deals'
  const res = await fetch(`${base}/ingest-transcript`, {
    method: 'POST',
    headers: apiHeaders(null), // null = don't set Content-Type, let browser set multipart boundary
    body: formData
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to ingest transcript')
  }
  return res.json()
}

