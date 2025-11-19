const rawBase = import.meta.env.VITE_API_BASE_URL || '/api'

// Normalize base URL (no trailing slash)
const API_BASE = rawBase.replace(/\/+$/, '')

export function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init)
}


