import { authHeaders } from '../auth'

export function apiHeaders(contentType = 'application/json') {
  const base = authHeaders()
  if (!contentType) {
    return { ...base }
  }
  return {
    'Content-Type': contentType,
    ...base
  }
}

/**
 * Drop-in replacement for fetch() that auto-fires 'auth:expired'
 * on a 401 response so AuthContext can log the user out globally.
 */
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'))
  }
  return res
}
