import React, { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import './ProductComparisonModal.css'

const EXCLUDED_COMPARE_KEYS = new Set([
  'id',
  'productId',
  'product_id',
  'name',
  'company',
  'companyName',
  'company_name',
  'category',
  'subcategoryName',
  'subcategory_name'
])

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

const stringifySafely = (value) => {
  try {
    const seen = new WeakSet()
    return JSON.stringify(value, (key, nestedValue) => {
      if (typeof nestedValue === 'object' && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return '[Circular]'
        }
        seen.add(nestedValue)
      }
      return nestedValue
    })
  } catch {
    return '[Unserializable]'
  }
}

const CHART_COLOR_PAIRS = [
  ['rgba(0, 102, 204, 0.22)', 'rgba(0, 102, 204, 0.92)'],
  ['rgba(0, 212, 255, 0.2)', 'rgba(0, 212, 255, 0.92)'],
  ['rgba(76, 175, 80, 0.2)', 'rgba(56, 142, 60, 0.9)'],
  ['rgba(255, 152, 0, 0.24)', 'rgba(245, 124, 0, 0.9)'],
  ['rgba(233, 30, 99, 0.22)', 'rgba(194, 24, 91, 0.88)'],
  ['rgba(156, 39, 176, 0.2)', 'rgba(123, 31, 162, 0.9)']
]

const normalizeMetricKey = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const isFeeMetricKey = (value = '') => {
  const key = normalizeMetricKey(value)
  return (
    key.includes('fee') ||
    key.includes('cost') ||
    key.includes('charge') ||
    key.includes('apr') ||
    key.includes('interest') ||
    key.includes('premium')
  )
}

const isRewardMetricKey = (value = '') => {
  const key = normalizeMetricKey(value)
  return (
    key.includes('reward') ||
    key.includes('cashback') ||
    key.includes('benefit') ||
    key.includes('bonus') ||
    key.includes('point') ||
    key.includes('mile')
  )
}

const getBarGradient = (context, colorStart, colorEnd) => {
  const chart = context.chart
  const { ctx, chartArea } = chart

  if (!chartArea) {
    return colorEnd
  }

  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  return gradient
}

function ProductComparisonModal({ isOpen, products, onClose, onRemoveProduct }) {
  const [activeTab, setActiveTab] = useState('table')
  const feesChartRef = useRef(null)
  const rewardsChartRef = useRef(null)
  const ratingsChartRef = useRef(null)
  const feesChartInstance = useRef(null)
  const rewardsChartInstance = useRef(null)
  const ratingsChartInstance = useRef(null)

  const destroyCharts = () => {
    if (feesChartInstance.current) {
      feesChartInstance.current.destroy()
      feesChartInstance.current = null
    }
    if (rewardsChartInstance.current) {
      rewardsChartInstance.current.destroy()
      rewardsChartInstance.current = null
    }
    if (ratingsChartInstance.current) {
      ratingsChartInstance.current.destroy()
      ratingsChartInstance.current = null
    }
  }

  const normalizedProducts = useMemo(
    () => (Array.isArray(products) ? products.filter((product) => product && typeof product === 'object') : []),
    [products]
  )

  // Get all unique keys from all products
  const allKeys = useMemo(() => {
    const keys = new Set()
    normalizedProducts.forEach((product) => {
      Object.keys(product).forEach((key) => {
        if (!EXCLUDED_COMPARE_KEYS.has(key)) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys).sort()
  }, [normalizedProducts])

  const productMetricMaps = useMemo(
    () =>
      normalizedProducts.map((product) => {
        const metricMap = {}
        const setMetricValue = (key, rawValue) => {
          if (!key || rawValue === null || rawValue === undefined || rawValue === '') {
            return
          }

          const normalizedKey = normalizeMetricKey(key)
          if (!normalizedKey) {
            return
          }

          const existing = metricMap[normalizedKey]
          if (existing) {
            metricMap[normalizedKey] = { ...existing, value: rawValue }
            return
          }

          metricMap[normalizedKey] = {
            label: formatKeyLabel(key),
            value: rawValue
          }
        }

        setMetricValue('rating', product.rating)

        const parsedMetrics = parseStructuredValue(product.metrics)
        if (parsedMetrics && typeof parsedMetrics === 'object' && !Array.isArray(parsedMetrics)) {
          Object.entries(parsedMetrics).forEach(([key, value]) => setMetricValue(key, value))
        }

        const parsedDetails = parseStructuredValue(product.details)
        if (parsedDetails && typeof parsedDetails === 'object' && !Array.isArray(parsedDetails)) {
          Object.entries(parsedDetails).forEach(([key, value]) => setMetricValue(key, value))
        }

        const parsedAttributes = parseStructuredValue(product.attributes)
        if (Array.isArray(parsedAttributes)) {
          parsedAttributes.forEach((item) => {
            if (!item || typeof item !== 'object') {
              return
            }

            const attributeName = item.attribute_name || item.name
            const attributeValue = item.attribute_value ?? item.value
            setMetricValue(attributeName, attributeValue)
          })
        }

        return metricMap
      }),
    [normalizedProducts]
  )

  const getMetricLabel = (metricKey) => {
    for (const metricMap of productMetricMaps) {
      if (metricMap[metricKey]?.label) {
        return metricMap[metricKey].label
      }
    }

    return formatKeyLabel(metricKey)
  }

  const feeMetricKeys = useMemo(() => {
    const keys = new Set()
    productMetricMaps.forEach((metricMap) => {
      Object.keys(metricMap).forEach((key) => {
        if (isFeeMetricKey(key)) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys)
  }, [productMetricMaps])

  const rewardMetricKeys = useMemo(() => {
    const keys = new Set()
    productMetricMaps.forEach((metricMap) => {
      Object.keys(metricMap).forEach((key) => {
        if (key !== 'rating' && isRewardMetricKey(key)) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys)
  }, [productMetricMaps])

  const getCompanyName = (product) => {
    return product.company || product.companyName || product.company_name || 'N/A'
  }

  const getCategory = (product) => {
    return product.category || product.subcategoryName || product.subcategory_name || 'Uncategorized'
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-'

    const parsedValue = parseStructuredValue(value)

    if (Array.isArray(parsedValue)) {
      if (parsedValue.length === 0) {
        return '-'
      }

      const formattedItems = parsedValue.map((item) => {
        if (item && typeof item === 'object') {
          const attributeName = item.attribute_name || item.name
          const attributeValue = item.attribute_value ?? item.value

          if (attributeName && attributeValue !== undefined && attributeValue !== null && attributeValue !== '') {
            return `${formatKeyLabel(attributeName)}: ${attributeValue}`
          }

          return stringifySafely(item)
        }

        return String(item)
      })

      return formattedItems.join(', ')
    }

    if (typeof parsedValue === 'object') {
      const entries = Object.entries(parsedValue)
      if (entries.length > 0) {
        return entries
          .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== '')
          .map(([nestedKey, nestedValue]) => `${formatKeyLabel(nestedKey)}: ${nestedValue}`)
          .join(', ')
      }

      return stringifySafely(parsedValue)
    }

    return String(parsedValue)
  }

  // Extract numeric value from strings like "9.5%" or "500000"
  function extractNumeric(value) {
    if (value === null || value === undefined || value === '') return 0
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          const attributeValue = item?.attribute_value ?? item?.value ?? item
          const numericValue = extractNumeric(attributeValue)
          if (numericValue > 0) {
            return numericValue
          }
        }
        return 0
      }

      const priorityKeys = ['rating', 'annual_fee', 'annualFee', 'fee', 'cost', 'rate', 'value', 'amount', 'customers']
      for (const key of priorityKeys) {
        if (value[key] !== undefined && value[key] !== null && value[key] !== '') {
          const numericValue = extractNumeric(value[key])
          if (numericValue > 0) {
            return numericValue
          }
        }
      }
    }

    const str = String(value)
    const match = str.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : 0
  }

  const averageRating = useMemo(() => {
    const ratingValues = normalizedProducts
      .map((product) => extractNumeric(product.rating))
      .filter((rating) => rating > 0)

    if (ratingValues.length === 0) {
      return 'N/A'
    }

    const total = ratingValues.reduce((sum, rating) => sum + rating, 0)
    return (total / ratingValues.length).toFixed(1)
  }, [normalizedProducts])

  // Create Fees Chart
  useEffect(() => {
    if (!isOpen || activeTab !== 'charts' || normalizedProducts.length === 0 || !feesChartRef.current) return

    if (feeMetricKeys.length === 0) {
      if (feesChartInstance.current) {
        feesChartInstance.current.destroy()
        feesChartInstance.current = null
      }
      return
    }

    try {
      const ctx = feesChartRef.current.getContext('2d')
      if (feesChartInstance.current) {
        feesChartInstance.current.destroy()
      }

      const datasets = feeMetricKeys.map((key, idx) => {
        const [colorStart, colorEnd] = CHART_COLOR_PAIRS[idx % CHART_COLOR_PAIRS.length]

        return {
          label: getMetricLabel(key),
          data: productMetricMaps.map((metricMap) => extractNumeric(parseStructuredValue(metricMap[key]?.value))),
          backgroundColor: (context) => getBarGradient(context, colorStart, colorEnd),
          borderColor: colorEnd,
          borderWidth: 1,
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 38
        }
      })

      feesChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: normalizedProducts.map((p) => p.name),
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            title: {
              display: false
            },
            legend: {
              position: 'bottom',
              labels: {
                color: '#273449',
                boxWidth: 14,
                boxHeight: 14,
                useBorderRadius: true,
                borderRadius: 4,
                font: {
                  size: 11,
                  weight: '600'
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(18, 24, 35, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#d9e2ff',
              borderColor: 'rgba(88, 158, 255, 0.45)',
              borderWidth: 1,
              displayColors: true
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.12)',
                drawBorder: false
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.18)',
                drawBorder: false
              },
              title: {
                display: true,
                text: 'Value',
                color: '#1e293b',
                font: {
                  size: 12,
                  weight: '700'
                }
              },
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating fees chart:', error)
    }
  }, [activeTab, isOpen, normalizedProducts, feeMetricKeys, productMetricMaps])

  // Create Rewards/Benefits Chart
  useEffect(() => {
    if (!isOpen || activeTab !== 'charts' || normalizedProducts.length === 0 || !rewardsChartRef.current) return

    if (rewardMetricKeys.length === 0) {
      if (rewardsChartInstance.current) {
        rewardsChartInstance.current.destroy()
        rewardsChartInstance.current = null
      }
      return
    }

    try {
      const ctx = rewardsChartRef.current.getContext('2d')
      if (rewardsChartInstance.current) {
        rewardsChartInstance.current.destroy()
      }

      const datasets = rewardMetricKeys.slice(0, 3).map((key, idx) => {
        const [colorStart, colorEnd] = CHART_COLOR_PAIRS[(idx + 2) % CHART_COLOR_PAIRS.length]

        return {
          label: getMetricLabel(key),
          data: productMetricMaps.map((metricMap) => extractNumeric(parseStructuredValue(metricMap[key]?.value))),
          backgroundColor: (context) => getBarGradient(context, colorStart, colorEnd),
          borderColor: colorEnd,
          borderWidth: 1,
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 38
        }
      })

      rewardsChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: normalizedProducts.map((p) => p.name),
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            title: {
              display: false
            },
            legend: {
              position: 'bottom',
              labels: {
                color: '#273449',
                boxWidth: 14,
                boxHeight: 14,
                useBorderRadius: true,
                borderRadius: 4,
                font: {
                  size: 11,
                  weight: '600'
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(18, 24, 35, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#d9e2ff',
              borderColor: 'rgba(88, 158, 255, 0.45)',
              borderWidth: 1,
              displayColors: true
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.12)',
                drawBorder: false
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.18)',
                drawBorder: false
              },
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating rewards chart:', error)
    }
  }, [activeTab, isOpen, normalizedProducts, rewardMetricKeys, productMetricMaps])

  // Create Ratings Chart
  useEffect(() => {
    if (!isOpen || activeTab !== 'charts' || normalizedProducts.length === 0 || !ratingsChartRef.current) return

    try {
      const ctx = ratingsChartRef.current.getContext('2d')
      if (ratingsChartInstance.current) {
        ratingsChartInstance.current.destroy()
      }

      ratingsChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: normalizedProducts.map((p) => p.name),
          datasets: [
            {
              label: 'Rating (out of 5)',
              data: normalizedProducts.map((p) => extractNumeric(p.rating) || 4),
              backgroundColor: (context) => getBarGradient(context, 'rgba(33, 150, 243, 0.2)', 'rgba(33, 150, 243, 0.95)'),
              borderColor: 'rgba(21, 101, 192, 0.95)',
              borderWidth: 1,
              borderRadius: 10,
              borderSkipped: false,
              maxBarThickness: 38
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: 'rgba(18, 24, 35, 0.95)',
              titleColor: '#ffffff',
              bodyColor: '#d9e2ff',
              borderColor: 'rgba(88, 158, 255, 0.45)',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 5,
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.18)',
                drawBorder: false
              }
            },
            y: {
              ticks: {
                color: '#334155',
                font: {
                  size: 11,
                  weight: '600'
                }
              },
              grid: {
                color: 'rgba(86, 105, 133, 0.08)',
                drawBorder: false
              }
            },
          },
        },
      })
    } catch (error) {
      console.error('Error creating ratings chart:', error)
    }
  }, [activeTab, isOpen, normalizedProducts])

  useEffect(() => {
    if (!isOpen) {
      destroyCharts()
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      destroyCharts()
    }
  }, [])

  if (!isOpen || normalizedProducts.length === 0) return null

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
              {normalizedProducts.length < 2 && (
                <div className="comparison-message">
                  <i className="fas fa-info-circle"></i>
                  <p>Select at least 2 products to compare</p>
                </div>
              )}

              {normalizedProducts.length >= 2 && (
                <div className="comparison-table-wrapper">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th className="attribute-col">Attribute</th>
                        {normalizedProducts.map((product, index) => (
                          <th key={product.id || product.productId || product.product_id || `${product.name || 'product'}-${index}`} className="product-col">
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
                        {normalizedProducts.map((product, index) => (
                          <td key={product.id || product.productId || product.product_id || `${product.name || 'product'}-category-${index}`}>
                            <span className="category-badge">{getCategory(product)}</span>
                          </td>
                        ))}
                      </tr>

                      {allKeys.map((key) => (
                        <tr key={key}>
                          <td className="attribute-col">
                            {formatKeyLabel(key)}
                          </td>
                          {normalizedProducts.map((product, index) => (
                            <td key={product.id || product.productId || product.product_id || `${product.name || 'product'}-${key}-${index}`} className="value-cell">
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
            <div className="charts-panel">
              <div className="charts-summary">
                <div className="summary-chip">
                  <span className="summary-chip-label">Products</span>
                  <span className="summary-chip-value">{normalizedProducts.length}</span>
                </div>
                <div className="summary-chip">
                  <span className="summary-chip-label">Fee Metrics</span>
                  <span className="summary-chip-value">{feeMetricKeys.length}</span>
                </div>
                <div className="summary-chip">
                  <span className="summary-chip-label">Reward Metrics</span>
                  <span className="summary-chip-value">{rewardMetricKeys.length}</span>
                </div>
                <div className="summary-chip">
                  <span className="summary-chip-label">Avg Rating</span>
                  <span className="summary-chip-value">{averageRating}</span>
                </div>
              </div>

              <div className="charts-container">
                <section className="chart-wrapper">
                  <div className="chart-head">
                    <h4 className="chart-title">Fee Snapshot</h4>
                    <span className="chart-meta">
                      {feeMetricKeys.length > 0 ? `${feeMetricKeys.length} metrics` : 'No fee metrics'}
                    </span>
                  </div>
                  {feeMetricKeys.length === 0 ? (
                    <div className="chart-empty-state">No fee-related values were found for these products.</div>
                  ) : (
                    <canvas ref={feesChartRef}></canvas>
                  )}
                </section>

                <section className="chart-wrapper">
                  <div className="chart-head">
                    <h4 className="chart-title">Rewards Snapshot</h4>
                    <span className="chart-meta">
                      {rewardMetricKeys.length > 0 ? `${rewardMetricKeys.length} metrics` : 'No reward metrics'}
                    </span>
                  </div>
                  {rewardMetricKeys.length === 0 ? (
                    <div className="chart-empty-state">No reward-related values were found for these products.</div>
                  ) : (
                    <canvas ref={rewardsChartRef}></canvas>
                  )}
                </section>

                <section className="chart-wrapper chart-wrapper-horizontal">
                  <div className="chart-head">
                    <h4 className="chart-title">Ratings</h4>
                    <span className="chart-meta">Out of 5</span>
                  </div>
                  <canvas ref={ratingsChartRef}></canvas>
                </section>
              </div>
            </div>
          )}
        </div>

        <div className="comparison-footer">
          <p className="comparison-count">
            {normalizedProducts.length} {normalizedProducts.length === 1 ? 'product' : 'products'} selected
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
