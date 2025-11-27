/**
 * ================================================================
 * ProjectDetails.tsx - Project Details & Management Page
 * ================================================================
 * 
 * Comprehensive project management interface with:
 * - Live editing of all project fields
 * - List movement (Negotiation ↔ Signed ↔ Archive)
 * - Task management (create, view, delete)
 * - Contact management (create, view, delete)
 * - File management (upload, download, delete with drag & drop)
 * - Auto-calculation of remaining budget
 * - Project deletion
 * 
 * This is the most complex component, serving as the main
 * interface for managing individual projects.
 */

// ================================================================
// IMPORTS
// ================================================================
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiFetch, apiUrl } from "../api"

// ================================================================
// TYPE DEFINITIONS
// ================================================================
type ListKind = "NEGOTIATION" | "SIGNED" | "ARCHIVE"
type Status = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "QUOTE_GIVEN"

/**
 * Assignment - Task/assignment associated with project
 */
type Assignment = {
  id: number
  title: string
  notes: string | null
  assigneeName: string | null
  createdAt: string      // ISO date
  dueDate: string | null // ISO date
}

/**
 * Contact - Person associated with project
 */
type Contact = {
  id: number
  name: string
  phone: string
  createdAt: string
}

/**
 * ProjectFile - File attached to project
 */
type ProjectFile = {
  id: number
  originalName: string
  size: number
  createdAt: string
}

/**
 * Project - Complete project data structure
 */
type Project = {
  id: number
  name: string
  developer: string | null
  listKind: ListKind
  status: Status
  standard: string | null
  units: number | null
  scopeValue: string | null
  startDate: string | null
  execution: number | null
  remaining: string | null
  createdAt: string
  assignments: Assignment[]
  contacts: Contact[]
}

// ================================================================
// PROJECT DETAILS COMPONENT
// ================================================================
/**
 * ProjectDetails - Main project management interface
 * 
 * Features:
 * - View and edit all project properties
 * - Move project between lists
 * - Manage tasks, contacts, and files
 * - Auto-save functionality
 * - Delete project
 */
export default function ProjectDetails() {
  const { id } = useParams()
  const pid = useMemo(() => Number(id), [id])
  const nav = useNavigate()

  // ========== MAIN STATE ==========
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)

  // ========== EDITABLE PROJECT FIELDS ==========
  const [fName, setFName] = useState("")
  const [fDev, setFDev] = useState("")
  const [fStatus, setFStatus] = useState<Status>("ACTIVE")
  
  // Standard options (predefined templates)
  const STANDARD_OPTIONS = [
    "COMFORT", "COMFORT +", "COMFORT + GLASS",
    "SMART 1", "SMART 2", "SMART 3",
    "PRESTIGE 4", "PRESTIGE 5", "PRESTIGE 6",
  ]
  const [stdSelected, setStdSelected] = useState<string[]>([])
  const [stdNote, setStdNote] = useState("")
  
  const [fUnits, setFUnits] = useState<string>("")
  const [fScope, setFScope] = useState("")
  const [fStart, setFStart] = useState("") // yyyy-mm-dd
  const [fExec, setFExec] = useState<string>("")
  const [fRem, setFRem] = useState("")
  const [saving, setSaving] = useState(false)

  // ========== ASSIGNMENT FORM STATE ==========
  const [aTitle, setATitle] = useState("")
  const [aName, setAName] = useState("")
  const [aDue, setADue] = useState("")
  const [aNotes, setANotes] = useState("")
  const [busy, setBusy] = useState(false)
  
  // ========== CONTACT FORM STATE ==========
  const [cName, setCName] = useState("")
  const [cPhone, setCPhone] = useState("")
  const [cBusy, setCBusy] = useState(false)

  // ========== FILE STATE ==========
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // ========== LIST MOVEMENT STATE ==========
  const [moving, setMoving] = useState<ListKind | null>(null)
  const [mToast, setMToast] = useState<string | null>(null)

  // ========== DATA LOADING ==========
  /**
   * Load project data from API
   * Hydrates all form fields with current project data
   */
  const load = () => {
    setLoading(true)
    setError(null)
    
    apiFetch(`/projects/${pid}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((p: Project) => {
        setProject(p)
        
        // Hydrate form fields
        setFName(p.name ?? "")
        setFDev(p.developer ?? "")
        setFStatus(p.status)

        // Split existing standard into known options and free text note
        if (p.standard) {
          const tokens = p.standard
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)

          const selected: string[] = []
          const noteParts: string[] = []

          for (const t of tokens) {
            const upper = t.toUpperCase()
            if (STANDARD_OPTIONS.includes(upper)) selected.push(upper)
            else noteParts.push(t)
          }

          setStdSelected(selected)
          setStdNote(noteParts.join(", "))
        } else {
          setStdSelected([])
          setStdNote("")
        }

        setFUnits(p.units == null ? "" : String(p.units))
        setFScope(p.scopeValue ?? "")
        setFStart(p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "")
        setFExec(p.execution == null ? "" : String(p.execution))
        setFRem(p.remaining ?? "")
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  /**
   * Load project files from API
   */
  const loadFiles = () => {
    apiFetch(`/projects/${pid}/files`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setFiles)
      .catch(e => console.error("Failed to load files:", e))
  }

  // Load on mount and when pid changes
  useEffect(() => { 
    load()
    loadFiles() 
  }, [pid])

  // ========== AUTO-CALCULATION ==========
  /**
   * Debounced auto-calculation of remaining budget
   * Formula: remaining = scopeValue * (1 - execution / 100)
   * Updates 400ms after user stops typing
   */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const rawScope = fScope.trim()
      const numericScope = rawScope
        ? Number(rawScope.replace(/[^0-9]/g, ""))
        : NaN
      const e = fExec === "" ? NaN : Number(fExec)
      
      if (Number.isFinite(numericScope) && Number.isFinite(e)) {
        const clamped = Math.max(0, Math.min(100, e))
        const remainingPct = 100 - clamped
        const rem = Math.max(0, Math.round((numericScope * remainingPct) / 100))
        const next = String(rem)
        if (next !== fRem) setFRem(next)
      }
    }, 400)
    
    return () => window.clearTimeout(handle)
  }, [fScope, fExec, fRem])

  // ========== UTILITY FUNCTIONS ==========
  /**
   * Format ISO date string to localized date
   */
  const fmt = (iso: string | null) => 
    iso ? new Date(iso).toLocaleDateString() : "—"

  // ========== PROJECT LIST MOVEMENT ==========
  /**
   * Move project to a different list (Negotiation/Signed/Archive)
   * Shows confirmation dialog and feedback toast
   */
  const changeList = async (kind: ListKind) => {
    if (!project) return
    
    const label = kind === "NEGOTIATION" ? "משא ומתן" 
                : kind === "SIGNED" ? "חתומים" 
                : "ארכיון"
    
    if (!confirm(`האם אתה בטוח שברצונך להעביר ל${label}?`)) return
    
    setMoving(kind)
    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listKind: kind }),
      })
      if (!res.ok) throw new Error(await res.text())
      
      await load()
      setMToast(
        kind === "NEGOTIATION" ? "הועבר למשא ומתן" 
        : kind === "SIGNED" ? "הועבר לחתומים" 
        : "הועבר לארכיון"
      )
      setTimeout(() => setMToast(null), 1200)
    } catch (e: any) {
      alert("שגיאה בעדכון הרשימה: " + (e?.message || e))
    } finally {
      setMoving(null)
    }
  }

  // ========== PROJECT DETAILS SAVE ==========
  /**
   * Save edited project details to API
   */
  const saveDetails = async () => {
    if (!project) return

    const patch: Record<string, any> = {}
    patch.name = fName.trim() || undefined
    patch.developer = fDev.trim() === "" ? null : fDev.trim()
    patch.status = fStatus
    
    const stdCombined = stdSelected.join(', ')
    const stdRaw = (stdCombined || stdNote.trim())
      ? [stdCombined, stdNote.trim()].filter(Boolean).join(', ')
      : null
    patch.standard = stdRaw
    
    patch.units = fUnits === "" ? null : Number(fUnits)
    patch.scopeValue = fScope.trim() === "" ? null : fScope.trim()
    patch.startDate = fStart ? new Date(fStart) : null
    patch.execution = fExec === "" ? null : Number(fExec)
    patch.remaining = fRem.trim() === "" ? null : fRem.trim()

    setSaving(true)
    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) { 
      alert("שגיאה בשמירה: " + (e?.message || e)) 
    } finally { 
      setSaving(false) 
    }
  }

  // ========== ASSIGNMENT MANAGEMENT ==========
  /**
   * Add new assignment/task to project
   */
  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !aTitle.trim()) return
    
    setBusy(true)
    try {
      const payload: any = { title: aTitle.trim() }
      if (aName.trim()) payload.assigneeName = aName.trim()
      if (aNotes.trim()) payload.notes = aNotes.trim()
      if (aDue) payload.dueDate = aDue // 'YYYY-MM-DD' format
      
      const res = await apiFetch(`/projects/${project.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())

      await load()
      setATitle("")
      setAName("")
      setADue("")
      setANotes("")
    } catch (e: any) {
      alert("שגיאה בהוספת משימה: " + (e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Delete assignment from project
   */
  const deleteAssignment = async (assignmentId: number) => {
    if (!confirm("למחוק את המשימה?")) return
    
    try {
      const res = await apiFetch(`/assignments/${assignmentId}`, { 
        method: "DELETE" 
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) {
      alert("שגיאה במחיקת משימה: " + (e?.message || e))
    }
  }

  // ========== CONTACT MANAGEMENT ==========
  /**
   * Add new contact to project
   */
  const addContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !cName.trim() || !cPhone.trim()) return
    
    setCBusy(true)
    try {
      const res = await apiFetch(`/projects/${project.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName.trim(), phone: cPhone.trim() })
      })
      if (!res.ok) throw new Error(await res.text())
      
      await load()
      setCName("")
      setCPhone("")
    } catch (e: any) {
      alert("שגיאה בהוספת איש קשר: " + (e?.message || e))
    } finally {
      setCBusy(false)
    }
  }

  /**
   * Delete contact from project
   */
  const deleteContact = async (contactId: number) => {
    if (!confirm("למחוק את איש הקשר?")) return
    
    try {
      const res = await apiFetch(`/contacts/${contactId}`, { 
        method: "DELETE" 
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) {
      alert("שגיאה במחיקת איש קשר: " + (e?.message || e))
    }
  }

  // ========== FILE MANAGEMENT ==========
  /**
   * Upload files to project
   */
  const uploadFiles = async (fileList: FileList) => {
    if (!project) return
    
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData()
        formData.append("file", file)
        
        const res = await apiFetch(`/projects/${project.id}/files`, {
          method: "POST",
          body: formData,
        })
        if (!res.ok) throw new Error(await res.text())
      }
      await loadFiles()
    } catch (e: any) {
      alert("שגיאה בהעלאת קובץ: " + (e?.message || e))
    } finally {
      setUploading(false)
    }
  }

  /**
   * Handle file upload via input
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files)
      e.target.value = "" // Reset input
    }
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
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files)
    }
  }

  /**
   * Delete file from project
   */
  const deleteFile = async (fileId: number) => {
    if (!confirm("למחוק את הקובץ?")) return
    
    try {
      const res = await apiFetch(`/files/${fileId}`, { 
        method: "DELETE" 
      })
      if (!res.ok) throw new Error(await res.text())
      await loadFiles()
    } catch (e: any) {
      alert("שגיאה במחיקת קובץ: " + (e?.message || e))
    }
  }

  /**
   * Download file from project
   */
  const downloadFile = (fileId: number, fileName: string) => {
    // Create temporary link to force download
    const link = document.createElement('a')
    link.href = apiUrl(`/files/${fileId}`)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ========== PROJECT DELETION ==========
  /**
   * Delete entire project (with confirmation)
   * Navigates back to appropriate list after deletion
   */
  const deleteProject = async () => {
    if (!project) return
    if (!confirm("למחוק את הפרויקט? פעולה זו בלתי הפיכה.")) return
    
    setBusy(true)
    try {
      const res = await apiFetch(`/projects/${project.id}`, { 
        method: "DELETE" 
      })
      if (!res.ok) throw new Error(await res.text())
      
      // Navigate back to the relevant list
      const to =
        project.listKind === "NEGOTIATION" ? "/list/negotiation" :
        project.listKind === "SIGNED" ? "/list/signed" :
        "/list/archive"
      nav(to)
    } catch (e: any) { 
      alert("שגיאה במחיקה: " + (e?.message || e)) 
    } finally { 
      setBusy(false) 
    }
  }

  // ========== RENDER STATES ==========
  if (loading) return <div className="card">טוען…</div>
  if (error) return <div className="card">שגיאה: {error}</div>
  if (!project) return <div className="card">לא נמצא</div>

  // ========== MAIN RENDER ==========
  return (
    <>
      {/* ========== PAGE HEADER ========== */}
      <div className="pageHeader">
        <a
          className="back"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            if (!project) return
            const to =
              project.listKind === "NEGOTIATION" ? "/list/negotiation" :
              project.listKind === "SIGNED" ? "/list/signed" :
              "/list/archive"
            nav(to)
          }}
        >
          <span className="arrow">←</span> חזרה
        </a>
        <h1 className="h1">{project.name}</h1>
      </div>

      {/* Main container wrapping all sections */}
      <div className="card form">
        {/* ========== SECTION 1: LIST MOVEMENT ========== */}
        <div className="card mt0">
          <div className="row gap8">
            <button
              type="button"
              className={`btn ${project.listKind === "NEGOTIATION" ? "btn--primary" : ""} ${moving === "NEGOTIATION" ? "is-loading" : ""}`}
              onClick={() => changeList("NEGOTIATION")}
              disabled={!!moving}
            >
              {moving === "NEGOTIATION" ? "מעביר…" : "משא ומתן"}
            </button>
            <button
              type="button"
              className={`btn ${project.listKind === "SIGNED" ? "btn--primary" : ""} ${moving === "SIGNED" ? "is-loading" : ""}`}
              onClick={() => changeList("SIGNED")}
              disabled={!!moving}
            >
              {moving === "SIGNED" ? "מעביר…" : "חתומים"}
            </button>
            <button
              type="button"
              className={`btn ${project.listKind === "ARCHIVE" ? "btn--primary" : ""} ${moving === "ARCHIVE" ? "is-loading" : ""}`}
              onClick={() => changeList("ARCHIVE")}
              disabled={!!moving}
            >
              {moving === "ARCHIVE" ? "מעביר…" : "ארכיון"}
            </button>
            <div className="flex-1" />
            {mToast && <div className="muted">{mToast}</div>}
          </div>
        </div>

        {/* ========== SECTION 2: PROJECT DETAILS (EDITABLE) ========== */}
        <div className="card card--compact mt8 form form--md">
          <h3 className="h3 mt0">פרטי פרויקט</h3>
          
          {/* Project name */}
          <label className="label">שם פרויקט</label>
          <input 
            className="input" 
            value={fName} 
            onChange={e => setFName(e.target.value)} 
          />
          
          {/* Developer and Status */}
          <div className="grid2 mt14">
            <div>
              <label className="label">יזם</label>
              <input 
                className="input" 
                value={fDev} 
                onChange={e => setFDev(e.target.value)} 
              />
            </div>
            <div>
              <label className="label">סטטוס</label>
              <select 
                className="input" 
                value={fStatus} 
                onChange={e => setFStatus(e.target.value as Status)}
              >
                <option value="ACTIVE">נוצר פרוייקט</option>
                <option value="ON_HOLD">נוצר קשר ראשוני</option>
                <option value="COMPLETED">בוצעה פגישה ראשונה</option>
                <option value="QUOTE_GIVEN">ניתנה הצעת מחיר</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid2 mt14">
            <div>
              <label className="label">תאריך התחלה</label>
              <input 
                className="input" 
                type="date" 
                value={fStart}
                onChange={e => setFStart(e.target.value)} 
              />
            </div>
            <div>
              <label className="label">תאריך הוספה למערכת</label>
              <input 
                className="input" 
                value={fmt(project.createdAt)} 
                readOnly 
              />
            </div>
          </div>

          {/* Units and Scope */}
          <div className="grid2 mt14">
            <div>
              <label className="label">יח״ד</label>
              <input 
                className="input" 
                type="number" 
                min={0} 
                value={fUnits}
                onChange={e => setFUnits(e.target.value)} 
              />
            </div>
            <div>
              <label className="label">היקף</label>
              <input 
                className="input" 
                value={fScope} 
                onChange={e => setFScope(e.target.value)} 
              />
            </div>
          </div>

          {/* Execution and Remaining */}
          <div className="grid2">
            <div>
              <label className="label">ביצוע (%)</label>
              <input 
                className="input" 
                type="number" 
                min={0} 
                max={100} 
                value={fExec}
                onChange={e => setFExec(e.target.value)} 
              />
            </div>
            <div>
              <label className="label">יתרה</label>
              <input 
                className="input" 
                value={fRem} 
                onChange={e => setFRem(e.target.value)} 
              />
            </div>
          </div>

          {/* Standard selection */}
          <div className="mt14">
            <label className="label">סטנדרט (ניתן לבחור כמה)</label>
            <div className="row gap8">
              {STANDARD_OPTIONS.map(opt => {
                const active = stdSelected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`btn ${active ? 'btn--primary' : ''}`}
                    onClick={() => setStdSelected(
                      active 
                        ? stdSelected.filter(o => o !== opt) 
                        : [...stdSelected, opt]
                    )}
                    style={{ padding: '6px 10px' }}
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
                value={stdNote}
                onChange={e => setStdNote(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* ========== SECTION 3: ASSIGNMENTS (TASKS) ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">משימות</h3>
          
          {/* Add assignment form */}
          <div className="mb16">
            <h4 className="h4 mt0 mb12">הוספת משימה</h4>
            <form className="form" onSubmit={addAssignment}>
              <div>
                <label className="label">כותרת *</label>
                <input 
                  className="input" 
                  value={aTitle} 
                  onChange={e => setATitle(e.target.value)}
                  placeholder="לדוגמה: שליחת הצעת מחיר" 
                />
              </div>
              <div className="grid2">
                <div>
                  <label className="label">שם מטפל</label>
                  <input 
                    className="input" 
                    value={aName} 
                    onChange={e => setAName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="label">תאריך יעד</label>
                  <input 
                    className="input" 
                    type="date" 
                    value={aDue} 
                    onChange={e => setADue(e.target.value)} 
                  />
                </div>
              </div>
              <div>
                <label className="label">הערות</label>
                <input 
                  className="input" 
                  value={aNotes} 
                  onChange={e => setANotes(e.target.value)} 
                  placeholder="אופציונלי" 
                />
              </div>
              <div className="actions">
                <button 
                  type="submit" 
                  className="btn btn--primary" 
                  disabled={busy || !aTitle.trim()}
                >
                  הוספה
                </button>
              </div>
            </form>
          </div>

          {/* Assignments table */}
          <table className="table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>שם מטפל</th>
                <th>יעד</th>
                <th>הערות</th>
                <th>נוצר</th>
                <th className="cell-actions"></th>
              </tr>
            </thead>
            <tbody>
              {project.assignments.map(a => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.assigneeName || "—"}</td>
                  <td>{fmt(a.dueDate)}</td>
                  <td>{a.notes || "—"}</td>
                  <td>{fmt(a.createdAt)}</td>
                  <td className="cell-actions" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => deleteAssignment(a.id)}
                      title="מחיקת משימה"
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
              {project.assignments.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">אין משימות כרגע</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== SECTION 4: CONTACTS ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">אנשי קשר</h3>
          
          {/* Add contact form */}
          <form className="form" onSubmit={addContact}>
            <div className="grid2">
              <div>
                <label className="label">שם *</label>
                <input 
                  className="input" 
                  value={cName} 
                  onChange={e => setCName(e.target.value)} 
                />
              </div>
              <div>
                <label className="label">טלפון *</label>
                <input 
                  className="input" 
                  value={cPhone} 
                  onChange={e => setCPhone(e.target.value)} 
                />
              </div>
            </div>
            <div className="actions">
              <button 
                type="submit" 
                className="btn btn--primary" 
                disabled={cBusy || !cName.trim() || !cPhone.trim()}
              >
                הוספה
              </button>
            </div>
          </form>
          
          {/* Contacts table */}
          <table className="table mt12">
            <thead>
              <tr>
                <th>שם</th>
                <th>טלפון</th>
                <th>נוצר</th>
                <th className="cell-actions"></th>
              </tr>
            </thead>
            <tbody>
              {project.contacts.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{fmt(c.createdAt)}</td>
                  <td className="cell-actions cell-actions--tight">
                    <button 
                      type="button" 
                      className="btn btn--danger" 
                      onClick={() => deleteContact(c.id)}
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
              {project.contacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">לא נוספו אנשי קשר</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ========== SECTION 5: FILES ========== */}
        <div className="card mt8">
          <h3 className="h3 mt0">קבצים</h3>
          
          {/* Drag & drop zone */}
          <div
            className={`dropZone ${dragActive ? 'is-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <p className="dropZone__label">
              {uploading ? "מעלה קבצים..." : "גרור קבצים לכאן או"}
            </p>
            <label className="btn btn--primary" style={{ cursor: 'pointer' }}>
              {uploading ? "מעלה..." : "בחר קבצים"}
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Files table */}
          {files.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>שם קובץ</th>
                  <th>גודל</th>
                  <th>הועלה</th>
                  <th className="cell-actions"></th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td>
                      <span 
                        dir="ltr" 
                        style={{ display: 'inline-block', direction: 'ltr', unicodeBidi: 'embed' }}
                      >
                        {f.originalName}
                      </span>
                    </td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td>{fmt(f.createdAt)}</td>
                    <td className="cell-actions" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                      <button
                        type="button"
                        className="btn btn--primary ml8"
                        onClick={() => downloadFile(f.id, f.originalName)}
                        title="הורד קובץ"
                      >
                        📥 הורד
                      </button>
                      <button 
                        type="button" 
                        className="btn btn--danger" 
                        onClick={() => deleteFile(f.id)}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">לא הועלו קבצים</p>
          )}
        </div>

        {/* ========== BOTTOM ACTIONS ========== */}
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1 }} />
          <button 
            type="button" 
            className="btn btn--primary" 
            onClick={saveDetails} 
            disabled={saving || !fName.trim()}
          >
            {saving ? "שומר…" : "שמירה"}
          </button>
          <button 
            type="button" 
            className="btn btn--danger" 
            onClick={deleteProject} 
            disabled={busy}
          >
            מחיקת פרויקט
          </button>
        </div>
      </div>
    </>
  )
}
