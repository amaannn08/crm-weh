import { Router } from 'express'
import { embed } from '../services/embeddings.js'
import { retrieveByVector } from '../services/retrieval.js'
import { streamChat } from '../services/llm.js'
import { sql } from '../db/neon.js'

const router = Router()
const MAX_HISTORY = 20

const SYSTEM_PROMPT = `You are an assistant for a venture capital CRM. Use the meeting transcripts below to answer the question. If the context does not contain relevant information, say so. Be concise.`

function buildContext(meetings) {
  if (!meetings?.length) return 'No meeting transcripts available.'
  return meetings
    .map((m, i) => {
      const label = m.source_file_name ? `[${m.source_file_name}]` : `[Meeting ${i + 1}]`
      return `${label}\n${m.transcript}`
    })
    .join('\n\n---\n\n')
}

router.post('/chat', async (req, res) => {
  const { message, conversationId } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) required' })
  }

  try {
    const queryEmbedding = await embed(message)
    const meetings = await retrieveByVector(queryEmbedding, 5)
    const context = buildContext(meetings)

    let conversationIdToUse = conversationId ? String(conversationId).trim() || null : null
    let historyBlob = ''
    let conversationTitle = 'New session'

    if (conversationIdToUse) {
      const [conv] = await sql`
        SELECT title FROM conversations WHERE id = ${conversationIdToUse}::uuid
      `
      if (!conv) return res.status(404).json({ error: 'Conversation not found' })
      conversationTitle = conv.title ?? 'New chat'
      const historyRows = await sql`
        SELECT role, content FROM conversation_messages
        WHERE conversation_id = ${conversationIdToUse}::uuid
        ORDER BY created_at ASC
        LIMIT ${MAX_HISTORY * 2}
      `
      if (historyRows.length) {
        historyBlob = historyRows.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
      }
    } else {
      const [inserted] = await sql`
        INSERT INTO conversations (title) VALUES ('New session')
        RETURNING id
      `
      conversationIdToUse = inserted.id
    }

    const userContent = historyBlob
      ? `Context:\n${context}\n\nPrevious conversation:\n${historyBlob}\n\nCurrent question:\n${message}`
      : `Context:\n${context}\n\nQuestion:\n${message}`

    let fullAssistantContent = ''
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('X-Conversation-Id', conversationIdToUse)
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
      VALUES (${conversationIdToUse}::uuid, 'user', ${message})
    `
    await sql`
      INSERT INTO conversation_messages (conversation_id, role, content)
      VALUES (${conversationIdToUse}::uuid, 'assistant', ${fullAssistantContent})
    `
    const normalizedTitle = (conversationTitle || '').trim()
    if (!normalizedTitle || normalizedTitle === 'New session') {
      const firstLine = message.split('\n')[0] ?? ''
      const newTitle = firstLine.slice(0, 80).trim() || 'New session'
      await sql`UPDATE conversations SET title = ${newTitle} WHERE id = ${conversationIdToUse}::uuid`
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
