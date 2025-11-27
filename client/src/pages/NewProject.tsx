/**
 * ================================================================
 * NewProject.tsx - New Project Creation Form
 * ================================================================
 * 
 * Comprehensive form for creating new projects with:
 * - Basic project information (name, developer, list, status)
 * - Project details (units, scope, execution, remaining, standard)
 * - Optional initial task assignment
 * - Optional initial contacts
 * - Optional initial file uploads with drag & drop
 * - Real-time validation
 * - Auto-calculation of remaining budget from scope & execution
 * 
 * After creation, navigates to the appropriate list view.
 */

// ================================================================
// IMPORTS
// ================================================================
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api'

// ================================================================
// TYPE DEFINITIONS
// ================================================================
type ListKind = 'NEGOTIATION' | 'ARCHIVE' | 'SIGNED'
type Status = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'QUOTE_GIVEN'

// ================================================================
// NEW PROJECT COMPONENT
// ================================================================
/**
 * NewProject - Form component for creating new projects
 * 
 * Features:
 * - Multi-section form with project details, tasks, contacts, and files
 * - Standard templates selection (Comfort, Smart, Prestige series)
 * - Auto-calculating remaining budget
 * - Drag & drop file uploads
 * - Form validation
 */
export default function NewProject() {
  const nav = useNavigate()

  // ========== BASIC PROJECT FIELDS ==========
  const [name, setName] = useState('')
  const [developer, setDeveloper] = useState('')
  const [listKind, setListKind] = useState<ListKind>('NEGOTIATION')
  const [status, setStatus] = useState<Status>('ACTIVE')
  
  // Standard options (predefined templates)
  const [standard, setStandard] = useState('')
  const STANDARD_OPTIONS = [
    'COMFORT', 'COMFORT +', 'COMFORT +GLASS',
    'SMART 1', 'SMART 2', 'SMART 3',
    'PRESTIGE 4', 'PRESTIGE 5', 'PRESTIGE 6',
  ]
  const [stdSelected, setStdSelected] = useState<string[]>([])
  const [standardNote, setStandardNote] = useState('')
  
  // Project scope and budget
  const [units, setUnits] = useState<number | ''>('')
  const [scopeValue, setScopeValue] = useState('')
  const [execution, setExecution] = useState<number | ''>('')
  const [remaining, setRemaining] = useState('')

  // ========== INITIAL ASSIGNMENT (OPTIONAL) ==========
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssigneeName, setTaskAssigneeName] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('') // yyyy-mm-dd
  const [taskNotes, setTaskNotes] = useState('')

  // ========== INITIAL CONTACTS (OPTIONAL) ==========
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [initialContacts, setInitialContacts] = useState<Array<{name: string, phone: string}>>([])

  // ========== INITIAL FILES (OPTIONAL) ==========
  const [initialFiles, setInitialFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)

  // ========== UI STATE ==========
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createdToday = new Date().toLocaleDateString()

  // ========== VALIDATION ==========
  /**
   * Form is valid if:
   * - Name is not empty
   * - Execution (if provided) is between 0 and 100
   */
  const valid =
    name.trim().length > 0 &&
    (execution === '' || (typeof execution === 'number' && execution >= 0 && execution <= 100))

  // ========== AUTO-CALCULATION ==========
  /**
   * Debounced auto-calculation of remaining budget
   * Formula: remaining = scopeValue * (1 - execution / 100)
   * Updates 400ms after user stops typing
   */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const numericScope = scopeValue
        ? Number(scopeValue.replace(/[^0-9]/g, ''))
        : NaN
      const e = typeof execution === 'number' ? execution : NaN
      
      if (Number.isFinite(numericScope) && Number.isFinite(e)) {
        const clamped = Math.max(0, Math.min(100, e))
        const remainingPct = 100 - clamped
        const rem = Math.max(0, Math.round((numericScope * remainingPct) / 100))
        const next = String(rem)
        if (next !== remaining) setRemaining(next)
      }
    }, 400)
    
    return () => window.clearTimeout(handle)
  }, [scopeValue, execution, remaining])

  // ========== FORM SUBMISSION ==========
  /**
   * Handle form submission
   * - Creates project via API
   * - Uploads files if any
   * - Navigates to appropriate list
   */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    
    setSaving(true)
    setError(null)

    // Build payload
    const payload: any = {
      name: name.trim(),
      developer: developer.trim() || undefined,
      listKind,
      status,
      standard: standard.trim() || undefined,
      units: units === '' ? undefined : Number(units),
      scopeValue: scopeValue.trim() || undefined,
      execution: execution === '' ? undefined : Number(execution),
      remaining: remaining.trim() || undefined,
    }

    // Add initial assignment if provided
    if (taskTitle.trim()) {
      payload.initialAssignment = {
        title: taskTitle.trim(),
        assigneeName: taskAssigneeName.trim() || undefined,
        dueDate: taskDueDate || undefined,
        notes: taskNotes.trim() || undefined,
      }
    }

    // Add initial contacts if any
      if (initialContacts.length > 0) {
      payload.initialContacts = initialContacts
    }
  
    try {
      // Create project
      const res = await apiFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        let msg = 'Failed to create'
        try {
          const j = await res.json()
          msg = (j?.error && JSON.stringify(j.error)) || msg
        } catch {}
        throw new Error(msg)
      }

      const createdProject = await res.json()
      const projectId = createdProject.project?.id
  
      // Upload files if any
      if (projectId && initialFiles.length > 0) {
        for (const file of initialFiles) {
          const formData = new FormData()
          formData.append('file', file)
          await apiFetch(`/projects/${projectId}/files`, {
            method: 'POST',
            body: formData,
          }).catch(err => console.error('Failed to upload file:', err))
        }
      }

      // Navigate to appropriate list
      const route =
        listKind === 'NEGOTIATION' ? '/list/negotiation'
        : listKind === 'ARCHIVE'   ? '/list/archive'
        : '/list/signed'

      nav(route)
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  // ========== CONTACT MANAGEMENT ==========
  /**
   * Add contact to the initial contacts list
   */
  const addContactToList = () => {
    if (contactName.trim() && contactPhone.trim()) {
      setInitialContacts([...initialContacts, { 
        name: contactName.trim(), 
        phone: contactPhone.trim() 
      }])
      setContactName('')
      setContactPhone('')
    }
  }

  /**
   * Remove contact from the initial contacts list
   */
  const removeContactFromList = (index: number) => {
    setInitialContacts(initialContacts.filter((_, i) => i !== index))
  }

  // ========== FILE MANAGEMENT ==========
  /**
   * Handle file selection via input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInitialFiles([...initialFiles, ...Array.from(e.target.files)])
      e.target.value = '' // Reset input
    }
  }

  /**
   * Remove file from the initial files list
   */
  const removeFile = (index: number) => {
    setInitialFiles(initialFiles.filter((_, i) => i !== index))
  }

  /**
   * Handle drag events for file upload
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  /**
   * Handle file drop for upload
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setInitialFiles([...initialFiles, ...Array.from(e.dataTransfer.files)])
    }
  }

  // ========== RENDER ==========
  return (
    <>
      {/* ========== PAGE HEADER ========== */}
      <div className="pageHeader">
        <Link className="back" to="/">
          <span className="arrow">←</span>חזרה
        </Link>
        <h1 className="h1">יצירת פרויקט חדש</h1>
      </div>

      {/* ========== MAIN FORM ========== */}
      <form className="card form" onSubmit={onSubmit}>
        {/* Error message */}
        {error && <div className="error">{error}</div>}

        {/* ========== SECTION 1: PROJECT DETAILS ========== */}
        <div className="card card--compact mt8 form form--md">
          <h3 className="h3 mt0">פרטי פרויקט</h3>

          {/* Project name */}
          <div>
            <label className="label">שם פרויקט</label>
            <input 
              className="input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="לדוגמה: פרויקט א" 
            />
          </div>

          {/* Developer and List */}
          <div className="grid2">
            <div>
              <label className="label">יזם</label>
              <input 
                className="input" 
                value={developer} 
                onChange={e => setDeveloper(e.target.value)} 
                placeholder="לדוגמה: יזם בע״מ" 
              />
            </div>
            <div>
              <label className="label">רשימה</label>
              <select 
                className="input" 
                value={listKind} 
                onChange={e => setListKind(e.target.value as ListKind)}
              >
                <option value="NEGOTIATION">משא ומתן</option>
                <option value="ARCHIVE">ארכיון</option>
                <option value="SIGNED">חתומים</option>
              </select>
            </div>
          </div>
        
          {/* Status and Creation Date */}
          <div className="grid2">
            <div>
              <label className="label">סטטוס</label>
              <select 
                className="input" 
                value={status} 
                onChange={e => setStatus(e.target.value as Status)}
              >
                <option value="ACTIVE">נוצר פרוייקט</option>
                <option value="ON_HOLD">נוצר קשר ראשוני</option>
                <option value="COMPLETED">בוצעה פגישה ראשונה</option>
                <option value="QUOTE_GIVEN">ניתנה הצעת מחיר</option>
              </select>
            </div>
            <div>
              <label className="label">תאריך הוספה למערכת</label>
              <input className="input" value={createdToday} readOnly />
            </div>
          </div>

          {/* Units and Scope */}
          <div className="grid2">
            <div>
              <label className="label">יח״ד</label>
              <input
                className="input" 
                type="number" 
                min={0}
                value={units}
                onChange={e => setUnits(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="לדוגמה: 120"
              />
            </div>
            <div>
              <label className="label">היקף</label>
              <input 
                className="input" 
                value={scopeValue} 
                onChange={e => setScopeValue(e.target.value)} 
                placeholder="₪ / תיאור חופשי" 
              />
            </div>
          </div>

          {/* Execution and Remaining */}
          <div className="grid2 mt14">
            <div>
              <label className="label">ביצוע (%)</label>
              <input
                className="input" 
                type="number" 
                min={0} 
                max={100}
                value={execution}
                onChange={e => setExecution(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0–100"
              />
            </div>
            <div>
              <label className="label">יתרה</label>
              <input 
                className="input" 
                value={remaining} 
                onChange={e => setRemaining(e.target.value)} 
                placeholder="טקסט חופשי / ₪" 
              />
            </div>
          </div>

          {/* Standard selection */}
          <div className="mt12">
            <label className="label">סטנדרט (ניתן לבחור כמה)</label>
            <div className="row gap8">
              {STANDARD_OPTIONS.map(opt => {
                const active = stdSelected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`btn btn--chip ${active ? 'btn--primary' : ''}`}
                    onClick={() => {
                      const next = active 
                        ? stdSelected.filter(o => o !== opt) 
                        : [...stdSelected, opt]
                      setStdSelected(next)
                      setStandard(
                        next.join(', ') + 
                        (standardNote.trim() ? (next.length ? ', ' : '') + standardNote.trim() : '')
                      )
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="mt12">
              <input 
                className="input" 
                placeholder="תיאור סטנדרט חופשי"
                value={standardNote}
                onChange={e => { 
                  const v = e.target.value
                  setStandardNote(v)
                  setStandard(
                    (stdSelected.join(', ') + 
                    (v.trim() ? (stdSelected.length ? ', ' : '') + v.trim() : ''))
                  )
                }} 
              />
            </div>
          </div>
        </div>

        {/* ========== SECTION 2: INITIAL ASSIGNMENT (OPTIONAL) ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">משימה ראשונית (אופציונלי)</h3>
          <div className="grid2 gap16">
            <input 
              className="input" 
              placeholder="כותרת משימה"
              value={taskTitle} 
              onChange={e => setTaskTitle(e.target.value)} 
            />
            <input 
              className="input" 
              placeholder="שם מטפל"
              value={taskAssigneeName} 
              onChange={e => setTaskAssigneeName(e.target.value)} 
            />
          </div>
          <div className="grid2 gap16 mt12">
            <input 
              className="input" 
              type="date" 
              placeholder="תאריך יעד"
              value={taskDueDate} 
              onChange={e => setTaskDueDate(e.target.value)} 
            />
            <input 
              className="input" 
              placeholder="הערות (אופציונלי)"
              value={taskNotes} 
              onChange={e => setTaskNotes(e.target.value)} 
            />
          </div>
          <div className="helper">אפשר להשאיר ריק — תמיד תוכלו להוסיף משימות מאוחר יותר</div>
        </div>

        {/* ========== SECTION 3: INITIAL CONTACTS (OPTIONAL) ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">אנשי קשר ראשוניים (אופציונלי)</h3>
          
          {/* Add contact form */}
          <div className="grid2">
            <input 
              className="input" 
              placeholder="שם"
              value={contactName} 
              onChange={e => setContactName(e.target.value)} 
            />
            <input 
              className="input" 
              placeholder="טלפון"
              value={contactPhone} 
              onChange={e => setContactPhone(e.target.value)} 
            />
          </div>
          <div className="actions">
            <button 
              type="button" 
              className="btn btn--primary" 
              onClick={addContactToList} 
              disabled={!contactName.trim() || !contactPhone.trim()}
            >
              הוסף איש קשר
            </button>
          </div>
          
          {/* Contacts list */}
          {initialContacts.length > 0 && (
            <div className="mt12">
              <table className="table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>טלפון</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {initialContacts.map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>{c.phone}</td>
                      <td className="cell-actions cell-actions--tight">
                        <button 
                          type="button" 
                          className="btn btn--danger" 
                          onClick={() => removeContactFromList(i)}
                        >
                          הסר
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="helper">אפשר להשאיר ריק — תמיד תוכלו להוסיף אנשי קשר מאוחר יותר</div>
        </div>

        {/* ========== SECTION 4: INITIAL FILES (OPTIONAL) ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">קבצים ראשוניים (אופציונלי)</h3>
          
          {/* Drag & drop zone */}
          <div
            className={`dropZone ${dragActive ? 'is-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <p className="dropZone__label">
              גרור קבצים לכאן או
            </p>
            <label className="btn btn--primary btn--file-label">
              בחר קבצים
              <input 
                type="file" 
                multiple 
                className="hidden-input"
                onChange={handleFileSelect} 
              />
            </label>
          </div>

          {/* Files list */}
          {initialFiles.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>שם קובץ</th>
                  <th>גודל</th>
                  <th className="cell-actions"></th>
                </tr>
              </thead>
              <tbody>
                {initialFiles.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <span dir="ltr" className="text-ltr">
                        {f.name}
                      </span>
                    </td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td className="cell-actions cell-actions--tight">
                      <button 
                        type="button" 
                        className="btn btn--danger" 
                        onClick={() => removeFile(i)}
                      >
                        הסר
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="helper">אפשר להשאיר ריק — תמיד תוכלו להעלות קבצים מאוחר יותר</div>
        </div>

        {/* ========== VALIDATION ERROR ========== */}
        {!valid && (
          <div className="error">
            שם פרויקט חובה, וביצוע (אם מולא) חייב להיות בין 0 ל-100.
          </div>
        )}

        {/* ========== FORM ACTIONS ========== */}
        <div className="actions">
          <button 
            type="button" 
            className="btn" 
            onClick={() => nav(-1)}
          >
            ביטול
          </button>
          <button 
            type="submit" 
            className="btn btn--primary" 
            disabled={!valid || saving}
          >
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </div>
      </form>
    </>
  )
}
