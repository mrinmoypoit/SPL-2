import React, { useState, useEffect } from 'react'
import './ProductFilter.css'

function ProductFilter({ products, onFilterChange, activeFilters, isHighlighted = false }) {
  const [filters, setFilters] = useState({
    searchTerm: '',
    minRating: 0,
    maxFee: null,
    minReward: null,
    company: '',
  })

  useEffect(() => {
    if (!activeFilters) return
    setFilters(prev => ({ ...prev, ...activeFilters }))
  }, [activeFilters])

  // Get unique companies from products
  const uniqueCompanies = [...new Set(products.map(p => p.company || p.companyName || p.company_name).filter(Boolean))].sort()

  // Get max fee for slider
  const maxFeeValue = Math.max(
    ...products.map(p => {
      const feeKeys = Object.keys(p).filter(k => k.toLowerCase().includes('fee') || k.toLowerCase().includes('cost'))
      const values = feeKeys.map(k => {
        const val = String(p[k]).match(/[\d.]+/)
        return val ? parseFloat(val[0]) : 0
      })
      return Math.max(...values, 0)
    })
  )

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      searchTerm: '',
      minRating: 0,
      maxFee: null,
      minReward: null,
      company: '',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className={`product-filter-container ${isHighlighted ? 'product-filter-highlight' : ''}`}>
      <div className="filter-header">
        <h3 className="filter-title">
          <i className="fas fa-filter"></i> Filter Products
        </h3>
        {(filters.searchTerm || filters.minRating > 0 || filters.maxFee || filters.minReward || filters.company) && (
          <button className="filter-reset-btn" onClick={handleReset}>
            <i className="fas fa-redo"></i> Reset
          </button>
        )}
      </div>

      {isHighlighted && (
        <p className="filter-tip-note">Tip: Combine search, company, fee, and reward filters for a precise match.</p>
      )}

      <div className="filter-grid">
        {/* Search */}
        <div className="filter-group">
          <label className="filter-label">
            <i className="fas fa-search"></i> Search by Name
          </label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search products..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
        </div>

        {/* Company */}
        {uniqueCompanies.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">
              <i className="fas fa-building"></i> Bank/Company
            </label>
            <select
              className="filter-select"
              value={filters.company}
              onChange={(e) => handleFilterChange('company', e.target.value)}
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Rating */}
        <div className="filter-group">
          <label className="filter-label">
            <i className="fas fa-star"></i> Minimum Rating
          </label>
          <div className="filter-rating-slider">
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
              className="slider"
            />
            <span className="rating-value">{filters.minRating.toFixed(1)} ⭐</span>
          </div>
        </div>

        {/* Max Fee */}
        <div className="filter-group">
          <label className="filter-label">
            <i className="fas fa-money-bill"></i> Max Fee
          </label>
          <div className="filter-fee-input">
            <input
              type="number"
              className="filter-input"
              placeholder={`Up to ${Math.round(maxFeeValue)}`}
              value={filters.maxFee || ''}
              onChange={(e) => handleFilterChange('maxFee', e.target.value ? parseFloat(e.target.value) : null)}
            />
            {maxFeeValue > 0 && <span className="fee-unit">({Math.round(maxFeeValue)} max)</span>}
          </div>
        </div>

        {/* Min Reward */}
        <div className="filter-group">
          <label className="filter-label">
            <i className="fas fa-gift"></i> Min Rewards/Cashback
          </label>
          <input
            type="number"
            className="filter-input"
            placeholder="Minimum reward %"
            value={filters.minReward || ''}
            onChange={(e) => handleFilterChange('minReward', e.target.value ? parseFloat(e.target.value) : null)}
          />
        </div>
      </div>
    </div>
  )
}

export default ProductFilter
