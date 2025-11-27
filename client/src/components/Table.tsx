/**
 * ================================================================
 * Table.tsx - Generic Reusable Table Component
 * ================================================================
 *
 * A flexible, type-safe table component with support for:
 * - Custom column rendering
 * - Clickable rows with navigation
 * - Optional project name and developer columns
 * - Dynamic row styling (for status indicators)
 * - Keyboard accessibility
 */

// ================================================================
// IMPORTS
// ================================================================
import { Link, useNavigate } from 'react-router-dom'

// ================================================================
// TYPE DEFINITIONS
// ================================================================
/**
 * Column definition type
 * @template T - The type of data in each row
 * @property key - The property key from the row data
 * @property label - The column header label
 * @property render - Optional custom render function
 */
type Col<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
}

// ================================================================
// TABLE COMPONENT
// ================================================================
/**
 * Table - Generic table component with navigation support
 *
 * @template T - The type of data in each row
 * @param columns - Array of column definitions
 * @param rows - Array of data rows
 * @param onRowClick - Optional click handler for rows
 * @param getRowHref - Function to get navigation URL for each row
 * @param getRowClass - Function to get CSS class for each row
 * @param showNameDeveloper - Whether to show project name & developer columns
 */
export function Table<T>({
  columns,
  rows,
  onRowClick,
  getRowHref,
  getRowClass,
  showNameDeveloper,
  className
}: {
  columns: Col<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  getRowHref?: (row: T) => string
  getRowClass?: (row: T) => string | undefined
  showNameDeveloper?: boolean
  className?: string
}) {
  const nav = useNavigate()

  return (
    <div className="card card--flush">
      <table className={`table ${className || ''}`}>
        {/* ========== TABLE HEADER ========== */}
        <thead>
          <tr>
            {/* Optional name & developer columns */}
            {showNameDeveloper && (
              <>
                <th>שם פרוייקט</th>
                <th>יזם</th>
              </>
            )}
            {/* Dynamic columns */}
            {columns.map(c => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>

        {/* ========== TABLE BODY ========== */}
        <tbody>
          {rows.map((r, i) => {
            // Get row navigation URL if available
            const href = getRowHref?.(r)

            // Click handler - either custom callback or navigation
            const handleClick = () => {
              if (onRowClick) return onRowClick(r)
              if (href) nav(href)
            }

            // Keyboard accessibility handler
            const handleKey = (
              e: React.KeyboardEvent<HTMLTableRowElement>
            ) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }

            return (
              <tr
                key={i}
                className={getRowClass?.(r)}
                onClick={handleClick}
                role={onRowClick || href ? ('button' as any) : undefined}
                tabIndex={onRowClick || href ? 0 : undefined}
                onKeyDown={onRowClick || href ? handleKey : undefined}
              >
                {/* Optional name & developer cells */}
                {showNameDeveloper && (
                  <>
                    <td>
                      {href ? (
                        <Link
                          to={href}
                          style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            display: 'block'
                          }}
                          onClick={e => {
                            e.preventDefault()
                            nav(href)
                          }}
                        >
                          {(r as any).name}
                        </Link>
                      ) : (
                        (r as any).name
                      )}
                    </td>
                    <td>{(r as any).developer ?? '—'}</td>
                  </>
                )}

                {/* Dynamic column cells */}
                {columns.map(c => (
                  <td key={String(c.key)}>
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            )
          })}

          {/* Empty state */}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (showNameDeveloper ? 2 : 0)} className="table__empty">
                אין פרויקטים עדיין.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}


