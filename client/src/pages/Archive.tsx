import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '../components/Table'

type ProjectRow = { id:number; name:string; developer?:string; scopeValue?:string }

export default function Archive() {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    const p = new URLSearchParams({ list: 'ARCHIVE' })
    fetch(`/api/projects?${p}`).then(r=>r.json()).then(setRows)
  }, [])

  const filtered = rows.filter(r =>
    (r.name ?? '').includes(q) || (r.developer ?? '').includes(q) || (r.scopeValue ?? '').includes(q)
  )

  return (
    <>
      <div className="pageHeader">
        <Link className="back" to="/"><span className="arrow">←</span>חזרה</Link>
        <h1 className="h1">ארכיון</h1>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש…" className="input" style={{maxWidth:300}}/>
      </div>

      <Table<ProjectRow>
        columns={[
          { key: 'name',       label: 'פרויקט' },
          { key: 'developer',  label: 'יזם' },
          { key: 'scopeValue', label: 'היקף' },
        ]}
        rows={filtered}
        onRowClick={(row)=>console.log('clicked', row)}
      />
    </>
  )
}
