import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import Chatbot from './components/Chatbot'
import { getGoogleClientId, isGoogleOAuthConfigured } from './utils/googleOAuth'
import './App.css'
import HomePage from './pages/HomePage'
import BankServicesPage from './pages/BankServicesPage'
import LoansPage from './pages/LoansPage'
import DepositsPage from './pages/DepositsPage'
import CreditCardsPage from './pages/CreditCardsPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const rawGoogleClientId = getGoogleClientId()
  const googleOAuthConfigured = isGoogleOAuthConfigured()

  const appContent = (
    <AuthProvider>
      <Router>
        <Routes>
          {/* User Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/bank-services" element={<BankServicesPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/deposits" element={<DepositsPage />} />
          <Route path="/credit-cards" element={<CreditCardsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin panel is separated into the dedicated admin frontend app */}
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
        </Routes>
        <Chatbot />
      </Router>
    </AuthProvider>
  )

  if (!googleOAuthConfigured) {
    return appContent
  }

  return <GoogleOAuthProvider clientId={rawGoogleClientId}>{appContent}</GoogleOAuthProvider>
}

export default App
