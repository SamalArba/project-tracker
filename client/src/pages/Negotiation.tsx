import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '../components/Table'

type Row = {
  id: number
  name: string
  developer: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  scopeValue: string | null
  units: number | null
  lastTaskTitle: string | null
  lastHandlerName: string | null
  lastTaskDate: string | null // ISO
}

export default function Negotiation() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Group by lastTaskDate: overdue (red, top), due within 2 weeks (orange, middle), later/unknown (bottom).
  const now = Date.now()
  const twoWeeks = 14 * 24 * 60 * 60 * 1000
  type GrpRow = Row & { _group: number; _t: number }
  const withGroups: GrpRow[] = filtered.map(r => {
    const t = r.lastTaskDate ? Date.parse(r.lastTaskDate) : NaN
    let group = 2 // later/unknown by default
    if (Number.isFinite(t)) {
      if (t < now) group = 0;              // overdue
      else if (t - now <= twoWeeks) group = 1; // soon
      else group = 2;                      // later
    }
    return { ...(r as any), _group: group, _t: Number.isFinite(t) ? t : Number.POSITIVE_INFINITY }
  })
  // Within each section, sort by date ascending (nearest first)
  const ordered: Row[] = withGroups
    .sort((a,b) => a._group - b._group || a._t - b._t)
    .map(r => r as Row)

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
        <Table<Row>
          columns={[
            { key: 'units', label: 'יח״ד', render: r => (r.units == null ? '—' : r.units) },
            { key: 'status', label: 'סטטוס', render: r => fmtStatus(r.status) },
            { key: 'lastTaskTitle', label: 'משימה אחרונה', render: r => r.lastTaskTitle ?? '—' },
            { key: 'lastHandlerName', label: 'שם המטפל', render: r => r.lastHandlerName ?? '—' },
            { key: 'lastTaskDate', label: 'תאריך משימה', render: r => fmtDate(r.lastTaskDate) },
          ]}
          rows={ordered}
          getRowHref={(r)=>`/project/${r.id}`}
          getRowClass={(r)=>{
            const t = r.lastTaskDate ? Date.parse(r.lastTaskDate) : NaN
            if (!Number.isFinite(t)) return undefined
            if (t < now) return 'row--overdue'
            if (t - now <= twoWeeks) return 'row--soon'
            return undefined
          }}
          showNameDeveloper
        />
      )}
    </>
  )
}
