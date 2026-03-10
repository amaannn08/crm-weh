import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { DealDataProvider } from './context/DealDataContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DealDataProvider>
        <App />
      </DealDataProvider>
    </AuthProvider>
  </StrictMode>,
)
