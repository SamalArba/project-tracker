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
import { Routes, Route, useNavigate } from 'react-router-dom'
import Negotiation from './pages/Negotiation'
import Archive from './pages/Archive'
import Signed from './pages/Signed'
import NewProject from './pages/NewProject'
import ProjectDetails from './pages/ProjectDetails'

// ================================================================
// MAIN APP COMPONENT
// ================================================================
/**
 * App - Root component with routing configuration
 * 
 * Wraps all routes in a glassmorphic container with
 * a centered page layout.
 */
export default function App() {
  return (
    <div className="page">
      <div className="container glass">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list/negotiation" element={<Negotiation />} />
          <Route path="/list/archive" element={<Archive />} />
          <Route path="/list/signed" element={<Signed />} />
          <Route path="/project/new" element={<NewProject />} />
          <Route path="/project/:id" element={<ProjectDetails />} />
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
 * - Three main list categories (Negotiation, Signed, Archive)
 * - Button to create a new project
 */
function Home() {
  const nav = useNavigate()
  
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
      <div className="spacer" />

      {/* New project button */}
      <button
        className="btn btn--primary btn--block btn--lg"
        onClick={() => nav('/project/new')}
        aria-label="יצירת פרויקט חדש"
      >
        יצירת פרויקט חדש
      </button>

      {/* Help text */}
      <div className="spacer" />
      <p className="muted center">בחר רשימה או צור פרויקט חדש.</p>
    </>
  )
}

