type Col<T> = { key: keyof T | string; label: string; render?: (row: T) => React.ReactNode }
import { Link, useNavigate } from 'react-router-dom'

export function Table<T>({ columns, rows, onRowClick, getRowHref, getRowClass, showNameDeveloper }: {
  columns: Col<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  getRowHref?: (row: T) => string
  getRowClass?: (row: T) => string | undefined
  showNameDeveloper?: boolean
}) {
  const nav = useNavigate();
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="table">
        <thead>
          <tr>
            {showNameDeveloper && (
              <>
                <th>שם פרוייקט</th>
                <th>יזם</th>
              </>
            )}
            {columns.map(c => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const href = getRowHref?.(r)
            const handleClick = () => {
              if (onRowClick) return onRowClick(r)
              if (href) nav(href)
            }
            const handleKey = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
            return (
              <tr
                key={i}
                className={getRowClass?.(r)}
                onClick={handleClick}
                role={(onRowClick || href) ? 'button' as any : undefined}
                tabIndex={(onRowClick || href) ? 0 : undefined}
                onKeyDown={(onRowClick || href) ? handleKey : undefined}
                style={(onRowClick || href) ? { cursor: 'pointer' } : undefined}
              >
              {showNameDeveloper && (
                <>
                  <td>
                    {href ? (
                      <Link to={href} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                            onClick={(e)=>{ e.preventDefault(); nav(href) }}>
                        {(r as any).name}
                      </Link>
                    ) : (
                      (r as any).name
                    )}
                  </td>
                  <td>{(r as any).developer ?? '—'}</td>
                </>
              )}
              {columns.map(c => (
                <td key={String(c.key)}>
                  {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                </td>
              ))}
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + (showNameDeveloper ? 2 : 0)} style={{ padding: 16, color: 'var(--muted)' }}>
              אין פרויקטים עדיין.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
