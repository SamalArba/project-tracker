/**
 * ================================================================
 * App.tsx - Main Application Component
 * ================================================================
 * 
 * This is the root component of the project tracker application.
 * It defines all routes and contains the home page component.
 * 
 * Routes:
 * - / : Home page with navigation to different sections
 * - /list/negotiation : Projects in negotiation phase
 * - /list/signed : Signed projects
 * - /list/archive : Archived projects
 * - /project/new : Create new project
 * - /project/:id : View/edit project details
 */

// ================================================================
// IMPORTS
// ================================================================
import type React from 'react'
import { useRef, type JSX } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import Negotiation from './pages/Negotiation'
import Archive from './pages/Archive'
import Signed from './pages/Signed'
import NewProject from './pages/NewProject'
import ProjectDetails from './pages/ProjectDetails'
import Login from './pages/Login'
import { apiFetch, getAuthToken } from './api'

// ================================================================
// MAIN APP COMPONENT
// ================================================================
/**
 * App - Root component with routing configuration
 * 
 * Wraps all routes in a glassmorphic container with
 * a centered page layout.
 */
function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getAuthToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <div className="page">
      <div className="container glass">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/list/negotiation"
            element={
              <RequireAuth>
                <Negotiation />
              </RequireAuth>
            }
          />
          <Route
            path="/list/archive"
            element={
              <RequireAuth>
                <Archive />
              </RequireAuth>
            }
          />
          <Route
            path="/list/signed"
            element={
              <RequireAuth>
                <Signed />
              </RequireAuth>
            }
          />
          <Route
            path="/project/new"
            element={
              <RequireAuth>
                <NewProject />
              </RequireAuth>
            }
          />
          <Route
            path="/project/:id"
            element={
              <RequireAuth>
                <ProjectDetails />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </div>
  )
}

// ================================================================
// HOME PAGE COMPONENT
// ================================================================
/**
 * Home - Landing page with navigation to main sections
 * 
 * Displays:
 * - Title of the system
 * - Backup/restore controls for all project lists
 * - Three main list categories (Negotiation, Signed, Archive)
 * - Button to create a new project
 */
function Home() {
  const nav = useNavigate()
  const restoreInputRef = useRef<HTMLInputElement | null>(null)

  const downloadBackup = async () => {
    try {
      const res = await apiFetch('/backup')
      if (!res.ok) {
        throw new Error('backup_export_failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `project-backup-${date}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Backup export error', err)
      alert('אירעה שגיאה ביצוא הגיבוי')
    }
  }

  const triggerRestoreFile = () => {
    restoreInputRef.current?.click()
  }

  const handleRestoreFileChange: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      JSON.parse(text)

      const res = await apiFetch('/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      })

      if (!res.ok) {
        throw new Error('backup_import_failed')
      }

      alert('הגיבוי שוחזר בהצלחה. ייתכן שתצטרך לרענן את הדף.')
    } catch (err) {
      console.error('Backup import error', err)
      alert('אירעה שגיאה בטעינת קובץ הגיבוי')
    } finally {
      e.target.value = ''
    }
  }
  
  return (
    <>
      {/* Page title */}
      <h1 className="h1 center">מערכת מעקב פרויקטים</h1>

      {/* Main navigation grid - 3 list categories */}
      <div className="grid3">
        <button 
          className="btn btn--primary btn--block btn--lg" 
          onClick={() => nav('/list/negotiation')}
        >
          משא ומתן
        </button>
        <button 
          className="btn btn--primary btn--block btn--lg" 
          onClick={() => nav('/list/signed')}
        >
          חתומים
        </button>
        <button 
          className="btn btn--primary btn--block btn--lg" 
          onClick={() => nav('/list/archive')}
        >
          ארכיון
        </button>
      </div>

      {/* Spacing */}
      <div className="spacer" />

      {/* New project button */}
      <button
        className="btn btn--primary btn--block btn--lg"
        onClick={() => nav('/project/new')}
        aria-label="יצירת פרויקט חדש"
      >
        יצירת פרויקט חדש
      </button>

      {/* Backup controls for all lists */}
      <div
        className="row"
        style={{
          marginTop: 16,
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={downloadBackup}
          className="btn btn--primary"
          style={{ minWidth: 130 }}
        >
          גיבוי למחשב
        </button>
        <button
          onClick={triggerRestoreFile}
          className="btn btn--danger"
          style={{ minWidth: 130 }}
        >
          טעינת גיבוי
        </button>
        <button
          className="btn"
          style={{ minWidth: 130 }}
          onClick={() => {
            localStorage.removeItem('authToken')
            nav('/login', { replace: true })
          }}
        >
          התנתק
        </button>
      </div>

      {/* Help text */}
      <div className="spacer" />
      <p className="muted center">בחר רשימה או צור פרויקט חדש.</p>

      {/* Hidden file input for restore */}
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleRestoreFileChange}
      />
    </>
  )
}

