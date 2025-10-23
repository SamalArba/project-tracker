import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'   // ← add useNavigate

type Row = {
  id: number
  name: string
  developer: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  scopeValue: string | null
  lastTaskTitle: string | null
  lastHandlerName: string | null
  lastTaskDate: string | null // ISO
}

export default function Negotiation() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate();                           // ← create navigator

  useEffect(() => {
    const p = new URLSearchParams({ list: 'NEGOTIATION' })
    setLoading(true); setError(null)
    fetch(`/api/projects?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setRows)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    const hay = `${r.name} ${r.developer ?? ''} ${r.scopeValue ?? ''} ${r.lastTaskTitle ?? ''} ${r.lastHandlerName ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('he-IL') : '—'
  const fmtStatus = (s: Row['status']) =>
    s === 'ACTIVE' ? 'פעיל' : s === 'ON_HOLD' ? 'מושהה' : 'הושלם'

  return (
    <>
      <div className="pageHeader">
        <Link className="back" to="/"><span className="arrow">←</span>חזרה</Link>
        <h1 className="h1">משא ומתן</h1>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="חיפוש…"
               value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {loading && <div className="card">טוען…</div>}
      {error && <div className="card">שגיאה: {error}</div>}

      {!loading && !error && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>שם פרוייקט</th>
                <th>יזם</th>
                <th>סטטוס</th>
                <th>היקף</th>
                <th>משימה אחרונה</th>
                <th>שם המטפל</th>
                <th>תאריך</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => nav(`/project/${r.id}`)}  // ← make the row clickable
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav(`/project/${r.id}`) }}
                >
                  <td>{r.name}</td>
                  <td>{r.developer ?? '—'}</td>
                  <td>{fmtStatus(r.status)}</td>
                  <td>{r.scopeValue ?? '—'}</td>
                  <td>{r.lastTaskTitle ?? '—'}</td>
                  <td>{r.lastHandlerName ?? '—'}</td>
                  <td>{fmtDate(r.lastTaskDate)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="muted">אין תוצאות</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
