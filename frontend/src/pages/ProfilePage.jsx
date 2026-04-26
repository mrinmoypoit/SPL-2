import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../services/api'
import Navbar from '../components/Navbar'
import './ProfilePage.css'

function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profession: user?.profession || '',
    monthlyIncome: user?.monthlyIncome || ''
  })

  const handleInputChange = (e) => {
    setSaveError('')
    setSaveSuccess('')
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const response = await userAPI.updateProfile({
        name: formData.name,
        phone: formData.phone,
        profession: formData.profession,
        monthlyIncome: formData.monthlyIncome === '' ? null : Number(formData.monthlyIncome)
      })

      updateProfile(response?.user || formData)
      setSaveSuccess('Profile updated successfully')
      setIsEditing(false)
    } catch (error) {
      setSaveError(error?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <Navbar />
      
      <div className="profile-container">
        <div className="profile-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </button>
          <h1>My Profile</h1>
          <p>Manage your personal information</p>
        </div>

        <div className="profile-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2>{user?.name || 'User'}</h2>
            <p className="user-email">{user?.email || 'user@example.com'}</p>
          </div>

          <div className="profile-form-section">
            {saveError && <div className="error-message">{saveError}</div>}
            {saveSuccess && <div className="success-message">{saveSuccess}</div>}

            {!isEditing ? (
              <div className="profile-info">
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  <i className="fas fa-edit"></i>
                  <span>Edit Profile</span>
                </button>

                <div className="info-grid">
                  <div className="info-item">
                    <label>Full Name</label>
                    <p>{user?.name || 'Not provided'}</p>
                  </div>

                  <div className="info-item">
                    <label>Email Address</label>
                    <p>{user?.email || 'Not provided'}</p>
                  </div>

                  <div className="info-item">
                    <label>Phone Number</label>
                    <p>{user?.phone || 'Not provided'}</p>
                  </div>

                  <div className="info-item">
                    <label>Profession</label>
                    <p>{user?.profession || 'Not provided'}</p>
                  </div>

                  <div className="info-item">
                    <label>Monthly Income</label>
                    <p>{user?.monthlyIncome ? `৳${parseInt(user.monthlyIncome).toLocaleString()}` : 'Not provided'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleSave}>
                <div className="form-actions-top">
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn" disabled={isSaving}>
                    <i className="fas fa-check"></i>
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled
                    />
                    <small>Email cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Profession</label>
                    <select
                      name="profession"
                      value={formData.profession}
                      onChange={handleInputChange}
                    >
                      <option value="">Select your profession</option>
                      <option value="student">Student</option>
                      <option value="employee">Salaried Employee</option>
                      <option value="business">Business Owner</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Monthly Income (BDT)</label>
                    <input
                      type="number"
                      name="monthlyIncome"
                      value={formData.monthlyIncome}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
