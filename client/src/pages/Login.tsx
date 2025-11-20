import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        throw new Error('invalid_credentials')
      }

      const data = await res.json()
      localStorage.setItem('authToken', data.token)
      nav('/', { replace: true })
    } catch (err) {
      console.error('Login error', err)
      setError('סיסמה שגויה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: '0 auto' }}>
      <h1 className="h1 center" style={{ marginBottom: 24 }}>
        כניסה למערכת
      </h1>
      <form onSubmit={onSubmit} className="form">
        <div>
          <label className="label">סיסמה</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!password.trim() || loading}
          >
            {loading ? 'מתחבר…' : 'כניסה'}
          </button>
        </div>
      </form>
    </div>
  )
}


