import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './SettingsPage.css'

function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="settings-page">
      <Navbar />
      
      <div className="settings-container">
        <div className="settings-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Home</span>
          </button>
          <h1>Settings</h1>
          <p>Manage your account preferences</p>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>Notifications</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive updates and offers via email</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>SMS Notifications</h4>
                <p>Get important alerts via SMS</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Deal Alerts</h4>
                <p>Notify me about new deals and offers</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Profile Visibility</h4>
                <p>Make your profile visible to others</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Data Sharing</h4>
                <p>Share anonymous data for improvements</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Preferences</h3>
            <div className="setting-item">
              <div className="setting-info">
                <h4>Language</h4>
                <p>Choose your preferred language</p>
              </div>
              <select className="setting-select">
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Currency</h4>
                <p>Set your preferred currency</p>
              </div>
              <select className="setting-select">
                <option value="bdt">BDT (৳)</option>
                <option value="usd">USD ($)</option>
              </select>
            </div>
          </div>

          <div className="settings-section danger-section">
            <h3>Account Actions</h3>
            <button className="danger-btn">
              <i className="fas fa-trash-alt"></i>
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
