type Col<T> = { key: keyof T | string; label: string; render?: (row: T) => React.ReactNode }

export function Table<T>({ columns, rows, onRowClick }: {
  columns: Col<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={() => onRowClick?.(r)}>
              {columns.map(c => (
                <td key={String(c.key)}>
                  {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ padding: 16, color: 'var(--muted)' }}>
              אין פרויקטים עדיין.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
