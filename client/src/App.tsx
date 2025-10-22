import { Routes, Route, Link, useNavigate } from 'react-router-dom'

export default function App() {
  return (
    <div className="page">                       {/* centers everything */}
      <div className="container glass">          {/* nice glass panel */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/list/negotiation" element={<Placeholder title="מסע ומתן" />} />
          <Route path="/list/archive" element={<Placeholder title="ארכיון" />} />
          <Route path="/list/signed" element={<Placeholder title="חתומים" />} />
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

      <div className="row center">
        <button className="btn btn--primary" onClick={()=>nav('/list/negotiation')}>משא ומתן</button>
        <button className="btn btn--primary" onClick={()=>nav('/list/signed')}>חתומים</button>
        <button className="btn btn--primary" onClick={()=>nav('/list/archive')}>ארכיון</button>
      
      </div>

      <div className="spacer" />
      <p className="muted center">בחר רשימה כדי להמשיך. (כרגע תצוגות דמה — נבנה טבלאות בשלב הבא)</p>

      <div style={{marginTop:12}} className="center">
        <Link className="link" to="/list/negotiation">/list/negotiation</Link> ·{" "}
        <Link className="link" to="/list/archive">/list/archive</Link> ·{" "}
        <Link className="link" to="/list/signed">/list/signed</Link>
      </div>
    </>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <>
      <div className="pageHeader">
        <Link className="back" to="/">
          <span className="arrow">←</span>
          חזרה
        </Link>
        <h1 className="h1">{title}</h1>
      </div>

      <div className="glass">
        כאן תבוא טבלת הפרויקטים של: <b>{title}</b>
      </div>
    </>
  )
}
