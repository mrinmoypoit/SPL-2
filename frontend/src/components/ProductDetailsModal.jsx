import React, { useContext } from 'react'
import './ProductDetailsModal.css'
import ProductFeedback from './ProductFeedback'
import { AuthContext } from '../context/AuthContext'

const formatKeyLabel = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()

const parseStructuredValue = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return value
  }

  if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
    try {
      return JSON.parse(trimmedValue)
    } catch {
      return value
    }
  }

  return value
}

const formatPrimitiveValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

const renderStructuredDetails = (value, keyPrefix = '') => {
  if (Array.isArray(value)) {
    const attributeRows = value
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const attributeName = item.attribute_name || item.name
          const attributeValue = item.attribute_value ?? item.value

          if (attributeName && attributeValue !== undefined && attributeValue !== null && attributeValue !== '') {
            return {
              id: `${keyPrefix}-${attributeName}-${index}`,
              label: formatKeyLabel(attributeName),
              value: formatPrimitiveValue(attributeValue)
            }
          }
        }

        if (item === null || item === undefined || item === '') {
          return null
        }

        return {
          id: `${keyPrefix}-${index}`,
          label: `Item ${index + 1}`,
          value: formatPrimitiveValue(item)
        }
      })
      .filter(Boolean)

    if (attributeRows.length > 0) {
      return (
        <div className="detail-list">
          {attributeRows.map((row) => (
            <div key={row.id} className="detail-list-item">
              <span className="detail-sub-key">{row.label}:</span> {row.value}
            </div>
          ))}
        </div>
      )
    }
  }

  if (value && typeof value === 'object') {
    const objectRows = Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== '')
      .map(([nestedKey, nestedValue]) => ({
        id: `${keyPrefix}-${nestedKey}`,
        label: formatKeyLabel(nestedKey),
        value: formatPrimitiveValue(nestedValue)
      }))

    if (objectRows.length > 0) {
      return (
        <div className="detail-list">
          {objectRows.map((row) => (
            <div key={row.id} className="detail-list-item">
              <span className="detail-sub-key">{row.label}:</span> {row.value}
            </div>
          ))}
        </div>
      )
    }
  }

  return null
}

function ProductDetailsModal({ isOpen, product, onClose }) {
  const { user } = useContext(AuthContext)
  
  if (!isOpen || !product) return null

  const {
    id,
    product_id,
    productId: productIdFromDestructure,
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

  // Use id, product_id, or productId - whichever is available
  const productId = id || product_id || productIdFromDestructure
  
  console.log('🔍 ProductDetailsModal Debug:', {
    id,
    product_id,
    productId,
    userName: user?.name,
    isLoggedIn: !!user
  });

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
                  .filter(
                    ([key, value]) =>
                      value !== null &&
                      value !== undefined &&
                      value !== '' &&
                      key !== 'productId' &&
                      key !== 'product_id' &&
                      key !== 'average_rating' &&
                      key !== 'rating_count' &&
                      key !== 'ratingCount'
                  )
                  .map(([key, value]) => {
                    const parsedValue = parseStructuredValue(value)
                    const formattedStructuredValue = renderStructuredDetails(parsedValue, key)

                    return (
                      <div key={key} className="detail-row">
                        <span className="detail-key">{formatKeyLabel(key)}</span>
                        <span className="detail-value">
                          {formattedStructuredValue || formatPrimitiveValue(parsedValue)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Feedback Section */}
          <ProductFeedback 
            productId={productId} 
            isLoggedIn={!!user}
            userName={user?.name || ''}
          />
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
