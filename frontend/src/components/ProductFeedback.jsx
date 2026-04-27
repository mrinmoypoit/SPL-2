import React, { useState, useEffect } from 'react'
import { feedbackAPI } from '../services/api'
import './ProductFeedback.css'

function ProductFeedback({ productId, isLoggedIn, userName }) {
  const [feedback, setFeedback] = useState([])
  const [averageRating, setAverageRating] = useState(null)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [userReview, setUserReview] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [hoveredRating, setHoveredRating] = useState(0)

  // Check if productId is valid
  if (!productId) {
    console.warn('⚠️ ProductFeedback: productId is missing!', { productId })
    return <div className="feedback-section"><p style={{color: '#fff'}}>⚠️ Product ID not available</p></div>
  }

  // Fetch feedback on component mount
  useEffect(() => {
    fetchFeedback()
  }, [productId])

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await feedbackAPI.getProductFeedback(productId)
      setFeedback(response.feedback || [])
      setAverageRating(response.stats?.averageRating)
      setTotalReviews(response.stats?.totalReviews || 0)
    } catch (err) {
      setError('Failed to load feedback')
      console.error('Error fetching feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()

    if (!isLoggedIn) {
      setError('❌ You must be logged in to submit feedback')
      return
    }

    if (userRating === 0) {
      setError('⭐ Please select a rating (1-5 stars)')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      console.log('📤 Submitting feedback:', {
        productId: parseInt(productId),
        rating: userRating,
        reviewText: userReview
      });

      const result = await feedbackAPI.submitFeedback({
        productId: parseInt(productId),
        rating: userRating,
        reviewText: userReview
      })

      console.log('✅ Feedback submitted:', result);

      setSuccess('✅ Feedback submitted successfully!')
      setUserRating(0)
      setUserReview('')

      // Refresh feedback list
      setTimeout(() => {
        fetchFeedback()
        setSuccess(null)
      }, 1500)
    } catch (err) {
      console.error('❌ Feedback submission error:', err);
      
      // Better error messages
      let errorMsg = 'Failed to submit feedback';
      
      if (err.message?.includes('401')) {
        errorMsg = '❌ Your session expired. Please log in again.';
      } else if (err.message?.includes('403')) {
        errorMsg = '❌ Access denied. Please log in again.';
      } else if (err.message?.includes('404')) {
        errorMsg = '❌ Product not found in database.';
      } else if (err.message?.includes('400')) {
        errorMsg = '❌ ' + err.message;
      } else {
        errorMsg = err.message || 'Failed to submit feedback. Check console for details.';
      }
      
      setError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) {
      return
    }

    try {
      await feedbackAPI.deleteFeedback(feedbackId)
      setSuccess('Feedback deleted successfully!')
      setTimeout(() => {
        fetchFeedback()
        setSuccess(null)
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to delete feedback')
    }
  }

  const renderStars = (rating, interactive = false) => {
    return (
      <div className={`stars ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= (hoveredRating || rating) ? 'filled' : ''}`}
            onClick={() => interactive && setUserRating(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="feedback-section">
        <div className="loading">Loading feedback...</div>
      </div>
    )
  }

  return (
    <div className="feedback-section">
      {/* Feedback Summary */}
      <div className="feedback-summary">
        <h3 className="feedback-title">Customer Feedback & Reviews</h3>

        {totalReviews > 0 ? (
          <div className="rating-stats">
            <div className="average-rating">
              <div className="rating-number">{averageRating}</div>
              <div className="rating-info">
                {renderStars(parseFloat(averageRating))}
                <div className="review-count">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-feedback">
            <p>No feedback yet. Be the first to review this product!</p>
          </div>
        )}
      </div>

      {/* Submit Feedback Form */}
      {isLoggedIn ? (
        <div className="feedback-form-container">
          <h4>Share Your Feedback</h4>
          <form onSubmit={handleSubmitFeedback} className="feedback-form">
            {error && <div className="feedback-error">{error}</div>}
            {success && <div className="feedback-success">{success}</div>}

            <div className="form-group">
              <label>Your Rating *</label>
              <div className="rating-input">{renderStars(userRating, true)}</div>
              {userRating > 0 && <p className="rating-label">You selected {userRating} star{userRating > 1 ? 's' : ''}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="review-text">Your Review</label>
              <textarea
                id="review-text"
                placeholder="Share your experience with this product (optional)"
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                maxLength={500}
                className="review-textarea"
              />
              <div className="char-count">{userReview.length}/500</div>
            </div>

            <button type="submit" disabled={submitting} className="btn-submit-feedback">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      ) : (
        <div className="feedback-login-prompt">
          <p>Please log in to submit feedback</p>
        </div>
      )}

      {/* Feedback List */}
      {feedback.length > 0 && (
        <div className="feedback-list">
          <h4>Reviews ({feedback.length})</h4>
          {feedback.map((item) => (
            <div key={item.id} className="feedback-item">
              <div className="feedback-header">
                <div className="feedback-user-info">
                  <div className="user-name">{item.userName || 'Anonymous'}</div>
                  <div className="feedback-date">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="feedback-rating">{renderStars(item.rating)}</div>
              </div>

              {item.reviewText && <p className="feedback-text">{item.reviewText}</p>}

              {/* Delete button only shows for own feedback (check if user is logged in and name matches) */}
              {isLoggedIn && userName === item.userName && (
                <button
                  className="btn-delete-feedback"
                  onClick={() => handleDeleteFeedback(item.id)}
                  title="Delete this feedback"
                >
                  <i className="fas fa-trash"></i> Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductFeedback
