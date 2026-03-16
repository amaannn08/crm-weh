export function planNextAction({ session, userMessage }) {
  const trimmed = (userMessage || '').trim()

  if (!trimmed) {
    return { action: 'answer_direct', reason: 'Empty user message' }
  }

  const hasHistory = Array.isArray(session?.conversation_history) && session.conversation_history.length > 0

  const isShortFollowUp = trimmed.length <= 80
  const followUpPatterns = [
    /who is the founder/i,
    /who's the founder/i,
    /who is the ceo/i,
    /who's the ceo/i,
    /what is their timeline/i,
    /what's their timeline/i,
    /their timeline/i,
    /what stage are they/i,
    /what stage are they at/i,
    /what stage are they in/i,
    /\bthey\b/i,
    /\btheir\b/i,
    /\bthem\b/i
  ]
  const looksLikeFollowUp =
    isShortFollowUp && followUpPatterns.some((re) => re.test(trimmed))

  if (hasHistory && looksLikeFollowUp) {
    return {
      action: 'answer_direct',
      reason: 'Short pronoun-based follow-up; reuse existing context instead of re-querying vectors.'
    }
  }

  const companyMatch = trimmed.match(/for\s+([A-Z][\w&\-\s]+)/i)
  const company = companyMatch ? companyMatch[1].trim() : null

  if (company) {
    return {
      action: 'call_tools',
      tools: [
        {
          id: 'meeting_search',
          input: { query: trimmed }
        },
        {
          id: 'deal_lookup_by_company',
          input: { company }
        }
      ]
    }
  }

  return {
    action: 'call_tools',
    tools: [
      {
        id: 'meeting_search',
        input: { query: trimmed }
      }
    ]
  }
}


