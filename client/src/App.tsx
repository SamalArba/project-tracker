import { Routes, Route, useNavigate } from 'react-router-dom'
import Negotiation from './pages/Negotiation'
import Archive from './pages/Archive'
import Signed from './pages/Signed'
import NewProject from './pages/NewProject'
import ProjectDetails from './pages/ProjectDetails';


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

function Home() {
  const nav = useNavigate()
  return (
    <>
      <h1 className="h1 center">מערכת מעקב פרויקטים</h1>

      <div className="grid3">
        <button className="btn btn--primary btn--block btn--lg" onClick={() => nav('/list/negotiation')}>
          משא ומתן
        </button>
        <button className="btn btn--primary btn--block btn--lg" onClick={() => nav('/list/signed')}>
          חתומים
        </button>
        <button className="btn btn--primary btn--block btn--lg" onClick={() => nav('/list/archive')}>
          ארכיון
        </button>
      </div>

      <div className="spacer" />
      <div className="spacer" />

      <button
        className="btn btn--primary btn--block btn--lg"
        onClick={() => nav('/project/new')}
        aria-label="יצירת פרויקט חדש"
      >
        יצירת פרויקט חדש
      </button>

      <div className="spacer" />
      <p className="muted center">בחר רשימה או צור פרויקט חדש.</p>
    </>
  )
}

