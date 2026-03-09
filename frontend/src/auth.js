const AUTH_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(AUTH_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(AUTH_KEY, token)
  else localStorage.removeItem(AUTH_KEY)
}

export function clearToken() {
  localStorage.removeItem(AUTH_KEY)
}

export function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
