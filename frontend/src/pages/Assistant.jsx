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
      setErrorMessage('Click "New session" on the left to start a chat.')
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
      const res = await fetch(routes.assistantChat, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ message: inputValue, conversationId: currentConversationId || undefined })
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
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date() }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  if (loadingConversation) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
        <p className="text-neutral-500">Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -mb-10 max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
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
                  ? 'bg-neutral-600 text-white rounded-br-sm'
                  : 'bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-bl-sm'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="[&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_li]:text-sm [&_strong]:font-semibold">
                  <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
              <p className={`text-[10px] mt-1.5 ${message.role === 'user' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-5">
                <motion.span
                  className="w-1.5 h-1.5 bg-neutral-500 rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-neutral-500 rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="w-1.5 h-1.5 bg-neutral-500 rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 px-4 pb-2 bg-transparent mt-auto">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-neutral-800 p-2 rounded-full border border-neutral-700 shadow-sm focus-within:ring-2 focus-within:ring-neutral-600 transition-all max-w-2xl mx-auto"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about deals, founders, or metrics..."
            className="flex-1 bg-transparent px-4 py-2 text-sm text-neutral-100 focus:outline-none placeholder:text-neutral-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="p-2.5 bg-neutral-600 text-white rounded-full hover:bg-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 004.835 9h5.684a.75.75 0 010 1.5H4.835a1.5 1.5 0 00-1.142.836l-1.414 4.925a.75.75 0 00.826.95 28.89 28.89 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
        {errorMessage && (
          <p className="text-center text-[11px] text-red-400 mt-1">
            {errorMessage}
          </p>
        )}
        <p className="text-center text-[10px] text-neutral-500 mt-2">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  )
}

export default AssistantPage
