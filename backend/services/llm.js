import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MODEL = 'gemini-2.0-flash'

export async function streamChat(messages, streamCallback) {
  const systemMessage = messages.find((m) => m.role === 'system')
  const userContent = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n')
  const config = systemMessage ? { systemInstruction: systemMessage.content } : {}

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: userContent,
    config
  })

  for await (const chunk of stream) {
    const text = chunk.text
    if (text) streamCallback(text)
  }
}
