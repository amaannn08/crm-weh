export const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const routes = {
  login: API_BASE ? `${API_BASE}/auth/login` : '/api/auth/login',
  assistantChat: API_BASE ? `${API_BASE}/assistant/chat` : '/api/assistant/chat',
  conversations: API_BASE ? `${API_BASE}/conversations` : '/api/conversations',
  deals: API_BASE ? `${API_BASE}/deals` : '/api/deals',
  meetings: API_BASE ? `${API_BASE}/meetings` : '/api/meetings'
}

export function conversationUrl(id) {
  const base = API_BASE ? `${API_BASE}/conversations` : '/api/conversations'
  return `${base}/${id}`
}

export function dealUrl(id) {
  const base = API_BASE ? `${API_BASE}/deals` : '/api/deals'
  return `${base}/${id}`
}

export function dealScoreUrl(id) {
  const base = API_BASE ? `${API_BASE}/deals` : '/api/deals'
  return `${base}/${id}/score`
}

export function dealMeetingUrl(id) {
  const base = API_BASE ? `${API_BASE}/deals` : '/api/deals'
  return `${base}/${id}/meeting`
}
