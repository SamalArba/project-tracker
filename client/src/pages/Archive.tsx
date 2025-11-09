/**
 * ================================================================
 * Archive.tsx - Archived Projects List Page
 * ================================================================
 * 
 * Displays a list of archived projects with:
 * - Search functionality (by name, developer, scope)
 * - Sortable table (by creation date, newest first)
 * - Navigation to project details
 * 
 * This page shows projects that are no longer active but kept
 * for historical reference.
 */

// ================================================================
// IMPORTS
// ================================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '../components/Table'

// ================================================================
// TYPE DEFINITIONS
// ================================================================
/**
 * ProjectRow - Shape of archived project data
 */
type ProjectRow = { 
  id: number
  name: string
  developer?: string
  scopeValue?: string
  units: number | null
  createdAt: string
}

// ================================================================
// ARCHIVE PAGE COMPONENT
// ================================================================
/**
 * Archive - Displays list of archived projects
 * 
 * Features:
 * - Fetches projects with list='ARCHIVE' from API
 * - Real-time search filtering
 * - Sorted by creation date (newest first)
 */
export default function Archive() {
  // ========== STATE ==========
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [q, setQ] = useState('') // Search query

  // ========== DATA FETCHING ==========
  /**
   * Load archived projects on component mount
   */
  useEffect(() => {
    const p = new URLSearchParams({ list: 'ARCHIVE' })
    fetch(`/api/projects?${p}`)
      .then(r => r.json())
      .then(setRows)
  }, [])

  // ========== DATA PROCESSING ==========
  /**
   * Filter projects by search query
   * Searches across: name, developer, scopeValue
   */
  const filtered = rows.filter(r =>
    (r.name ?? '').includes(q) || 
    (r.developer ?? '').includes(q) || 
    (r.scopeValue ?? '').includes(q)
  )
  
  /**
   * Sort filtered projects by creation date (newest first)
   */
  const sorted = [...filtered].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // ========== RENDER ==========
  return (
    <>
      {/* Page header with back button */}
      <div className="pageHeader">
        <Link className="back" to="/">
          <span className="arrow">←</span>חזרה
        </Link>
        <h1 className="h1">ארכיון</h1>
      </div>

      {/* Search input */}
      <div className="row" style={{ marginBottom: 12 }}>
        <input 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          placeholder="חיפוש…" 
          className="input" 
          style={{ maxWidth: 300 }}
        />
      </div>

      {/* Projects table */}
      <Table<ProjectRow>
        columns={[
          { 
            key: 'units', 
            label: 'יח״ד', 
            render: r => (r.units == null ? '—' : r.units) 
          },
          { 
            key: 'scopeValue', 
            label: 'היקף' 
          },
          { 
            key: 'createdAt', 
            label: 'תאריך יצירה', 
            render: r => new Date(r.createdAt).toLocaleDateString() 
          },
        ]}
        rows={sorted}
        getRowHref={(row) => `/project/${row.id}`}
        showNameDeveloper
      />
    </>
  )
}
