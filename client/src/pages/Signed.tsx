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
  standard: string | null
  execution: number | null
  remaining: string | null
  startDate: string | null
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
  const sorted = [...filtered].sort((a,b)=> {
    const ta = a.startDate ? Date.parse(a.startDate) : 0
    const tb = b.startDate ? Date.parse(b.startDate) : 0
    return tb - ta
  })
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : '—'

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

      <Table<Row>
        columns={[
          { key: 'units', label: 'יח״ד', render: r => (r.units == null ? '—' : r.units) },
          { key: 'standard', label: 'סטנדרט', render: r => r.standard ?? '—' },
          { key: 'scopeValue', label: 'היקף', render: r => r.scopeValue ?? '—' },
          { key: 'execution', label: 'ביצוע (%)', render: r => (r.execution == null ? '—' : r.execution) },
          { key: 'remaining', label: 'יתרה', render: r => r.remaining ?? '—' },
          { key: 'startDate', label: 'תאריך התחלה', render: r => fmtDate(r.startDate) },
        ]}
        rows={sorted}
        getRowHref={(r)=>`/project/${r.id}`}
        showNameDeveloper
      />
    </>
  )
}
