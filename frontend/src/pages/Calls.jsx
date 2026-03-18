import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { routes, conversationUrl } from '../api/routes'
import { apiHeaders } from '../api/client'

const PROMPTS = [
  {
    tag: 'LP PIPELINE',
    body: 'How many LPs did we speak to in the last 3 months and how many have potential?'
  },
  {
    tag: 'DEAL QUALITY',
    body: 'Which pitch calls showed the strongest founder-market fit this quarter?'
  },
  {
    tag: 'SECTOR TRENDS',
    body: 'What sectors are dominating our pitch intake right now?'
  },
  {
    tag: 'ACTION ITEMS',
    body: 'Summarise all open follow-ups from LP calls this month'
  }
]

const markdownComponents = {
  p: ({ children }) => <p className="text-[13px] leading-relaxed [&:not(:last-child)]:mb-2">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc list-inside space-y-1 text-[13px] leading-relaxed">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal list-inside space-y-1 text-[13px] leading-relaxed">{children}</ol>
  ),
  li: ({ children }) => <li className="text-[13px] leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>
}

function ScopePill({ active, dotColor, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative inline-flex h-[25px] items-center gap-2 rounded-full border px-3 text-[10px] font-mono tracking-[0.07em]',
        active ? 'border-[#FFD0AB] bg-[#FFEFE2] text-[#FF7102]' : 'border-[#E8E5DE] bg-white text-[#5A5650] hover:bg-[#F5F4F0]'
      ].join(' ')}
    >
      <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

function PromptCard({ tag, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#E8E5DE] bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)] hover:bg-[#FAFAF8]"
    >
      <div className="text-[9px] font-mono font-medium uppercase tracking-[0.18em] text-[#FF7102]">
        {tag}
      </div>
      <div className="mt-2 text-[13px] font-semibold leading-[1.45] text-[#1A1815]">
        {body}
      </div>
    </button>
  )
}

function CallsPage() {
  const [scope, setScope] = useState('all')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  const subtitle = useMemo(() => {
    if (scope === 'lp') return 'LP calls'
    if (scope === 'pitch') return 'Pitch calls'
    if (scope === 'portfolio') return 'Portfolio updates'
    if (scope === 'internal') return 'Internal strategy'
    return 'Jarvis AI'
  }, [scope])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  )

  const messages = activeSession?.messages || []
  const hasStarted = messages.length > 0

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(routes.conversations, { headers: apiHeaders() })
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        setSessions((prev) => {
          const byId = new Map(prev.map((session) => [session.id, session]))

          data.forEach((c) => {
            const existing = byId.get(c.id)
            if (existing) {
              byId.set(c.id, {
                ...existing,
                name: c.title || existing.name || 'New session',
                createdAt: c.created_at || existing.createdAt
              })
            } else {
              byId.set(c.id, {
                id: c.id,
                name: c.title || 'New session',
                messages: [],
                createdAt: c.created_at
              })
            }
          })

          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        })
      } catch {
        // ignore fetch errors for now
      }
    }

    fetchConversations()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    let targetSessionId = activeSessionId

    // If there is no active session yet, create one in the backend
    if (!targetSessionId) {
      try {
        const createRes = await fetch(routes.conversations, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ title: '' })
        })
        if (createRes.ok) {
          const created = await createRes.json()
          targetSessionId = created.id
          const newSession = {
            id: created.id,
            name: created.title || 'New session',
            messages: [],
            createdAt: created.created_at
          }
          setSessions((prev) => [newSession, ...prev])
          setActiveSessionId(created.id)
        }
      } catch {
        // fall back to non-persistent session if creation fails
        targetSessionId = targetSessionId || `local-${Date.now()}`
        const localSession = {
          id: targetSessionId,
          name: 'Local session',
          messages: [],
          createdAt: new Date().toISOString()
        }
        setSessions((prev) => [localSession, ...prev])
        setActiveSessionId(targetSessionId)
      }
    }

    const sessionIdForUpdate = targetSessionId

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionIdForUpdate
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      )
    )
    setInput('')
    setError('')
    setLoading(true)
    setIsTyping(true)

    const assistantId = Date.now() + 1
    let assistantAdded = false

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const res = await fetch(routes.assistantChat, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          message: userMessage.content,
          scope,
          conversationId: sessionIdForUpdate
        }),
        signal: controller.signal
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed: ${res.status}`)
      }

      if (!res.body) {
        const text = await res.text()
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionIdForUpdate
              ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: text || '(No response)',
                    timestamp: new Date()
                  }
                ]
              }
              : session
          )
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })

        if (!assistantAdded) {
          assistantAdded = true
          setSessions((prev) =>
            prev.map((session) =>
              session.id === sessionIdForUpdate
                ? {
                  ...session,
                  messages: [
                    ...session.messages,
                    {
                      id: assistantId,
                      role: 'assistant',
                      content,
                      timestamp: new Date()
                    }
                  ]
                }
                : session
            )
          )
        } else {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === sessionIdForUpdate
                ? {
                  ...session,
                  messages: session.messages.map((m) =>
                    m.id === assistantId ? { ...m, content } : m
                  )
                }
                : session
            )
          )
        }
      }

      if (!assistantAdded) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionIdForUpdate
              ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: content || '(No response)',
                    timestamp: new Date()
                  }
                ]
              }
              : session
          )
        )
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong. Please try again.')
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionIdForUpdate
              ? {
                ...session,
                messages: [
                  ...session.messages,
                  {
                    id: assistantId,
                    role: 'assistant',
                    content: `Error: ${err.message || 'Something went wrong.'}`,
                    timestamp: new Date()
                  }
                ]
              }
              : session
          )
        )
      }
    } finally {
      setLoading(false)
      setIsTyping(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleNewChat = () => {
    (async () => {
      try {
        const res = await fetch(routes.conversations, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ title: '' })
        })
        if (!res.ok) {
          setError('Failed to create session. Please try again.')
          return
        }
        const data = await res.json()
        const newSession = {
          id: data.id,
          name: data.title || 'New session',
          messages: [],
          createdAt: data.created_at
        }
        setSessions((prev) => [newSession, ...prev])
        setActiveSessionId(data.id)
      } catch {
        setError('Failed to create session. Please try again.')
      }
    })()
  }

  const handleDeleteSession = (sessionId) => {
    (async () => {
      try {
        const res = await fetch(conversationUrl(sessionId), {
          method: 'DELETE',
          headers: apiHeaders()
        })
        if (!res.ok && res.status !== 404) {
          setError('Failed to delete session. Please try again.')
          return
        }
        setError('')
        setSessions((prev) => {
          const remaining = prev.filter((session) => session.id !== sessionId)
          setActiveSessionId((currentId) => {
            if (currentId !== sessionId) return currentId
            return remaining.length > 0 ? remaining[0].id : null
          })
          return remaining
        })
      } catch {
        setError('Failed to delete session. Please try again.')
      }
    })()
  }

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId)
    const session = sessions.find((s) => s.id === sessionId)
    if (!session || session.messages.length > 0) {
      return
    }
    try {
      const res = await fetch(conversationUrl(sessionId), {
        headers: apiHeaders()
      })
      if (!res.ok) return
      const data = await res.json()
      const loadedMessages =
        Array.isArray(data.messages) &&
        data.messages.map((m, index) => ({
          id: `${sessionId}-${index}`,
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
          timestamp: new Date(m.created_at)
        }))

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
              ...s,
              messages: loadedMessages || []
            }
            : s
        )
      )
    } catch {
      // ignore load errors for now
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-end items-center gap-3 rounded-b-xl border border-[#E8E5DE] bg-white px-4 py-2">
        <ScopePill active dotColor="#FF7102" label="New Chat" onClick={handleNewChat} />
        <ScopePill
          active={showSessionsModal}
          dotColor="#3D7A58"
          label="Sessions"
          onClick={() => setShowSessionsModal(true)}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-[#E0DBD2] scrollbar-track-transparent">
          <div className="w-full max-w-4xl py-4">
            {!hasStarted ? (
              <div>
                <div className="text-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF7102]">
                    {subtitle}
                  </div>
                  <h1 className="mt-2 font-serif text-[44px] leading-[1.18] text-[#1A1815]">
                    What do your calls
                    <br />
                    tell you <span className="text-[#FF7102]">today?</span>
                  </h1>
                  <div className="mx-auto mt-4 h-px w-24 bg-[#D4CFC4]" />
                </div>

                <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {PROMPTS.map((p) => (
                    <PromptCard
                      key={p.tag}
                      tag={p.tag}
                      body={p.body}
                      onClick={() => setInput(p.body)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex w-full min-h-[280px] flex-col space-y-2.5 px-0.5 py-1.5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-3 text-[13px] leading-relaxed shadow-sm ${message.role === 'user'
                          ? 'rounded-br-sm bg-[#FFE7D1] text-[#B85A12] shadow-[0_8px_18px_rgba(191,98,10,0.22)]'
                          : 'rounded-bl-sm border border-[#E8E5DE] bg-white text-[#1A1815] shadow-[0_6px_16px_rgba(26,24,21,0.08)]'
                        }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="[&_p]:mb-2 [&_p:last-child]:mb-0">
                          <ReactMarkdown components={markdownComponents}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p
                        className={`mt-1.5 text-[10px] ${message.role === 'user' ? 'text-[#B85A12]/70' : 'text-[#A39B8F]'
                          }`}
                      >
                        {(
                          message.timestamp instanceof Date
                            ? message.timestamp
                            : new Date(message.timestamp || Date.now())
                        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[#E8E5DE] bg-[#FAFAF8] px-4 py-3 text-[11px] text-[#5A5650] shadow-[0_4px_10px_rgba(26,24,21,0.08)]">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#B0A89C]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#B0A89C] [animation-delay:120ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#B0A89C] [animation-delay:240ms]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-[#E8E5DE] bg-[#FAFAF8] px-2 pb-4 pt-4">
          <div className="mx-auto w-full max-w-6xl">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-[14px] border border-[#E8E5DE] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(26,24,21,0.04),0_1px_3px_rgba(26,24,21,0.06)]"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your calls…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1A1815] placeholder:text-[#C8C3BB] focus:outline-none"
              />
              <span className="text-[15px] text-[#C8C3BB]" aria-hidden="true">
                📎
              </span>
              <span className="text-[15px] text-[#C8C3BB]" aria-hidden="true">
                📅
              </span>
              {isTyping ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex h-[30px] items-center gap-2 rounded-[9px] bg-[#FBF2EA] px-4 text-[12px] font-semibold text-[#9A6B3F]"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex h-[30px] items-center gap-2 rounded-[9px] bg-[#1A1815] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  <span className="font-semibold">{loading ? 'ASKING…' : 'ASK'}</span>
                  <span className="text-[12.5px]">→</span>
                </button>
              )}
            </form>

            {error && (
              <div className="mt-3 rounded-[14px] border border-[#FEE4E2] bg-[#FEF3F2] px-4 py-2 text-[11px] text-[#B42318]">
                {error}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[9.5px] font-mono text-[#C8C3BB]">
              <div className="truncate">
                ↵ Send · Shift+↵ New line · Scoped to selected folders
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#3D7A58]" />
                <span>Jarvis AI · Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSessionsModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1A1815]">Sessions</h2>
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="text-xs text-[#5A5650] hover:text-[#1A1815]"
              >
                ✕
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#5A5650]">No sessions yet.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        handleSelectSession(session.id)
                        setShowSessionsModal(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectSession(session.id)
                          setShowSessionsModal(false)
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${session.id === activeSessionId
                          ? 'bg-[#FAFAF8] text-[#1A1815]'
                          : 'bg-white text-[#5A5650] hover:bg-[#FAFAF8]'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{session.name}</span>
                        {session.id === activeSessionId && (
                          <span className="text-[10px] text-[#3D7A58]">Active</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSession(session.id)
                        }}
                        className="ml-3 text-[11px] text-[#B42318] hover:text-[#7F1D1D]"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CallsPage

