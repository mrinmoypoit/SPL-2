import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'
import ProfileDropdown from './ProfileDropdown'
import NotificationDropdown from './NotificationDropdown'
import './Navbar.css'

function Navbar() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const openAuthModal = (mode) => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <nav className="nav">
            <div className="logo" onClick={() => navigate('/')}>TULONA</div>
            <div className="nav-links">
              <a href="/#home" className="nav-link">Home</a>
              <a href="/#features" className="nav-link">Features</a>
              <a href="/#about" className="nav-link">About Us</a>
              <a href="/#contact" className="nav-link">Contact</a>
            </div>
            <div className="nav-actions">
              {isAuthenticated ? (
                <>
                  <NotificationDropdown />
                  <ProfileDropdown />
                </>
              ) : (
                <>
                  <button className="login-btn" onClick={() => openAuthModal('login')}>
                    Log In
                  </button>
                  <button className="signup-btn" onClick={() => openAuthModal('signup')}>
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}

export default Navbar
