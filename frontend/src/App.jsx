import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import AssistantPage from './pages/Assistant'
import LoginPage from './pages/Login'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicLoginOnly({ children }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/assistant" replace />
  return children
}

function AssistantLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicLoginOnly><LoginPage /></PublicLoginOnly>} />
        <Route
          path="/assistant"
          element={<AssistantLayout><AssistantPage /></AssistantLayout>}
        />
        <Route
          path="/assistant/new"
          element={<AssistantLayout><AssistantPage /></AssistantLayout>}
        />
        <Route
          path="/assistant/:conversationId"
          element={<AssistantLayout><AssistantPage /></AssistantLayout>}
        />
        <Route path="/" element={<Navigate to="/assistant" replace />} />
        <Route path="*" element={<Navigate to="/assistant" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
