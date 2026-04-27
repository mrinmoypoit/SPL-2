import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ProductDetailsModal from '../components/ProductDetailsModal'
import ProductComparisonModal from '../components/ProductComparisonModal'
import ProductFilter from '../components/ProductFilter'
import { productsAPI } from '../services/api'
import './BankServicesPage.css'

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const getProductCategoryValues = (product) => [
  product?.category,
  product?.subcategory_name,
  product?.subcategoryName,
  product?.parent_category,
  product?.parentCategory
]

const isMatchingCategory = (product, aliasSet) => {
  const categoryValues = getProductCategoryValues(product)
    .map(normalizeText)
    .filter(Boolean)

  if (categoryValues.length === 0) {
    return false
  }

  for (const value of categoryValues) {
    if (aliasSet.has(value)) {
      return true
    }

    for (const alias of aliasSet) {
      if (value.includes(alias) || alias.includes(value)) {
        return true
      }
    }
  }

  return false
}

const resolveWebsiteUrl = (product) => {
  const rawUrl =
    product?.website_url ||
    product?.websiteUrl ||
    product?.company_website ||
    product?.companyWebsite ||
    ''

  const trimmedUrl = String(rawUrl || '').trim()
  if (!trimmedUrl) {
    return ''
  }

  const candidateUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`

  try {
    const parsedUrl = new URL(candidateUrl)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return ''
    }
    return parsedUrl.toString()
  } catch {
    return ''
  }
}

function ProductCategoryPage({ title, subtitle, aliases = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [comparisonProducts, setComparisonProducts] = useState([])
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [autoOpenedProductId, setAutoOpenedProductId] = useState(null)
  const [filters, setFilters] = useState({
    searchTerm: '',
    minRating: 0,
    maxFee: null,
    minReward: null,
    company: '',
  })

  const normalizedAliasSet = useMemo(() => {
    const normalized = aliases.map(normalizeText).filter(Boolean)
    return new Set(normalized)
  }, [aliases])

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const shouldHighlightFilter = searchParams.get('highlightFilter') === '1'
  const highlightedProductParam = searchParams.get('highlightProduct')

  // Apply filters to products
  const applyFilters = useCallback(() => {
    let result = [...products]

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(searchLower)) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          ((p.company || p.companyName || p.company_name) && (p.company || p.companyName || p.company_name).toLowerCase().includes(searchLower))
      )
    }

    // Company filter
    if (filters.company) {
      result = result.filter(
        (p) => (p.company || p.companyName || p.company_name) === filters.company
      )
    }

    // Rating filter
    if (filters.minRating > 0) {
      result = result.filter((p) => {
        const rating = parseFloat(p.rating) || 0
        return rating >= filters.minRating
      })
    }

    // Max fee filter
    if (filters.maxFee !== null && filters.maxFee !== undefined && filters.maxFee !== '') {
      result = result.filter((p) => {
        const feeKeys = Object.keys(p).filter(
          (k) => k.toLowerCase().includes('fee') || k.toLowerCase().includes('cost')
        )
        const fees = feeKeys.map((k) => {
          const match = String(p[k]).match(/[\d.]+/)
          return match ? parseFloat(match[0]) : 0
        })
        const minFee = Math.min(...fees, Infinity)
        return minFee <= filters.maxFee
      })
    }

    // Min reward filter
    if (filters.minReward !== null && filters.minReward !== undefined && filters.minReward !== '') {
      result = result.filter((p) => {
        const rewardKeys = Object.keys(p).filter(
          (k) =>
            k.toLowerCase().includes('reward') ||
            k.toLowerCase().includes('cashback') ||
            k.toLowerCase().includes('rate') ||
            k.toLowerCase().includes('bonus')
        )
        const rewards = rewardKeys.map((k) => {
          const match = String(p[k]).match(/[\d.]+/)
          return match ? parseFloat(match[0]) : 0
        })
        const maxReward = Math.max(...rewards, 0)
        return maxReward >= filters.minReward
      })
    }

    setFilteredProducts(result)
  }, [products, filters])

  // Apply filters whenever products or filters change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const handleShowDetails = (product) => {
    setSelectedProduct(product)
    setShowDetailsModal(true)
  }

  const handleCloseDetails = () => {
    setShowDetailsModal(false)
    setSelectedProduct(null)
  }

  const handleAddToComparison = (product) => {
    const productId = product.id ?? product.productId ?? product.product_id
    const isAlreadySelected = comparisonProducts.some(
      (p) => (p.id ?? p.productId ?? p.product_id) === productId
    )

    if (!isAlreadySelected) {
      setComparisonProducts([...comparisonProducts, product])
    }
  }

  const handleRemoveFromComparison = (productId) => {
    setComparisonProducts(
      comparisonProducts.filter(
        (p) => (p.id ?? p.productId ?? p.product_id) !== productId
      )
    )
  }

  const handleShowComparison = () => {
    setShowComparisonModal(true)
  }

  const handleCloseComparison = () => {
    setShowComparisonModal(false)
  }

  const handleApply = (product) => {
    const websiteUrl = resolveWebsiteUrl(product)
    if (!websiteUrl) {
      return
    }

    window.open(websiteUrl, '_blank', 'noopener,noreferrer')
  }

  const loadProducts = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        setError(null)

        const data = await productsAPI.getAll({ category: 'all', limit: 500, offset: 0 })
        const allProducts = data?.products || []
        const filteredProducts = allProducts
          .filter((product) => isMatchingCategory(product, normalizedAliasSet))
          .sort((first, second) => String(first.name || '').localeCompare(String(second.name || '')))

        setProducts(filteredProducts)
        setLastSyncedAt(new Date())
      } catch (loadError) {
        setError(loadError?.message || `Failed to load ${title.toLowerCase()} products`)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [normalizedAliasSet, title]
  )

  useEffect(() => {
    loadProducts()

    const intervalId = window.setInterval(() => {
      loadProducts({ silent: true })
    }, 30000)

    const onWindowFocus = () => {
      loadProducts({ silent: true })
    }

    window.addEventListener('focus', onWindowFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [loadProducts])

  useEffect(() => {
    if (!highlightedProductParam || autoOpenedProductId === highlightedProductParam) {
      return
    }

    const productToOpen = products.find((product) => {
      const productId = String(product.id ?? product.productId ?? product.product_id)
      return productId === highlightedProductParam
    })

    if (!productToOpen) {
      return
    }

    setSelectedProduct(productToOpen)
    setShowDetailsModal(true)
    setAutoOpenedProductId(highlightedProductParam)
  }, [products, highlightedProductParam, autoOpenedProductId])

  return (
    <div className="bank-services-page">
      <Navbar />

      <div className="services-container">
        <div className="services-header category-services-header">
          <h1 className="services-title">{title}</h1>
          <p className="services-subtitle">{subtitle}</p>

          <div className="category-toolbar">
            <button
              className="category-refresh-btn"
              type="button"
              onClick={() => loadProducts({ silent: true })}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="service-explore-btn" type="button" onClick={() => navigate('/bank-services')}>
              <span>Back to Banking Services</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>

        {lastSyncedAt && <p className="category-last-sync">Last synced: {lastSyncedAt.toLocaleTimeString()}</p>}
        </div>

        {/* Products and Filter Layout */}
        <div className="products-layout-container">
          {/* Sticky Filter Sidebar */}
          {!loading && products.length > 0 && (
            <aside className="products-filter-sidebar">
              <ProductFilter
                products={products}
                onFilterChange={setFilters}
                activeFilters={filters}
                isHighlighted={shouldHighlightFilter}
              />
            </aside>
          )}

          {/* Products Section */}
          <section className="products-main-section">
            <div className="products-header">
              <div className="products-toolbar">
                <div className="products-result-info">
                  <span className="products-count">
                    {filteredProducts.length} of {products.length} products
                  </span>
                </div>
                {comparisonProducts.length > 0 && (
                  <button
                    className="category-compare-btn"
                    type="button"
                    onClick={handleShowComparison}
                  >
                    <i className="fas fa-chart-bar"></i>
                    Compare ({comparisonProducts.length})
                  </button>
                )}
              </div>
            </div>

            <section className="bank-products">
              {loading ? (
                <div className="bank-products-state">Loading products…</div>
              ) : error ? (
                <div className="bank-products-state bank-products-error">{error}</div>
              ) : products.length === 0 ? (
                <div className="bank-products-state">No products found for this category yet.</div>
              ) : filteredProducts.length === 0 ? (
                <div className="bank-products-state">
                  <i className="fas fa-filter"></i> No products match your filters. Try adjusting your criteria.
                </div>
              ) : (
                <div className="bank-products-grid">
                  {filteredProducts.map((product) => {
                    const productId = product.id ?? product.productId ?? product.product_id
                    const categoryName = product.category || product.subcategory_name || product.subcategoryName || 'Uncategorized'
                    const parentCategory = product.parent_category || product.parentCategory
                    const features = Array.isArray(product.features) ? product.features.slice(0, 4) : []
                    const websiteUrl = resolveWebsiteUrl(product)
                    const hasRating = product.rating !== null && product.rating !== undefined && product.rating !== ''

                    return (
                      <article key={productId} className="bank-product-card">
                        <div className="bank-product-top">
                          <h3 className="bank-product-name">{product.name}</h3>
                          <span className="bank-product-category">{categoryName}</span>
                        </div>

                        <div className="bank-product-meta">
                          <span className="bank-product-company">{product.company || product.companyName || product.company_name || 'N/A'}</span>
                          {hasRating ? (
                            <span className="bank-product-rating">Rating: {product.rating}</span>
                          ) : (
                            <span className="bank-product-rating">No ratings yet</span>
                          )}
                        </div>

                        {parentCategory && <p className="bank-product-parent">Main category: {parentCategory}</p>}

                        {product.description ? <p className="bank-product-desc">{product.description}</p> : <p className="bank-product-desc bank-product-desc-empty">No description provided.</p>}

                        {features.length > 0 && (
                          <div className="bank-product-features">
                            {features.map((feature) => (
                              <span key={`${productId}-${feature}`} className="bank-product-feature-tag">
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="bank-product-actions">
                          <button
                            className="btn-details"
                            type="button"
                            onClick={() => handleShowDetails(product)}
                            title="View all details"
                          >
                            <i className="fas fa-info-circle"></i>
                            Details
                          </button>
                          <button
                            className="btn-compare"
                            type="button"
                            onClick={() => handleAddToComparison(product)}
                            title="Add to comparison"
                          >
                            <i className="fas fa-check"></i>
                            Compare
                          </button>
                          <button
                            className="btn-apply"
                            type="button"
                            onClick={() => handleApply(product)}
                            title={websiteUrl ? 'Apply on bank website' : 'Bank website unavailable'}
                            disabled={!websiteUrl}
                          >
                            <i className="fas fa-external-link-alt"></i>
                            Apply
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </section>
        </div>

        {/* Product Details Modal */}
        <ProductDetailsModal
          isOpen={showDetailsModal}
          product={selectedProduct}
          onClose={handleCloseDetails}
        />

        {/* Product Comparison Modal */}
        <ProductComparisonModal
          isOpen={showComparisonModal}
          products={comparisonProducts}
          onClose={handleCloseComparison}
          onRemoveProduct={handleRemoveFromComparison}
        />
      </div>
    </div>
  )
}

export default ProductCategoryPage
