import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Row = {
  id: number
  name: string
  developer: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  scopeValue: string | null
  lastTaskTitle: string | null
  lastHandlerName: string | null
  lastTaskDate: string | null
}

export default function Signed() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    const p = new URLSearchParams({ list: 'SIGNED' })
    fetch(`/api/projects?${p}`).then(r=>r.json()).then(setRows)
  }, [])

  const filtered = rows.filter(r => {
    const hay = `${r.name} ${r.developer ?? ''} ${r.scopeValue ?? ''} ${r.lastTaskTitle ?? ''} ${r.lastHandlerName ?? ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : '—'
  const fmtStatus = (s: Row['status']) =>
    s === 'ACTIVE' ? 'פעיל' : s === 'ON_HOLD' ? 'מושהה' : 'הושלם'

  return (
    <>
      <div className="pageHeader">
        <Link className="back" to="/"><span className="arrow">←</span>חזרה</Link>
        <h1 className="h1">חתומים</h1>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="חיפוש…"
               value={q} onChange={e=>setQ(e.target.value)} />
      </div>

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
            <tr key={r.id}>
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
    </>
  )
}
