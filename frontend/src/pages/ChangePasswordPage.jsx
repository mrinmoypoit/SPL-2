import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import './ChangePasswordPage.css'

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match!')
      return
    }

    // Simulate password change
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }, 3000)
  }

  return (
    <div className="change-password-page">
      <Navbar />
      
      <div className="password-container">
        <div className="password-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </button>
          <h1>Change Password</h1>
          <p>Update your account password</p>
        </div>

        <div className="password-content">
          {showSuccess && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              <span>Password changed successfully!</span>
            </div>
          )}

          <form className="password-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                placeholder="Enter your current password"
                value={formData.currentPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
              />
              <small>Password must be at least 8 characters long</small>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your new password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              <i className="fas fa-key"></i>
              <span>Update Password</span>
            </button>
          </form>

          <div className="password-tips">
            <h3>Password Tips</h3>
            <ul>
              <li><i className="fas fa-check"></i> Use at least 8 characters</li>
              <li><i className="fas fa-check"></i> Include uppercase and lowercase letters</li>
              <li><i className="fas fa-check"></i> Add numbers and special characters</li>
              <li><i className="fas fa-check"></i> Avoid common words or patterns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage
