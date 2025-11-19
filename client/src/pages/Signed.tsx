/**
 * ================================================================
 * Signed.tsx - Signed Projects List Page
 * ================================================================
 * 
 * Displays projects that have been signed and are in execution with:
 * - Search functionality (name, developer, scope, tasks, handlers)
 * - Detailed project information (units, standard, scope, execution, remaining)
 * - Sorted by start date (newest first)
 * - Navigation to project details
 * 
 * This page shows active projects that have moved past negotiation
 * and are now being executed.
 */

// ================================================================
// IMPORTS
// ================================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '../components/Table'
import { ExportButton } from '../components/ExportButton'

// ================================================================
// TYPE DEFINITIONS
// ================================================================
/**
 * Row - Project data structure for signed projects list
 */
type Row = {
  id: number
  name: string
  developer: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  scopeValue: string | null
  units: number | null
  standard: string | null
  execution: number | null // Percentage (0-100)
  remaining: string | null
  startDate: string | null // ISO date string
  lastTaskTitle: string | null
  lastHandlerName: string | null
  lastTaskDate: string | null
}

// ================================================================
// SIGNED PAGE COMPONENT
// ================================================================
/**
 * Signed - Displays list of signed projects in execution
 * 
 * Features:
 * - Fetches projects with list='SIGNED' from API
 * - Real-time search across multiple fields
 * - Sorted by start date (most recent first)
 * - Displays execution progress and remaining budget
 */
export default function Signed() {
  // ========== STATE ==========
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('') // Search query

  // ========== DATA FETCHING ==========
  /**
   * Load signed projects on component mount
   */
  useEffect(() => {
    const p = new URLSearchParams({ list: 'SIGNED' })
    fetch(`/api/projects?${p}`)
      .then(r => r.json())
      .then(setRows)
  }, [])

  // ========== DATA PROCESSING ==========
  /**
   * Filter projects by search query
   * Searches across: name, developer, scope, task title, handler name
   */
  const filtered = rows.filter(r => {
    const haystack = `${r.name} ${r.developer ?? ''} ${r.scopeValue ?? ''} ${r.lastTaskTitle ?? ''} ${r.lastHandlerName ?? ''}`.toLowerCase()
    return haystack.includes(q.toLowerCase())
  })
  
  /**
   * Sort filtered projects by start date (newest first)
   * Projects without start date are placed at the bottom
   */
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.startDate ? Date.parse(a.startDate) : 0
    const tb = b.startDate ? Date.parse(b.startDate) : 0
    return tb - ta
  })
  
  // ========== UTILITY FUNCTIONS ==========
  /**
   * Format ISO date string to localized date
   */
  const fmtDate = (iso: string | null) => 
    iso ? new Date(iso).toLocaleDateString() : '—'

  // Export columns configuration
  const exportColumns = [
    { key: 'name', label: 'שם פרוייקט', getValue: (r: Row) => r.name },
    { key: 'developer', label: 'יזם', getValue: (r: Row) => r.developer ?? '—' },
    { key: 'units', label: 'יח״ד', getValue: (r: Row) => r.units ?? '—' },
    { key: 'standard', label: 'סטנדרט', getValue: (r: Row) => r.standard ?? '—' },
    { key: 'scopeValue', label: 'היקף', getValue: (r: Row) => r.scopeValue ?? '—' },
    { key: 'execution', label: 'ביצוע (%)', getValue: (r: Row) => r.execution ?? '—' },
    { key: 'remaining', label: 'יתרה', getValue: (r: Row) => r.remaining ?? '—' },
    { key: 'startDate', label: 'תאריך התחלה', getValue: (r: Row) => fmtDate(r.startDate) }
  ]

  // ========== RENDER ==========
  return (
    <>
      {/* Page header with back button and export button */}
      <div className="pageHeader">
        <Link className="back" to="/">
          <span className="arrow">←</span>חזרה
        </Link>
        <h1 className="h1">חתומים</h1>
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <ExportButton
            columns={exportColumns}
            rows={sorted}
            title="פרויקטים חתומים"
            filename={`חתומים_${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}`}
          />
        </div>
      </div>

      {/* Search input */}
      <div className="row" style={{ marginBottom: 12 }}>
        <input 
          className="input" 
          style={{ maxWidth: 320 }} 
          placeholder="חיפוש…"
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
      </div>

      {/* Projects table */}
      <Table<Row>
        className="table-signed"
        columns={[
          { 
            key: 'units', 
            label: 'יח״ד', 
            render: r => (r.units == null ? '—' : r.units) 
          },
          { 
            key: 'standard', 
            label: 'סטנדרט', 
            render: r => r.standard ?? '—' 
          },
          { 
            key: 'scopeValue', 
            label: 'היקף', 
            render: r => r.scopeValue ?? '—' 
          },
          { 
            key: 'execution', 
            label: 'ביצוע (%)', 
            render: r => (r.execution == null ? '—' : r.execution) 
          },
          { 
            key: 'remaining', 
            label: 'יתרה', 
            render: r => r.remaining ?? '—' 
          },
          { 
            key: 'startDate', 
            label: 'תאריך התחלה', 
            render: r => fmtDate(r.startDate) 
          },
        ]}
        rows={sorted}
        getRowHref={(r) => `/project/${r.id}`}
        showNameDeveloper
      />
    </>
  )
}
