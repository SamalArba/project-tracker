const rawBase = import.meta.env.VITE_API_BASE_URL || '/api'

// Normalize base URL (no trailing slash)
const API_BASE = rawBase.replace(/\/+$/, '')

export function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

export function apiFetch(input: string, init: RequestInit = {}) {
  const token = getAuthToken()
  const headers = new Headers(init.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const finalInit: RequestInit = { ...init, headers }

  return fetch(apiUrl(input), finalInit).then(res => {
    if (res.status === 401) {
      // Token invalid/expired – clear and force login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return res
  })
}


