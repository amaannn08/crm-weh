const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const routes = {
  assistantChat: API_BASE ? `${API_BASE}/assistant/chat` : '/api/assistant/chat'
}
