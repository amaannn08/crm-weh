import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom'
import { routes, conversationUrl } from '../api/routes'
import { apiHeaders } from '../api/client'

function SessionsBar() {
  const [conversations, setConversations] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { conversationId } = useParams()

  const fetchConversations = async () => {
    try {
      const res = await fetch(routes.conversations, { headers: apiHeaders() })
      if (res.ok) {
        const data = await res.json()
        setConversations(Array.isArray(data) ? data : [])
      }
    } catch (_) {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
    const intervalId = setInterval(fetchConversations, 5000)
    return () => {
      clearInterval(intervalId)
    }
  }, [location.pathname])

  const filtered = search.trim()
    ? conversations.filter((c) => (c.title || 'New session').toLowerCase().includes(search.trim().toLowerCase()))
    : conversations

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
    }
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-neutral-800 bg-[#171717] h-full">
      <button
        type="button"
        onClick={handleNewChat}
        className="flex items-center gap-2 mx-3 mt-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        New session
      </button>
      <div className="mx-3 mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-500 shrink-0">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          className="flex-1 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
        />
      </div>
      <div className="mt-2 px-2 flex-1 overflow-y-auto min-h-0">
        <p className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">Your chats</p>
        {error && (
          <p className="px-2 text-[11px] text-red-400 mb-1">
            {error}
          </p>
        )}
        {loading ? (
          <p className="px-2 py-4 text-sm text-neutral-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-neutral-500">No chats yet</p>
        ) : (
          <ul className="space-y-0.5 py-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <div className="group flex items-center justify-between gap-1 rounded-lg px-1">
                  <NavLink
                    to={`/assistant/${c.id}`}
                    className={({ isActive }) =>
                      `flex-1 px-2 py-2 rounded-lg text-sm truncate transition-colors ${
                        isActive
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                      }`
                    }
                  >
                    {c.title || 'New session'}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => handleDeleteConversation(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
                    aria-label="Delete session"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
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
    </aside>
  )
}

export default SessionsBar
