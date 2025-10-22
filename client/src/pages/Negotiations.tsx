import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '../components/Table'

export type ProjectRow = {
  id: number
  name: string
  developer?: string
  scopeValue?: string
}

const mock: ProjectRow[] = [
  { id: 1, name: 'פרויקט א', developer: 'יזם א', scopeValue: '₪1.2M' },
  { id: 2, name: 'פרויקט ב', developer: 'יזם ב', scopeValue: '₪750K' },
  { id: 3, name: 'פרויקט ג', developer: 'יזם ג', scopeValue: '—' },
]

export default function Negotiation() {
  const [rows] = useState<ProjectRow[]>(mock)
  const [q, setQ] = useState('')

  const filtered = rows.filter(r =>
    (r.name?.includes(q) || r.developer?.includes(q) || r.scopeValue?.includes(q))
  )

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className="link" to="/">&larr; חזרה</Link>
        <h1 className="h1" style={{ marginBottom: 0 }}>מסע ומתן</h1>
        <div style={{ marginInlineStart: 'auto' }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="חיפוש…"
            className="card"
            style={{ padding: '8px 10px' }}
          />
        </div>
      </div>

      <Table<ProjectRow>
        columns={[
          { key: 'name',       label: 'פרויקט' },
          { key: 'developer',  label: 'יזם' },
          { key: 'scopeValue', label: 'היקף' },
        ]}
        rows={filtered}
        onRowClick={(row) => {
          // later: navigate(`/project/${row.id}`)
          console.log('clicked', row)
        }}
      />
    </>
  )
}
