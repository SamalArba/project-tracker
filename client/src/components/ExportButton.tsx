/**
 * ExportButton - Excel export with options
 *
 * - Modal lets you choose which columns to include
 * - Modal lets you choose how many rows (1–10) to export
 * - Generates an .xls (HTML table) that opens nicely in Excel with proper Hebrew
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'

type ExportColumn<T = any> = {
  key: string
  label: string
  getValue: (row: T) => string | number
}

type Props<T> = {
  columns: ExportColumn<T>[]
  rows: T[]
  title: string
  filename: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function ExportButton<T>({ columns, rows, title, filename }: Props<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(columns.map(c => c.key as string))
  )
  const [rowLimit, setRowLimit] = useState<number>(
    Math.min(10, Math.max(1, rows.length))
  )

  const toggleColumn = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(columns.map(c => c.key as string)))
  }

  const clearAll = () => {
    setSelected(new Set())
  }

  const exportExcel = async () => {
    if (selected.size === 0) {
      alert('נא לבחור לפחות עמודה אחת')
      return
    }

    const exportCols = columns.filter(c => selected.has(c.key as string))
    const rowsToExport = rows.slice(0, rowLimit)

    const headerRow = `<tr>${exportCols
      .map(
        c =>
          `<th style="padding:6px 8px;border:1px solid #cccccc;background:#f4f4f4;">${escapeHtml(
            c.label
          )}</th>`
      )
      .join('')}</tr>`

    const bodyRows = rowsToExport
      .map(row => {
        const cells = exportCols
          .map(col => {
            const val = col.getValue(row)
            return `<td style="padding:6px 8px;border:1px solid #dddddd;">${escapeHtml(
              String(val ?? '—')
            )}</td>`
          })
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body dir="rtl" style="font-family: Arial, sans-serif; font-size: 12pt; margin: 20px;">
  <table style="border-collapse:collapse;width:100%;text-align:center;direction:rtl;">
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

    const blob = new Blob(['\ufeff', html], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename || 'export'}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setIsOpen(false)
  }

  return (
    <>
      <button
        className="export-btn"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: 'rgba(85, 98, 255, 0.15)',
          color: 'var(--text)',
          textDecoration: 'none',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        📊 ייצוא לאקסל
      </button>

      {isOpen &&
        createPortal(
          <div
            className="export-modal-overlay"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="export-modal-content"
              style={{
                background: '#181818',
                border: '1px solid #444',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95)',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '20px',
                    fontWeight: 600
                  }}
                >
                  בחר עמודות ומספר פרויקטים לייצוא
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div
                style={{
                  padding: '24px',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Row count selector */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>
                    מספר פרויקטים לייצוא (1–10):
                  </span>
                  <select
                    value={rowLimit}
                    onChange={e =>
                      setRowLimit(
                        Math.max(
                          1,
                          Math.min(10, Number(e.target.value) || 1)
                        )
                      )
                    }
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: '#202020',
                      color: 'var(--text)'
                    }}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select/Deselect buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  <button
                    onClick={selectAll}
                    className="btn"
                    style={{ flex: 1 }}
                  >
                    בחר כל העמודות
                  </button>
                  <button
                    onClick={clearAll}
                    className="btn"
                    style={{ flex: 1 }}
                  >
                    נקה בחירה
                  </button>
                </div>

                {/* Checkboxes */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {columns.map(col => (
                    <label
                      key={col.key as string}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: selected.has(col.key as string)
                          ? 'rgba(85, 98, 255, 0.12)'
                          : 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(col.key as string)}
                        onChange={() => toggleColumn(col.key as string)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: 'var(--brand)'
                        }}
                      />
                      <span style={{ fontSize: '15px' }}>{col.label}</span>
                    </label>
                  ))}
                </div>

                {/* Info */}
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: '13px'
                  }}
                >
                  ייצוא של עד {rowLimit} פרויקטים מתוך {rows.length}
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  onClick={exportExcel}
                  disabled={selected.size === 0}
                  className="btn btn--primary"
                  style={{ opacity: selected.size === 0 ? 0.5 : 1 }}
                >
                  ייצוא לאקסל
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
