import React from 'react'
import './ProductDetailsModal.css'

function ProductDetailsModal({ isOpen, product, onClose }) {
  if (!isOpen || !product) return null

  const {
    id,
    name,
    company,
    companyName,
    company_name,
    description,
    category,
    subcategoryName,
    subcategory_name,
    parentCategory,
    parent_category,
    rating,
    features,
    ...otherDetails
  } = product

  const displayCompany = company || companyName || company_name || 'N/A'
  const displayCategory = category || subcategoryName || subcategory_name || 'Uncategorized'
  const displayParentCategory = parentCategory || parent_category

  return (
    <div className="product-details-overlay" onClick={onClose}>
      <div className="product-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">{name}</h2>
            <span className="modal-category-badge">{displayCategory}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-content">
          {/* Basic Info */}
          <section className="details-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Product Name</span>
                <span className="info-value">{name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Company/Bank</span>
                <span className="info-value">{displayCompany}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value">{displayCategory}</span>
              </div>
              {displayParentCategory && (
                <div className="info-item">
                  <span className="info-label">Main Category</span>
                  <span className="info-value">{displayParentCategory}</span>
                </div>
              )}
              {rating && (
                <div className="info-item">
                  <span className="info-label">Rating</span>
                  <span className="info-value rating-value">
                    {rating} <i className="fas fa-star"></i>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Description */}
          {description && (
            <section className="details-section">
              <h3 className="section-title">Description</h3>
              <p className="description-text">{description}</p>
            </section>
          )}

          {/* Features */}
          {features && Array.isArray(features) && features.length > 0 && (
            <section className="details-section">
              <h3 className="section-title">Key Features</h3>
              <div className="features-list">
                {features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <i className="fas fa-check-circle"></i>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Additional Details */}
          {Object.keys(otherDetails).length > 0 && (
            <section className="details-section">
              <h3 className="section-title">Additional Details</h3>
              <div className="additional-details">
                {Object.entries(otherDetails)
                  .filter(([key, value]) => value && key !== 'productId' && key !== 'product_id')
                  .map(([key, value]) => (
                    <div key={key} className="detail-row">
                      <span className="detail-key">
                        {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="detail-value">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailsModal
