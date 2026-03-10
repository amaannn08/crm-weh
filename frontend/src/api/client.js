import { authHeaders } from '../auth'

export function apiHeaders(contentType = 'application/json') {
  const base = authHeaders()
  if (!contentType) {
    return {
      ...base
    }
  }
  return {
    'Content-Type': contentType,
    ...base
  }
}
