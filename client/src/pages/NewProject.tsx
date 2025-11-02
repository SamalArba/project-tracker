import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

type ListKind = 'NEGOTIATION' | 'ARCHIVE' | 'SIGNED'
type Status = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'

export default function NewProject() {
  const nav = useNavigate()

  // basic fields
  const [name, setName] = useState('')
  const [developer, setDeveloper] = useState('')
  const [listKind, setListKind] = useState<ListKind>('NEGOTIATION')
  const [status, setStatus] = useState<Status>('ACTIVE')
  const [standard, setStandard] = useState('')
  const [units, setUnits] = useState<number | ''>('')
  const [scopeValue, setScopeValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [execution, setExecution] = useState<number | ''>('')
  const [remaining, setRemaining] = useState('')

  // initial assignment (optional)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskAssigneeName, setTaskAssigneeName] = useState('')

  // initial contacts (optional)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [initialContacts, setInitialContacts] = useState<Array<{name: string, phone: string}>>([])

  // ui state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid =
    name.trim().length > 0 &&
    (execution === '' || (typeof execution === 'number' && execution >= 0 && execution <= 100))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true); setError(null)

    const payload: any = {
      name: name.trim(),
      developer: developer.trim() || undefined,
      listKind,
      status,
      standard: standard.trim() || undefined,
      units: units === '' ? undefined : Number(units),
      scopeValue: scopeValue.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      execution: execution === '' ? undefined : Number(execution),
      remaining: remaining.trim() || undefined,
    }

    if (taskTitle.trim()) {
      payload.initialAssignment = {
        title: taskTitle.trim(),
        assigneeName: taskAssigneeName.trim() || undefined,
      }
    }

    if (initialContacts.length > 0) {
      payload.initialContacts = initialContacts
    }

    try {
      const res = await fetch('/api/projects', {
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

  // Debounced auto-calc remaining from scopeValue and execution (always updates)
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const numericScope = scopeValue
        ? Number(scopeValue.replace(/[^0-9]/g, ''))
        : NaN
      const e = typeof execution === 'number' ? execution : NaN
      if (Number.isFinite(numericScope) && Number.isFinite(e)) {
        const rem = Math.max(0, Math.round(numericScope * e / 100))
        const next = String(rem)
        if (next !== remaining) setRemaining(next)
      }
    }, 400)
    return () => window.clearTimeout(handle)
  }, [scopeValue, execution, remaining])

  const addContactToList = () => {
    if (contactName.trim() && contactPhone.trim()) {
      setInitialContacts([...initialContacts, { name: contactName.trim(), phone: contactPhone.trim() }])
      setContactName('')
      setContactPhone('')
    }
  }

  const removeContactFromList = (index: number) => {
    setInitialContacts(initialContacts.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="pageHeader">
        <Link className="back" to="/"><span className="arrow">←</span>חזרה</Link>
        <h1 className="h1">יצירת פרויקט חדש</h1>
      </div>

      <form className="card form" onSubmit={onSubmit}>
        {error && <div className="error">{error}</div>}

        <div>
          <label className="label">שם פרויקט *</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="לדוגמה: פרויקט א" />
        </div>

        <div className="grid2">
          <div>
            <label className="label">יזם</label>
            <input className="input" value={developer} onChange={e=>setDeveloper(e.target.value)} placeholder="לדוגמה: יזם בע״מ" />
          </div>
          <div>
            <label className="label">רשימה</label>
            <select className="input" value={listKind} onChange={e=>setListKind(e.target.value as ListKind)}>
              <option value="NEGOTIATION">משא ומתן</option>
              <option value="ARCHIVE">ארכיון</option>
              <option value="SIGNED">חתומים</option>
            </select>
          </div>
        </div>
        
        <div className="grid2">
          <div>
            <label className="label">סטטוס</label>
            <select className="input" value={status} onChange={e=>setStatus(e.target.value as Status)}>
              <option value="ACTIVE">פעיל</option>
              <option value="ON_HOLD">מושהה</option>
              <option value="COMPLETED">הושלם</option>
            </select>
          </div>
          <div>
            <label className="label">סטנדרט</label>
            <input className="input" value={standard} onChange={e=>setStandard(e.target.value)} placeholder="רגיל / גבוה / מותאם" />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="label">יח״ד</label>
            <input
              className="input" type="number" min={0}
              value={units}
              onChange={e=>setUnits(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="לדוגמה: 120"
            />
          </div>
          <div>
            <label className="label">היקף</label>
            <input className="input" value={scopeValue} onChange={e=>setScopeValue(e.target.value)} placeholder="₪ / תיאור חופשי" />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="label">תאריך התחלה</label>
            <input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">ביצוע (%)</label>
            <input
              className="input" type="number" min={0} max={100}
              value={execution}
              onChange={e=>setExecution(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0–100"
            />
          </div>
        </div>

        <div>
          <label className="label">יתרה</label>
          <input className="input" value={remaining} onChange={e=>setRemaining(e.target.value)} placeholder="טקסט חופשי / ₪" />
        </div>

        {/* Initial assignment (optional) */}
        <div className="card" style={{marginTop:8}}>
          <h3 className="h3" style={{marginTop:0}}>משימה ראשונית (אופציונלי)</h3>
          <div className="grid2">
            <input className="input" placeholder="כותרת משימה"
                   value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} />
            <input className="input" placeholder="שם מטפל"
                   value={taskAssigneeName} onChange={e=>setTaskAssigneeName(e.target.value)} />
          </div>
          <div className="helper">אפשר להשאיר ריק — תמיד תוכלו להוסיף משימות מאוחר יותר</div>
        </div>

        {/* Initial contacts (optional) */}
        <div className="card" style={{marginTop:8}}>
          <h3 className="h3" style={{marginTop:0}}>אנשי קשר ראשוניים (אופציונלי)</h3>
          <div className="grid2">
            <input className="input" placeholder="שם"
                   value={contactName} onChange={e=>setContactName(e.target.value)} />
            <input className="input" placeholder="טלפון"
                   value={contactPhone} onChange={e=>setContactPhone(e.target.value)} />
          </div>
          <div className="actions" style={{marginTop:8}}>
            <button type="button" className="btn btn--primary" onClick={addContactToList} disabled={!contactName.trim() || !contactPhone.trim()}>
              הוסף איש קשר
            </button>
          </div>
          {initialContacts.length > 0 && (
            <div style={{marginTop:12}}>
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
                      <td className="cell-actions" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                        <button type="button" className="btn btn--danger" onClick={() => removeContactFromList(i)}>הסר</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="helper">אפשר להשאיר ריק — תמיד תוכלו להוסיף אנשי קשר מאוחר יותר</div>
        </div>

        {!valid && <div className="error">שם פרויקט חובה, וביצוע (אם מולא) חייב להיות בין 0 ל-100.</div>}

        <div className="actions">
          <button type="button" className="btn" onClick={()=>nav(-1)}>ביטול</button>
          <button type="submit" className="btn btn--primary" disabled={!valid || saving}>
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </div>
      </form>
    </>
  )
}
