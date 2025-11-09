/**
 * ================================================================
 * Negotiation.tsx - Projects in Negotiation Phase
 * ================================================================
 * 
 * Displays projects currently in negotiation with:
 * - Search functionality (name, developer, scope, task, handler)
 * - Smart sorting by task due dates (overdue > soon > later)
 * - Color-coded rows (red=overdue, orange=due soon)
 * - Status indicators with visual chips
 * - Loading and error states
 * 
 * Projects are automatically grouped and sorted:
 * 1. Overdue tasks (red) - sorted by date, nearest first
 * 2. Due within 2 weeks (orange) - sorted by date, nearest first
 * 3. Later or no date - sorted by date, nearest first
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
 * Row - Project data structure for negotiation list
 */
type Row = {
  id: number
  name: string
  developer: string | null
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
  scopeValue: string | null
  units: number | null
  lastTaskTitle: string | null
  lastHandlerName: string | null
  lastTaskDate: string | null // ISO date string
}

// ================================================================
// NEGOTIATION PAGE COMPONENT
// ================================================================
/**
 * Negotiation - Displays projects in negotiation phase
 * 
 * Features:
 * - Fetches projects with list='NEGOTIATION' from API
 * - Real-time search across multiple fields
 * - Intelligent sorting by task urgency
 * - Visual indicators for task deadlines
 */
export default function Negotiation() {
  // ========== STATE ==========
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('') // Search query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ========== DATA FETCHING ==========
  /**
   * Load negotiation projects on component mount
   * Includes error handling and loading states
   */
  useEffect(() => {
    const p = new URLSearchParams({ list: 'NEGOTIATION' })
    setLoading(true)
    setError(null)
    
    fetch(`/api/projects?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setRows)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  // ========== DATA PROCESSING ==========
  /**
   * Filter projects by search query
   * Searches across: name, developer, scope, last task title, handler name
   */
  const filtered = rows.filter(r => {
    const haystack = `${r.name} ${r.developer ?? ''} ${r.scopeValue ?? ''} ${r.lastTaskTitle ?? ''} ${r.lastHandlerName ?? ''}`.toLowerCase()
    return haystack.includes(q.toLowerCase())
  })

  /**
   * Group and sort projects by task urgency
   * 
   * Groups:
   * - Group 0 (red): Overdue tasks
   * - Group 1 (orange): Due within 2 weeks
   * - Group 2: Later or no date
   * 
   * Within each group, sort by date ascending (nearest first)
   */
  const now = Date.now()
  const twoWeeks = 14 * 24 * 60 * 60 * 1000 // milliseconds
  
  type GrpRow = Row & { _group: number; _t: number }
  
  const withGroups: GrpRow[] = filtered.map(r => {
    const t = r.lastTaskDate ? Date.parse(r.lastTaskDate) : NaN
    let group = 2 // Default: later/unknown
    
    if (Number.isFinite(t)) {
      if (t < now) {
        group = 0 // Overdue
      } else if (t - now <= twoWeeks) {
        group = 1 // Due soon
      } else {
        group = 2 // Later
      }
    }
    
    return { 
      ...(r as any), 
      _group: group, 
      _t: Number.isFinite(t) ? t : Number.POSITIVE_INFINITY 
    }
  })
  
  // Sort by group first, then by date within group
  const ordered: Row[] = withGroups
    .sort((a, b) => a._group - b._group || a._t - b._t)
    .map(r => r as Row)

  // ========== UTILITY FUNCTIONS ==========
  /**
   * Format ISO date string to localized date
   */
  const fmtDate = (iso: string | null) => 
    iso ? new Date(iso).toLocaleDateString('he-IL') : '—'
  
  /**
   * Convert status enum to Hebrew label
   */
  const fmtStatus = (s: Row['status']) =>
    s === 'ACTIVE' ? 'נוצר פרוייקט'
    : s === 'ON_HOLD' ? 'נוצר קשר ראשוני'
    : s === 'COMPLETED' ? 'בוצעה פגישה ראשונה' 
    : 'ניתנה הצעת מחיר'
  
  /**
   * Get CSS class for status chip
   */
  const statusClass = (s: Row['status']) =>
    s === 'ACTIVE' ? 'status--active'
    : s === 'ON_HOLD' ? 'status--on-hold'
    : s === 'COMPLETED' ? 'status--completed' 
    : 'status--quote'

  // ========== RENDER ==========
  return (
    <>
      {/* Page header with back button */}
      <div className="pageHeader">
        <Link className="back" to="/">
          <span className="arrow">←</span>חזרה
        </Link>
        <h1 className="h1">משא ומתן</h1>
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

      {/* Loading state */}
      {loading && <div className="card">טוען…</div>}
      
      {/* Error state */}
      {error && <div className="card">שגיאה: {error}</div>}

      {/* Projects table */}
      {!loading && !error && (
        <Table<Row>
          columns={[
            { 
              key: 'units', 
              label: 'יח״ד', 
              render: r => (r.units == null ? '—' : r.units) 
            },
            { 
              key: 'status', 
              label: 'סטטוס', 
              render: r => (
                <span className={`statusChip ${statusClass(r.status)}`}>
                  {fmtStatus(r.status)}
                </span>
              ) 
            },
            { 
              key: 'lastTaskTitle', 
              label: 'משימה אחרונה', 
              render: r => r.lastTaskTitle ?? '—' 
            },
            { 
              key: 'lastHandlerName', 
              label: 'שם המטפל', 
              render: r => r.lastHandlerName ?? '—' 
            },
            { 
              key: 'lastTaskDate', 
              label: 'תאריך משימה', 
              render: r => fmtDate(r.lastTaskDate) 
            },
          ]}
          rows={ordered}
          getRowHref={(r) => `/project/${r.id}`}
          getRowClass={(r) => {
            const t = r.lastTaskDate ? Date.parse(r.lastTaskDate) : NaN
            if (!Number.isFinite(t)) return undefined
            if (t < now) return 'row--overdue' // Red: overdue
            if (t - now <= twoWeeks) return 'row--soon' // Orange: due within 2 weeks
            return 'row--later' // Green: more than 2 weeks away
          }}
          showNameDeveloper
        />
      )}
    </>
  )
}
