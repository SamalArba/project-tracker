import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type ListKind = "NEGOTIATION" | "SIGNED" | "ARCHIVE";
type Status   = "ACTIVE" | "ON_HOLD" | "COMPLETED";

type Assignment = {
  id: number;
  title: string;
  notes: string | null;
  assigneeName: string | null;
  createdAt: string;      // ISO
  dueDate: string | null; // ISO
};

type Project = {
  id: number;
  name: string;
  developer: string | null;
  listKind: ListKind;
  status: Status;
  standard: string | null;
  units: number | null;
  scopeValue: string | null;
  startDate: string | null;
  execution: number | null;
  remaining: string | null;
  createdAt: string;
  assignments: Assignment[];
};

export default function ProjectDetails() {
  const { id } = useParams();
  const pid = useMemo(() => Number(id), [id]);
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  // Editable fields (always enabled)
  const [fName,   setFName]   = useState("");
  const [fDev,    setFDev]    = useState("");
  const [fStatus, setFStatus] = useState<Status>("ACTIVE");
  const [fStd,    setFStd]    = useState("");
  const [fUnits,  setFUnits]  = useState<string>("");
  const [fScope,  setFScope]  = useState("");
  const [fStart,  setFStart]  = useState(""); // yyyy-mm-dd
  const [fExec,   setFExec]   = useState<string>("");
  const [fRem,    setFRem]    = useState("");
  const [saving,  setSaving]  = useState(false);

  // add-assignment form
  const [aTitle, setATitle] = useState("");
  const [aName,  setAName]  = useState("");
  const [aDue,   setADue]   = useState("");
  const [aNotes, setANotes] = useState("");
  const [busy,   setBusy]   = useState(false);

  // list move feedback
  const [moving, setMoving] = useState<ListKind | null>(null);
  const [mToast, setMToast] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    fetch(`/api/projects/${pid}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((p: Project) => {
        setProject(p);
        // hydrate form
        setFName(p.name ?? "");
        setFDev(p.developer ?? "");
        setFStatus(p.status);
        setFStd(p.standard ?? "");
        setFUnits(p.units == null ? "" : String(p.units));
        setFScope(p.scopeValue ?? "");
        setFStart(p.startDate ? new Date(p.startDate).toISOString().slice(0,10) : "");
        setFExec(p.execution == null ? "" : String(p.execution));
        setFRem(p.remaining ?? "");
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [pid]);

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : "—";

  // move project between lists with feedback
  const changeList = async (kind: ListKind) => {
    if (!project) return;
    setMoving(kind);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listKind: kind }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setMToast(kind === "NEGOTIATION" ? "הועבר למשא ומתן" : kind === "SIGNED" ? "הועבר לחתומים" : "הועבר לארכיון");
      setTimeout(() => setMToast(null), 1200);
    } catch (e:any) {
      alert("שגיאה בעדכון הרשימה: " + (e?.message || e));
    } finally {
      setMoving(null);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const patch: Record<string, any> = {};
    patch.name       = fName.trim() || undefined;
    patch.developer  = fDev.trim()   === "" ? null : fDev.trim();
    patch.status     = fStatus;
    patch.standard   = fStd.trim()   === "" ? null : fStd.trim();
    patch.units      = fUnits === "" ? null : Number(fUnits);
    patch.scopeValue = fScope.trim() === "" ? null : fScope.trim();
    patch.startDate  = fStart ? new Date(fStart) : null;
    patch.execution  = fExec === "" ? null : Number(fExec);
    patch.remaining  = fRem.trim() === "" ? null : fRem.trim();

    setSaving(true);
    try{
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if(!res.ok) throw new Error(await res.text());
      await load();
    } catch(e:any){ alert("שגיאה בשמירה: " + (e?.message || e)); }
    finally{ setSaving(false); }
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !aTitle.trim()) return;
    setBusy(true);
    try {
      const payload: any = { title: aTitle.trim() };
      if (aName.trim())  payload.assigneeName = aName.trim();
      if (aNotes.trim()) payload.notes = aNotes.trim();
      if (aDue)          payload.dueDate = aDue; // 'YYYY-MM-DD' is fine

      const res = await fetch(`/api/projects/${project.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());

      await load();
      setATitle(""); setAName(""); setADue(""); setANotes("");
    } catch (e:any) {
      alert("שגיאה בהוספת משימה: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteAssignment = async (assignmentId: number) => {
  if (!confirm("למחוק את המשימה?")) return;
  try {
    const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    await load(); // refresh the list
  } catch (e:any) {
    alert("שגיאה במחיקת משימה: " + (e?.message || e));
  }
};


  const deleteProject = async () => {
    if (!project) return;
    if (!confirm("למחוק את הפרויקט? פעולה זו בלתי הפיכה.")) return;
    setBusy(true);
    try{
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if(!res.ok) throw new Error(await res.text());
      // go back to the relevant list
      const to =
        project.listKind === "NEGOTIATION" ? "/list/negotiation" :
        project.listKind === "SIGNED"       ? "/list/signed" :
                                              "/list/archive";
      nav(to);
    } catch(e:any){ alert("שגיאה במחיקה: " + (e?.message || e)); }
    finally{ setBusy(false); }
  };

  if (loading) return <div className="card">טוען…</div>;
  if (error)   return <div className="card">שגיאה: {error}</div>;
  if (!project) return <div className="card">לא נמצא</div>;

  return (
    <>
      <div className="pageHeader">
        <a
          className="back"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!project) return;
            const to =
              project.listKind === "NEGOTIATION" ? "/list/negotiation" :
              project.listKind === "SIGNED"       ? "/list/signed" :
                                                    "/list/archive";
            nav(to);
          }}
        >
          <span className="arrow">←</span> חזרה
        </a>
        <h1 className="h1">{project.name}</h1>
      </div>

      {/* ===== move between lists (feedback) ===== */}
      <div className="card">
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
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

          <div style={{ flex: 1 }} />
          {mToast && <div className="muted">{mToast}</div>}
        </div>
      </div>

      {/* ===== always-editable details ===== */}
      <form className="card form" onSubmit={saveEdit}>
        <div>
          <label className="label">שם פרוייקט *</label>
          <input className="input" value={fName} onChange={e=>setFName(e.target.value)} />
        </div>

        <div className="grid2">
          <div>
            <label className="label">יזם</label>
            <input className="input" value={fDev} onChange={e=>setFDev(e.target.value)} />
          </div>
          <div>
            <label className="label">סטטוס</label>
            <select className="input" value={fStatus} onChange={e=>setFStatus(e.target.value as Status)}>
              <option value="ACTIVE">פעיל</option>
              <option value="ON_HOLD">מושהה</option>
              <option value="COMPLETED">הושלם</option>
            </select>
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="label">סטנדרט</label>
            <input className="input" value={fStd} onChange={e=>setFStd(e.target.value)} />
          </div>
          <div>
            <label className="label">יח״ד</label>
            <input className="input" type="number" min={0} value={fUnits}
                   onChange={e=>setFUnits(e.target.value)} />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="label">היקף</label>
            <input className="input" value={fScope} onChange={e=>setFScope(e.target.value)} />
          </div>
          <div>
            <label className="label">תאריך התחלה</label>
            <input className="input" type="date" value={fStart}
                   onChange={e=>setFStart(e.target.value)} />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="label">ביצוע (%)</label>
            <input className="input" type="number" min={0} max={100} value={fExec}
                   onChange={e=>setFExec(e.target.value)} />
          </div>
          <div>
            <label className="label">יתרה</label>
            <input className="input" value={fRem} onChange={e=>setFRem(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <div style={{ flex: 1 }} />
          <button type="submit" className="btn btn--primary" disabled={saving || !fName.trim()}>
            {saving ? "שומר…" : "שמירה"}
          </button>
          <button type="button" className="btn btn--danger" onClick={deleteProject} disabled={busy}>
            מחיקת פרויקט
          </button>
        </div>
      </form>

      {/* ===== add assignment ===== */}
      <div className="card">
        <h3 className="h3" style={{ marginTop: 0 }}>הוספת משימה</h3>
        <form className="form" onSubmit={addAssignment}>
          <div>
            <label className="label">כותרת *</label>
            <input className="input" value={aTitle} onChange={e=>setATitle(e.target.value)}
                   placeholder="לדוגמה: שליחת הצעת מחיר" />
          </div>
          <div className="grid2">
            <div>
              <label className="label">שם מטפל</label>
              <input className="input" value={aName} onChange={e=>setAName(e.target.value)} />
            </div>
            <div>
              <label className="label">תאריך יעד</label>
              <input className="input" type="date" value={aDue} onChange={e=>setADue(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">הערות</label>
            <input className="input" value={aNotes} onChange={e=>setANotes(e.target.value)} placeholder="אופציונלי" />
          </div>
          <div className="actions">
            <button type="submit" className="btn btn--primary" disabled={busy || !aTitle.trim()}>הוספה</button>
          </div>
        </form>
      </div>

      {/* ===== assignments table ===== */}
      <div className="card">
        <h3 className="h3" style={{ marginTop: 0 }}>משימות</h3>
        <table className="table">
  <thead>
    <tr>
      <th>כותרת</th>
      <th>שם מטפל</th>
      <th>יעד</th>
      <th>הערות</th>
      <th>נוצר</th>
      <th></th> {/* actions */}
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
        <td>
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
      <tr><td colSpan={6} className="muted">אין משימות כרגע</td></tr>
    )}
     </tbody>
     </table>
      </div>
    </>
  );
}
