const sanitizeGoogleClientId = (value) => {
  const normalized = (value || '').trim()
  if (!normalized || normalized.startsWith('YOUR_')) {
    return ''
  }
  return normalized
}

export const getGoogleClientId = () => {
  return (
    sanitizeGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID) ||
    sanitizeGoogleClientId(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID)
  )
}

export const isGoogleOAuthConfigured = () => Boolean(getGoogleClientId())
