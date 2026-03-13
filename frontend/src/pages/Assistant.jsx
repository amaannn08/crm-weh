import React, { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { routes, conversationUrl } from '../api/routes'
import { apiHeaders } from '../api/client'

const markdownComponents = {
  p: ({ children }) => <p className="text-sm leading-relaxed [&:not(:last-child)]:mb-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside text-sm leading-relaxed space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-sm leading-relaxed space-y-1 my-2">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>
}

function messageFromApi(m, index) {
  return {
    id: index + 1,
    role: m.role,
    content: m.content,
    timestamp: m.created_at ? new Date(m.created_at) : new Date()
  }
}

function useConversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { conversationId } = useParams()

  useEffect(() => {
    let cancelled = false
    async function fetchConversations() {
      try {
        const res = await fetch(routes.conversations, { headers: apiHeaders() })
        if (!res.ok) {
          throw new Error('Failed to load sessions')
        }
        const data = await res.json()
        if (!cancelled) {
          setConversations(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading conversations', err)
          setConversations([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    fetchConversations()
    return () => {
      cancelled = true
    }
  }, [])

  const handleNewChat = async () => {
    try {
      const res = await fetch(routes.conversations, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ title: '' })
      })
      if (!res.ok) {
        console.error('Failed to create conversation', res.status)
        setError('Failed to create session. Please try again.')
        return
      }
      const data = await res.json()
      if (data?.id) {
        setError('')
        setConversations((prev) => [
          { id: data.id, title: data.title ?? 'New session', created_at: data.created_at },
          ...prev
        ])
        navigate(`/assistant/${data.id}`)
      }
    } catch (err) {
      console.error('Error creating conversation', err)
      setError('Failed to create session. Please try again.')
    }
  }

  const handleDeleteConversation = async (id) => {
    const confirmed = window.confirm('Delete this session? This will remove all its messages.')
    if (!confirmed) return
    try {
      const res = await fetch(conversationUrl(id), {
        method: 'DELETE',
        headers: apiHeaders()
      })
      if (!res.ok && res.status !== 404) {
        console.error('Failed to delete conversation', res.status)
        setError('Failed to delete session. Please try again.')
        return
      }
      setError('')
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (conversationId === id) {
        navigate('/assistant')
      }
    } catch (err) {
      console.error('Error deleting conversation', err)
      setError('Failed to delete session. Please try again.')
    }
  }

  return {
    conversations,
    loading,
    error,
    setError,
    handleNewChat,
    handleDeleteConversation
  }
}

function AssistantHeader({ onNewChat, sessionsState }) {
  const { conversations, loading, error, handleDeleteConversation } = sessionsState
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const activeConversation =
    conversations.find((c) => String(c.id) === String(conversationId)) || null

  const filtered = search.trim()
    ? conversations.filter((c) =>
        (c.title || 'New session').toLowerCase().includes(search.trim().toLowerCase())
      )
    : conversations

  const handleSelectConversation = (id) => {
    navigate(`/assistant/${id}`)
    setOpen(false)
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Jarvis AI
        </p>
        <p className="text-sm font-medium text-slate-900">
          {activeConversation?.title || 'New session'}
        </p>
      </div>
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-400"
        >
          New chat
        </button>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Sessions
        </button>
        {open && (
          <div className="absolute right-0 top-[110%] z-20 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-slate-400 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions"
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {error && (
              <p className="mb-1 text-[11px] text-red-600">
                {error}
              </p>
            )}
            {loading ? (
              <p className="py-3 text-center text-xs text-slate-500">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">No sessions yet.</p>
            ) : (
              <ul className="max-h-64 space-y-0.5 overflow-y-auto text-sm scrollbar-hide">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <div className="group flex items-center justify-between gap-1 rounded-lg px-1">
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(c.id)}
                        className="flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {c.title || 'New session'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"
                        aria-label="Delete session"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2.75A1.75 1.75 0 007.25 4.5H5a.75.75 0 000 1.5h.318l.823 8.233A2.25 2.25 0 008.382 16.5h3.236a2.25 2.25 0 002.241-2.267L14.682 6H15a.75.75 0 000-1.5h-2.25A1.75 1.75 0 0011 2.75H9zm1.5 4.75a.75.75 0 10-1.5 0v5a.75.75 0 001.5 0v-5zm-3 .75a.75.75 0 011.5 0v4.25a.75.75 0 01-1.5 0V8.25zm5.25-.75a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const isNewSession = !conversationId || conversationId === 'new'

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm Jarvis AI, your deal flow assistant. How can I help you today?",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(!isNewSession)
  const messagesEndRef = useRef(null)
  const [errorMessage, setErrorMessage] = useState('')
  const abortControllerRef = useRef(null)
  const fileInputRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const sessionsState = useConversations()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (isNewSession) {
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: "Hello! I'm Jarvis AI, your deal flow assistant. How can I help you today?",
          timestamp: new Date()
        }
      ])
      setLoadingConversation(false)
      setErrorMessage('')
      return
    }
    let cancelled = false
    setLoadingConversation(true)
    fetch(conversationUrl(conversationId), { headers: apiHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load conversation')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data.messages && data.messages.length) {
          setMessages(data.messages.map(messageFromApi))
        } else {
          setMessages([
            {
              id: 1,
              role: 'assistant',
              content: "Hello! I'm Jarvis AI, your deal flow assistant. How can I help you today?",
              timestamp: new Date()
            }
          ])
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([{ id: 1, role: 'assistant', content: 'Could not load this conversation.', timestamp: new Date() }])
      })
      .finally(() => {
        if (!cancelled) setLoadingConversation(false)
      })
    return () => { cancelled = true }
  }, [conversationId, isNewSession])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    if (isNewSession) {
      setErrorMessage('Click \"New chat\" above to start a session.')
      return
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)
    setErrorMessage('')

    const assistantId = Date.now() + 1
    let assistantAdded = false
    let currentConversationId = conversationId && conversationId !== 'new' ? conversationId : null

    try {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const res = await fetch(routes.assistantChat, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ message: inputValue, conversationId: currentConversationId || undefined }),
        signal: controller.signal
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed: ${res.status}`)
      }
      const newId = res.headers.get('X-Conversation-Id')
      if (newId && !currentConversationId) {
        currentConversationId = newId
        navigate(`/assistant/${newId}`, { replace: true })
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
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content, timestamp: new Date() }
          ])
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content } : m))
          )
        }
      }
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: content || '(No response)', timestamp: new Date() }
        ])
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // user stopped streaming; do not add extra error bubble
      } else {
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date() }
        ])
      }
    } finally {
      setIsTyping(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handlePickAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    setAttachments(files)
  }

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <p className="text-slate-500">Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full mx-auto py-4 flex-col">
      <AssistantHeader onNewChat={sessionsState.handleNewChat} sessionsState={sessionsState} />

      <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-amber-500 text-white rounded-br-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="[&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_li]:text-sm [&_strong]:font-semibold">
                    <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
                <p
                  className={`mt-1.5 text-[10px] ${
                    message.role === 'user' ? 'text-amber-100/80' : 'text-slate-400'
                  }`}
                >
                  {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString(
                    [],
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <div className="flex h-5 items-center gap-1.5">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-slate-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto border-t border-slate-100 px-6 py-3">
          <form
            onSubmit={handleSendMessage}
            className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-amber-300"
          >
            <button
              type="button"
              onClick={handlePickAttachment}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Attach file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M8.5 3.5A3.5 3.5 0 005 7v6a2.5 2.5 0 005 0V7a1.5 1.5 0 10-3 0v5a.5.5 0 001 0V7a.5.5 0 111 0v5a1.5 1.5 0 11-3 0V7a2.5 2.5 0 115 0v6a3.5 3.5 0 11-7 0V7a.75.75 0 011.5 0v6a4 4 0 108 0V7A3.5 3.5 0 008.5 3.5z" />
              </svg>
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about deals, founders, or metrics..."
              className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              autoFocus
            />
            {isTyping ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                aria-label="Stop generating"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M5 5.75A.75.75 0 015.75 5h8.5a.75.75 0 01.75.75v8.5a.75.75 0 01-.75.75h-8.5A.75.75 0 015 14.25v-8.5z" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 004.835 9h5.684a.75.75 0 010 1.5H4.835a1.5 1.5 0 00-1.142.836l-1.414 4.925a.75.75 0 00.826.95 28.89 28.89 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            )}
          </form>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
          {attachments.length > 0 && (
            <p className="mt-1 text-center text-[11px] text-slate-500">
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''} selected (not yet sent)
            </p>
          )}
          {errorMessage && (
            <p className="mt-1 text-center text-[11px] text-red-600">
              {errorMessage}
            </p>
          )}
          <p className="mt-2 text-center text-[10px] text-slate-400">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AssistantPage
