import { authHeaders } from '../auth'

export function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    ...authHeaders()
  }
}
