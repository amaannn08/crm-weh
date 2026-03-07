import { Router } from 'express'
import { embed } from '../services/embeddings.js'
import { retrieveByVector } from '../services/retrieval.js'
import { streamChat } from '../services/llm.js'

const router = Router()

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
  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message (string) required' })
  }

  try {
    const queryEmbedding = await embed(message)
    const meetings = await retrieveByVector(queryEmbedding, 5)
    const context = buildContext(meetings)

    const userContent = `Context:\n${context}\n\nQuestion:\n${message}`

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders?.()

    await streamChat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      (chunk) => {
        res.write(chunk)
      }
    )
    res.end()
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Assistant error' })
    } else {
      res.end()
    }
  }
})

export default router
