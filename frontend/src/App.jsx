import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Chatbot from './components/Chatbot'
import './App.css'
import HomePage from './pages/HomePage'
import BankServicesPage from './pages/BankServicesPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import SettingsPage from './pages/SettingsPage'
import AdminDataEntryPage from './pages/admin/AdminDataEntryPage'

function App() {
  // Google OAuth Client ID - set from .env file
  // Users must configure their own Google OAuth credentials
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* User Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/bank-services" element={<BankServicesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            
            {/* Admin Routes - Protected */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDataEntryPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/data-entry" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDataEntryPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Chatbot />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}

export default App
