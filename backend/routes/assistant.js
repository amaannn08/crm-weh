import { Router } from 'express'
import { streamChat } from '../services/llm.js'
import { sql } from '../db/neon.js'
import { createSession } from '../services/session.js'
import { meetingSearchTool } from '../services/tools/meetingSearchTool.js'
import { dealLookupByCompanyTool } from '../services/tools/dealLookupTool.js'
import { planNextAction } from '../services/planner.js'

const router = Router()

const SYSTEM_PROMPT = `You are an assistant for a venture capital CRM.

You have access to two kinds of information:
- MEETING TRANSCRIPTS (GROUND TRUTH): verbatim transcripts of calls.
- CHAT HISTORY (CONVERSATION ONLY): prior responses and questions in this chat, which may be incomplete or inaccurate.

Rules:
- Treat MEETING TRANSCRIPTS as the only factual source of truth.
- Use CHAT HISTORY only to understand what the user is referring to (pronouns like "they", "their"), not as evidence by itself.
- Do NOT invent names, numbers, or facts that are not clearly supported by the MEETING TRANSCRIPTS.
- If the transcripts do not contain the answer, say you don't know or that it is not specified.
- Be concise and directly answer the user's latest question.`

router.post('/chat', async (req, res) => {
  const { message, conversationId } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) required' })
  }

  try {
    const { session, conversationTitle, historyBlob } = await createSession({
      conversationId,
      userMessage: message
    })

    session.tools_available = [meetingSearchTool, dealLookupByCompanyTool]

    const plan = planNextAction({ session, userMessage: message })

    let meetingContext = 'No meeting transcripts available.'
    let meetingMode = 'none'
    let companyDataSection = ''

    if (plan.action === 'call_tools' && Array.isArray(plan.tools) && plan.tools.length > 0) {
      for (const step of plan.tools) {
        const tool = session.tools_available.find((t) => t.id === step.id)
        if (!tool) continue
        const result = await tool.execute({ session, input: step.input })
        if (tool.id === 'meeting_search' && result) {
          if (result.context) meetingContext = result.context
          if (result.mode) meetingMode = result.mode
        }
        if (tool.id === 'deal_lookup_by_company' && result && Array.isArray(result.deals) && result.deals.length > 0) {
          const lines = result.deals.map((d, idx) => {
            const parts = []
            parts.push(`Deal ${idx + 1}:`)
            if (d.company) parts.push(`Company: ${d.company}`)
            if (d.stage) parts.push(`Stage: ${d.stage}`)
            if (d.sector) parts.push(`Sector: ${d.sector}`)
            if (d.status) parts.push(`Status: ${d.status}`)
            if (d.meeting_date) parts.push(`Meeting date: ${d.meeting_date}`)
            if (d.conviction_score != null) parts.push(`Conviction score: ${d.conviction_score}`)
            if (d.founder_final_score != null) parts.push(`Founder final score: ${d.founder_final_score}`)
            return `- ${parts.join(' | ')}`
          })
          companyDataSection = `COMPANY DATA (STRUCTURED FROM BACKEND ROUTES):\n\n${lines.join('\n')}\n\n`
        }
      }
    }

    const hasHistory = !!historyBlob
    const meetingHeaderPrefix =
      meetingMode === 'fallback_semantic'
        ? 'These are the closest matching meeting transcripts I could find; they may not be about the exact company or question.\n\n'
        : ''

    const meetingSection = `MEETING TRANSCRIPTS (GROUND TRUTH):\n\n${meetingHeaderPrefix}${meetingContext}\n\n`

    const historySection = hasHistory
      ? `CHAT HISTORY (CONVERSATION ONLY - NOT GROUND TRUTH):\n\n${historyBlob}\n\n`
      : ''

    const taskSection = `TASK:\n\nAnswer the user's latest question using ONLY the MEETING TRANSCRIPTS and COMPANY DATA above as factual evidence. Use the chat history only to resolve references (like who \"they\" refers to), not as evidence. If neither transcripts nor company data contain the answer, say you don't know.\n\nUser question:\n${message}`

    const userContent = `${meetingSection}${companyDataSection}${historySection}${taskSection}`

    let fullAssistantContent = ''
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('X-Conversation-Id', session.conversationId)
    res.flushHeaders?.()

    await streamChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      (chunk) => {
        fullAssistantContent += chunk
        res.write(chunk)
      }
    )
    res.end()

    await sql`
      INSERT INTO conversation_messages (conversation_id, role, content)
      VALUES (${session.conversationId}::uuid, 'user', ${message})
    `
    await sql`
      INSERT INTO conversation_messages (conversation_id, role, content)
      VALUES (${session.conversationId}::uuid, 'assistant', ${fullAssistantContent})
    `
    const normalizedTitle = (conversationTitle || '').trim()
    if (!normalizedTitle || normalizedTitle === 'New session') {
      const firstLine = message.split('\n')[0] ?? ''
      const newTitle = firstLine.slice(0, 80).trim() || 'New session'
      await sql`UPDATE conversations SET title = ${newTitle} WHERE id = ${session.conversationId}::uuid`
    }
  } catch (err) {
    console.error('[assistant] error handling chat', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Assistant error' })
    } else {
      res.end()
    }
  }
})

export default router
