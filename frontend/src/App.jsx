import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import CallsPage from './pages/Calls'
import DealsPage from './pages/Deals'
import DealDetailPage from './pages/DealDetail'
import MeetingsPage from './pages/Meetings'
import PortfolioNewsPage from './pages/PortfolioNews'
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

function AuthedLayout({ children }) {
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
        <Route
          path="/login"
          element={
            <PublicLoginOnly>
              <LoginPage />
            </PublicLoginOnly>
          }
        />

        <Route path="/" element={<Navigate to="/assistant" replace />} />

        <Route
          path="/calls"
          element={
            <AuthedLayout>
              <CallsPage />
            </AuthedLayout>
          }
        />

        <Route
          path="/assistant"
          element={
            <AuthedLayout>
              <CallsPage />
            </AuthedLayout>
          }
        />
        <Route
          path="/assistant/:conversationId"
          element={
            <AuthedLayout>
              <CallsPage />
            </AuthedLayout>
          }
        />

        <Route
          path="/deals"
          element={
            <AuthedLayout>
              <DealsPage />
            </AuthedLayout>
          }
        />
        <Route
          path="/deals/:dealId"
          element={
            <AuthedLayout>
              <DealDetailPage />
            </AuthedLayout>
          }
        />

        <Route
          path="/meetings"
          element={
            <AuthedLayout>
              <MeetingsPage />
            </AuthedLayout>
          }
        />

        <Route
          path="/portfolio-news"
          element={
            <AuthedLayout>
              <PortfolioNewsPage />
            </AuthedLayout>
          }
        />

        <Route path="*" element={<Navigate to="/assistant" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
