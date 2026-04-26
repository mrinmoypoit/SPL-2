import React, { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import './ProductComparisonModal.css'

function ProductComparisonModal({ isOpen, products, onClose, onRemoveProduct }) {
  const [activeTab, setActiveTab] = useState('table')
  const feesChartRef = useRef(null)
  const rewardsChartRef = useRef(null)
  const ratingsChartRef = useRef(null)
  const feesChartInstance = useRef(null)
  const rewardsChartInstance = useRef(null)
  const ratingsChartInstance = useRef(null)

  if (!isOpen || !products || products.length === 0) return null

  // Get all unique keys from all products
  const getAllKeys = () => {
    const keys = new Set()
    products.forEach((product) => {
      Object.keys(product).forEach((key) => {
        if (key !== 'id' && key !== 'productId' && key !== 'product_id') {
          keys.add(key)
        }
      })
    })
    return Array.from(keys).sort()
  }

  const allKeys = getAllKeys()

  const getCompanyName = (product) => {
    return product.company || product.companyName || product.company_name || 'N/A'
  }

  const getCategory = (product) => {
    return product.category || product.subcategoryName || product.subcategory_name || 'Uncategorized'
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-'
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '-'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  // Extract numeric value from strings like "9.5%" or "500000"
  const extractNumeric = (value) => {
    if (!value) return 0
    const str = String(value)
    const match = str.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : 0
  }

  // Create Fees Chart
  useEffect(() => {
    if (activeTab !== 'charts' || !feesChartRef.current) return

    const feeKeys = allKeys.filter(
      (key) =>
        key.toLowerCase().includes('fee') ||
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('charge')
    )

    if (feeKeys.length === 0) return

    try {
      const ctx = feesChartRef.current.getContext('2d')
      if (feesChartInstance.current) {
        feesChartInstance.current.destroy()
      }

      const datasets = feeKeys.map((key, idx) => ({
        label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        data: products.map((p) => extractNumeric(p[key])),
        backgroundColor: [`#0066cc`, `#00d4ff`, `#4caf50`, `#ff9800`, `#f44336`][idx % 5],
      }))

      feesChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: products.map((p) => p.name),
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: 'Fees Comparison',
              font: { size: 16, weight: 'bold' },
              color: '#333',
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Amount',
              },
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating fees chart:', error)
    }
  }, [activeTab, products, allKeys])

  // Create Rewards/Benefits Chart
  useEffect(() => {
    if (activeTab !== 'charts' || !rewardsChartRef.current) return

    const rewardKeys = allKeys.filter(
      (key) =>
        key.toLowerCase().includes('reward') ||
        key.toLowerCase().includes('cashback') ||
        key.toLowerCase().includes('benefit') ||
        key.toLowerCase().includes('rate')
    )

    if (rewardKeys.length === 0) return

    try {
      const ctx = rewardsChartRef.current.getContext('2d')
      if (rewardsChartInstance.current) {
        rewardsChartInstance.current.destroy()
      }

      const datasets = rewardKeys.slice(0, 2).map((key, idx) => ({
        label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        data: products.map((p) => extractNumeric(p[key])),
        backgroundColor: ['#ff9800', '#4caf50'][idx % 2],
      }))

      rewardsChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: products.map((p) => p.name),
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: 'Rewards & Cashback',
              font: { size: 16, weight: 'bold' },
              color: '#333',
            },
            legend: {
              position: 'bottom',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating rewards chart:', error)
    }
  }, [activeTab, products, allKeys])

  // Create Ratings Chart
  useEffect(() => {
    if (activeTab !== 'charts' || !ratingsChartRef.current) return

    try {
      const ctx = ratingsChartRef.current.getContext('2d')
      if (ratingsChartInstance.current) {
        ratingsChartInstance.current.destroy()
      }

      ratingsChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: products.map((p) => p.name),
          datasets: [
            {
              label: 'Rating (out of 5)',
              data: products.map((p) => extractNumeric(p.rating) || 4),
              backgroundColor: '#0066cc',
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: 'Product Ratings',
              font: { size: 16, weight: 'bold' },
              color: '#333',
            },
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 5,
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating ratings chart:', error)
    }
  }, [activeTab, products])

  return (
    <div className="comparison-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-header">
          <h2 className="comparison-title">
            <i className="fas fa-chart-bar"></i> Compare Products
          </h2>
          <button className="comparison-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="comparison-tabs">
          <button
            className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <i className="fas fa-table"></i> Table View
          </button>
          <button
            className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <i className="fas fa-chart-line"></i> Charts
          </button>
        </div>

        <div className="comparison-content">
          {/* Table View */}
          {activeTab === 'table' && (
            <>
              {products.length < 2 && (
                <div className="comparison-message">
                  <i className="fas fa-info-circle"></i>
                  <p>Select at least 2 products to compare</p>
                </div>
              )}

              {products.length >= 2 && (
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th className="attribute-col">Attribute</th>
                        {products.map((product) => (
                          <th key={product.id || product.productId || product.product_id} className="product-col">
                            <div className="product-col-header">
                              <div className="product-col-info">
                                <div className="col-product-name">{product.name}</div>
                                <div className="col-company">{getCompanyName(product)}</div>
                              </div>
                              <button
                                className="remove-product-btn"
                                onClick={() => onRemoveProduct(product.id || product.productId || product.product_id)}
                                title="Remove from comparison"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="attribute-col">Category</td>
                        {products.map((product) => (
                          <td key={product.id || product.productId || product.product_id}>
                            <span className="category-badge">{getCategory(product)}</span>
                          </td>
                        ))}
                      </tr>

                      {allKeys.map((key) => (
                        <tr key={key}>
                          <td className="attribute-col">
                            {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          {products.map((product) => (
                            <td key={product.id || product.productId || product.product_id} className="value-cell">
                              {formatValue(product[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Charts View */}
          {activeTab === 'charts' && (
            <div className="charts-container">
              <div className="chart-wrapper">
                <canvas ref={feesChartRef}></canvas>
              </div>
              <div className="chart-wrapper">
                <canvas ref={rewardsChartRef}></canvas>
              </div>
              <div className="chart-wrapper chart-wrapper-horizontal">
                <canvas ref={ratingsChartRef}></canvas>
              </div>
            </div>
          )}
        </div>

        <div className="comparison-footer">
          <p className="comparison-count">
            {products.length} {products.length === 1 ? 'product' : 'products'} selected
          </p>
          <button className="btn-close-comparison" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductComparisonModal
