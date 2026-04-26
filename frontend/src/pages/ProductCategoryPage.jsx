import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
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

function ProductCategoryPage({ title, subtitle, aliases = [] }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  const normalizedAliasSet = useMemo(() => {
    const normalized = aliases.map(normalizeText).filter(Boolean)
    return new Set(normalized)
  }, [aliases])

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

  return (
    <div className="bank-services-page">
      <Navbar />

      <div className="services-container">
        <div className="services-header category-services-header">
          <h1 className="services-title">{title}</h1>
          <p className="services-subtitle">{subtitle}</p>

          <div className="category-toolbar">
            <div className="category-count-badge">{products.length} products</div>
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

        <section className="bank-products">
          {loading ? (
            <div className="bank-products-state">Loading products…</div>
          ) : error ? (
            <div className="bank-products-state bank-products-error">{error}</div>
          ) : products.length > 0 ? (
            <div className="bank-products-grid">
              {products.map((product) => {
                const productId = product.id ?? product.productId ?? product.product_id
                const categoryName = product.category || product.subcategory_name || product.subcategoryName || 'Uncategorized'
                const parentCategory = product.parent_category || product.parentCategory
                const features = Array.isArray(product.features) ? product.features.slice(0, 4) : []

                return (
                  <article key={productId} className="bank-product-card">
                    <div className="bank-product-top">
                      <h3 className="bank-product-name">{product.name}</h3>
                      <span className="bank-product-category">{categoryName}</span>
                    </div>

                    <div className="bank-product-meta">
                      <span className="bank-product-company">{product.company || product.companyName || product.company_name || 'N/A'}</span>
                      {product.rating ? <span className="bank-product-rating">Rating: {product.rating}</span> : <span className="bank-product-rating">ID: {productId}</span>}
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
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="bank-products-state">No products found for this category yet.</div>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProductCategoryPage