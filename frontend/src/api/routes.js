const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const routes = {
  login: API_BASE ? `${API_BASE}/auth/login` : '/api/auth/login',
  assistantChat: API_BASE ? `${API_BASE}/assistant/chat` : '/api/assistant/chat',
  conversations: API_BASE ? `${API_BASE}/conversations` : '/api/conversations'
}

export function conversationUrl(id) {
  const base = API_BASE ? `${API_BASE}/conversations` : '/api/conversations'
  return `${base}/${id}`
}
