import { apiHeaders } from './client'
import { routes, dealMeetingUrl } from './routes'

export async function fetchMeetings() {
  const res = await fetch(routes.meetings, {
    headers: apiHeaders()
  })
  if (!res.ok) {
    throw new Error('Failed to fetch meetings')
  }
  return res.json()
}

export async function fetchDealMeeting(dealId) {
  const res = await fetch(dealMeetingUrl(dealId), {
    headers: apiHeaders()
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error('Failed to fetch deal meeting')
  }
  return res.json()
}

export async function createDealMeeting(dealId, payload) {
  const res = await fetch(dealMeetingUrl(dealId), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error('Failed to create deal meeting')
  }
  return res.json()
}

export async function updateDealMeeting(dealId, patch) {
  const res = await fetch(dealMeetingUrl(dealId), {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(patch)
  })
  if (!res.ok) {
    throw new Error('Failed to update deal meeting')
  }
  return res.json()
}

export async function deleteDealMeeting(dealId) {
  const res = await fetch(dealMeetingUrl(dealId), {
    method: 'DELETE',
    headers: apiHeaders()
  })
  if (res.status === 404) {
    return
  }
  if (!res.ok) {
    throw new Error('Failed to delete deal meeting')
  }
}


