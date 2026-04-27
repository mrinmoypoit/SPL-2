const normalizeBaseUrl = (value = '') => {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

const UNIQUE_FALLBACK_BASES = ['http://localhost:3001/api', 'http://localhost:3000/api']

export const getApiBaseCandidates = () => {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_URL || '')

  if (configured) {
    return [configured]
  }

  if (import.meta.env.DEV) {
    return [...UNIQUE_FALLBACK_BASES]
  }

  return ['/api']
}

export const getApiBaseUrl = () => getApiBaseCandidates()[0]

export const buildApiUrl = (baseUrl, endpoint = '') => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }

  const normalizedBase = normalizeBaseUrl(baseUrl)
  const normalizedEndpoint = String(endpoint || '')

  if (!normalizedEndpoint) {
    return normalizedBase
  }

  if (!normalizedBase) {
    return normalizedEndpoint.startsWith('/') ? normalizedEndpoint : `/${normalizedEndpoint}`
  }

  return normalizedEndpoint.startsWith('/')
    ? `${normalizedBase}${normalizedEndpoint}`
    : `${normalizedBase}/${normalizedEndpoint}`
}

export const fetchWithApiFallback = async (endpoint, options = {}) => {
  const candidates = getApiBaseCandidates()
  let lastError = null

  for (const baseUrl of candidates) {
    try {
      return await fetch(buildApiUrl(baseUrl, endpoint), options)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Unable to reach API server')
}
