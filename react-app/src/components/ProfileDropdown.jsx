import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfileDropdown.css'

function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/')
  }

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button className="profile-btn" onClick={() => setIsOpen(!isOpen)}>
        <div className="profile-avatar">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <i className={`fas fa-chevron-down ${isOpen ? 'rotate' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="user-avatar-large">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <h4>{user?.name || 'User'}</h4>
              <p>{user?.email || 'user@example.com'}</p>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <button
            className="dropdown-item"
            onClick={() => {
              setIsOpen(false)
              navigate('/profile')
            }}
          >
            <i className="fas fa-user"></i>
            <span>My Profile</span>
          </button>

          <button
            className="dropdown-item"
            onClick={() => {
              setIsOpen(false)
              navigate('/change-password')
            }}
          >
            <i className="fas fa-key"></i>
            <span>Change Password</span>
          </button>

          <button
            className="dropdown-item"
            onClick={() => {
              setIsOpen(false)
              navigate('/settings')
            }}
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </button>

          <div className="dropdown-divider"></div>

          <button className="dropdown-item logout-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileDropdown
