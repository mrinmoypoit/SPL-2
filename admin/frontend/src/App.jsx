import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminDataEntryPage from '../admin/pages/AdminDataEntryPage'
import AdminLoginPage from './pages/AdminLoginPage'

const clearAdminSession = () => {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
}

const isTokenValid = (token) => {
  if (!token) return false

  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return false

    const payload = JSON.parse(atob(payloadBase64))
    if (!payload?.exp) return false

    const nowInSeconds = Math.floor(Date.now() / 1000)
    return payload.exp > nowInSeconds
  } catch {
    return false
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')

    if (isTokenValid(token)) {
      setIsAuthenticated(true)
    } else {
      clearAdminSession()
      setIsAuthenticated(false)
    }

    setLoading(false)
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    clearAdminSession()
    setIsAuthenticated(false)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  return (
    <Router>
      <Routes>
        {isAuthenticated ? (
          <>
            <Route path="/" element={<AdminDataEntryPage onLogout={handleLogout} />} />
            <Route path="/data-entry" element={<AdminDataEntryPage onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App
