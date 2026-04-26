import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI, otpAPI } from '../services/api'
import { GoogleLogin } from '@react-oauth/google'
import { isGoogleOAuthConfigured } from '../utils/googleOAuth'
import './AuthModal.css'

function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login } = useAuth()
  const googleOAuthConfigured = isGoogleOAuthConfigured()
  const [mode, setMode] = useState(initialMode) // 'login', 'signup', 'forgot'
  const [step, setStep] = useState(1) // For multi-step forms
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Reset mode when initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setStep(1)
      setError('')
      setSuccessMessage('')
    }
  }, [isOpen, initialMode])
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profession: '',
    monthlyIncome: '',
    otpMethod: 'email', // 'email' or 'sms'
    otp: ''
  })

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleModeSwitch = (newMode) => {
    setMode(newMode)
    setStep(1)
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      profession: '',
      monthlyIncome: '',
      otpMethod: 'email',
      otp: ''
    })
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true)
      setError('')
      
      // Send Google token to backend
      const response = await authAPI.googleAuth(credentialResponse.credential)
      
      localStorage.setItem('token', response.token)
      login(response.user)
      setSuccessMessage('Login successful!')
      setTimeout(() => {
        onClose()
        window.location.reload()
      }, 500)
    } catch (err) {
      setError(err.message || 'Google authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Failed to authenticate with Google. Please try again.')
  }

  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        {mode === 'login' && (
          <div className="auth-content">
            <h2>Welcome Back!</h2>
            <p className="auth-subtitle">Sign in to access your account</p>

            {googleOAuthConfigured ? (
              <>
                <div className="google-login-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    width="100%"
                  />
                </div>

                <div className="divider">
                  <span>OR</span>
                </div>
              </>
            ) : (
              <div className="oauth-warning-message">
                Google sign-in is unavailable. Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and restart the frontend server.
              </div>
            )}

            <form className="auth-form" onSubmit={async (e) => {
              e.preventDefault()
              setLoading(true)
              setError('')
              try {
                const response = await authAPI.login({
                  identifier: formData.email,
                  password: formData.password
                })
                localStorage.setItem('token', response.token)
                login(response.user)
                onClose()
                window.location.reload()
              } catch (err) {
                setError(err.message || 'Login failed. Please try again.')
              } finally {
                setLoading(false)
              }
            }}>
              <div className="form-group">
                <label>Email or Phone</label>
                <input
                  type="text"
                  name="email"
                  placeholder="Enter your email or phone"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button
                type="button"
                className="forgot-link"
                onClick={() => handleModeSwitch('forgot')}
              >
                Forgot Password?
              </button>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Signing in...' : 'Log In'}
              </button>
            </form>

            <p className="switch-mode">
              Don't have an account?{' '}
              <button onClick={() => handleModeSwitch('signup')}>Sign Up</button>
            </p>
          </div>
        )}

        {mode === 'signup' && step === 1 && (
          <div className="auth-content">
            <h2>Create Account</h2>
            <p className="auth-subtitle">Start your journey with TULONA</p>

            {googleOAuthConfigured ? (
              <>
                <div className="google-login-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    width="100%"
                  />
                </div>

                <div className="divider">
                  <span>OR</span>
                </div>
              </>
            ) : (
              <div className="oauth-warning-message">
                Google sign-up is unavailable. Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` and restart the frontend server.
              </div>
            )}

            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Continue
              </button>
            </form>

            <p className="switch-mode">
              Already have an account?{' '}
              <button onClick={() => handleModeSwitch('login')}>Sign In</button>
            </p>
          </div>
        )}

        {mode === 'signup' && step === 2 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(1)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Verify Your Identity</h2>
            <p className="auth-subtitle">Choose how you'd like to receive your OTP</p>

            <div className="otp-method-selection">
              <label className={`otp-method ${formData.otpMethod === 'email' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="otpMethod"
                  value="email"
                  checked={formData.otpMethod === 'email'}
                  onChange={handleInputChange}
                />
                <div className="method-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="method-info">
                  <h4>Email</h4>
                  <p>{formData.email}</p>
                </div>
              </label>

              <label className={`otp-method ${formData.otpMethod === 'sms' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="otpMethod"
                  value="sms"
                  checked={formData.otpMethod === 'sms'}
                  onChange={handleInputChange}
                />
                <div className="method-icon">
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <div className="method-info">
                  <h4>SMS</h4>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required={formData.otpMethod === 'sms'}
                  />
                </div>
              </label>
            </div>

            <button className="submit-btn" onClick={async () => {
              setLoading(true)
              setError('')
              try {
                const response = await otpAPI.generate({
                  email: formData.otpMethod === 'email' ? formData.email : null,
                  phone: formData.otpMethod === 'sms' ? formData.phone : null,
                  otpType: 'registration',
                  deliveryMethod: formData.otpMethod
                })
                setSuccessMessage(response.message)
                console.log('OTP:', response.otpCode)
                setStep(3)
              } catch (err) {
                setError(err.message || 'Failed to send OTP')
              } finally {
                setLoading(false)
              }
            }} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
          </div>
        )}

        {mode === 'signup' && step === 3 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(2)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Enter OTP</h2>
            <p className="auth-subtitle">
              We've sent a 6-digit code to{' '}
              {formData.otpMethod === 'email' ? formData.email : formData.phone}
            </p>

            <div className="otp-input-container">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="otp-digit"
                  onInput={(e) => {
                    if (e.target.value && e.target.nextSibling) {
                      e.target.nextSibling.focus()
                    }
                  }}
                />
              ))}
            </div>

            <button className="resend-otp">
              Didn't receive code? <span>Resend</span>
            </button>

            <button className="submit-btn" onClick={() => setStep(4)}>
              Verify OTP
            </button>
          </div>
        )}

        {mode === 'signup' && step === 4 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(3)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Complete Your Profile</h2>
            <p className="auth-subtitle">Help us personalize your experience</p>

            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); setStep(5); }}>
              <div className="form-group">
                <label>Profession</label>
                <select
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  required
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
                  placeholder="Enter your monthly income"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Continue
              </button>
            </form>
          </div>
        )}

        {mode === 'signup' && step === 5 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(4)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Set Your Password</h2>
            <p className="auth-subtitle">Create a strong password to secure your account</p>

            <form className="auth-form" onSubmit={async (e) => {
              e.preventDefault()
              if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match')
                return
              }
              setLoading(true)
              setError('')
              try {
                const response = await authAPI.register({
                  name: formData.name,
                  email: formData.email,
                  phone: formData.phone,
                  profession: formData.profession,
                  monthlyIncome: formData.monthlyIncome,
                  password: formData.password
                })
                localStorage.setItem('token', response.token)
                login(response.user)
                setStep(6)
              } catch (err) {
                setError(err.message || 'Registration failed. Please try again.')
              } finally {
                setLoading(false)
              }
            }}>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {mode === 'signup' && step === 6 && (
          <div className="auth-content success-content">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Registration Successful!</h2>
            <p className="auth-subtitle">
              Your account has been created successfully. Welcome to TULONA!
            </p>
            <button className="submit-btn" onClick={() => {
              onClose()
              window.location.reload()
            }}>
              Start Exploring
            </button>
          </div>
        )}

        {mode === 'forgot' && step === 1 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => handleModeSwitch('login')}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">
              Enter your registered email or phone number to receive an OTP
            </p>

            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <div className="form-group">
                <label>Email or Phone</label>
                <input
                  type="text"
                  name="email"
                  placeholder="Enter your email or phone"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Send OTP
              </button>
            </form>
          </div>
        )}

        {mode === 'forgot' && step === 2 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(1)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Enter OTP</h2>
            <p className="auth-subtitle">
              We've sent a 6-digit code to {formData.email}
            </p>

            <div className="otp-input-container">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="otp-digit"
                  onInput={(e) => {
                    if (e.target.value && e.target.nextSibling) {
                      e.target.nextSibling.focus()
                    }
                  }}
                />
              ))}
            </div>

            <button className="resend-otp">
              Didn't receive code? <span>Resend</span>
            </button>

            <button className="submit-btn" onClick={() => setStep(3)}>
              Verify OTP
            </button>
          </div>
        )}

        {mode === 'forgot' && step === 3 && (
          <div className="auth-content">
            <button className="back-btn" onClick={() => setStep(2)}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <h2>Reset Password</h2>
            <p className="auth-subtitle">Create a new password for your account</p>

            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); setStep(4); }}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Create a new password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                Reset Password
              </button>
            </form>
          </div>
        )}

        {mode === 'forgot' && step === 4 && (
          <div className="auth-content success-content">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Password Reset Successful!</h2>
            <p className="auth-subtitle">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button className="submit-btn" onClick={() => handleModeSwitch('login')}>
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthModal
