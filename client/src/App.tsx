import { useEffect, useState } from 'react'

type Health = { ok: boolean; service: string; ts: string }

export default function App() {
  const [data, setData] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Project Tracker — Client</h1>
      <p>Talking to the API…</p>
      {data && (
        <pre style={{ background: '#111', color: '#0f0', padding: 12 }}>
{JSON.stringify(data, null, 2)}
        </pre>
      )}
      {error && <p style={{ color: 'tomato' }}>{error}</p>}
    </div>
  )
}
