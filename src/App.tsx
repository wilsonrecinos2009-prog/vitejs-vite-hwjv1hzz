import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBeLWj_MVt_R0ddreAtJ3QlQ7WMCP8BSj4",
  authDomain: "demeritosescolar-579bb.firebaseapp.com",
  projectId: "demeritosescolar-579bb",
  storageBucket: "demeritosescolar-579bb.firebasestorage.app",
  messagingSenderId: "634409790935",
  appId: "1:634409790935:web:29f885a96b9506a61a6f92"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const REASONS = [
  "Llegada tarde", "Tarea incompleta", "Comportamiento en clase",
  "Falta injustificada", "Uniforme incompleto", "Uso de celular",
  "Falta de respeto", "Deshonestidad académica", "Otro",
];

function getRiskLevel(demerits) {
  if (demerits === 0) return { label: "Excelente", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (demerits <= 5) return { label: "Bajo riesgo", color: "#84cc16", bg: "rgba(132,204,22,0.12)" };
  if (demerits <= 10) return { label: "Atención", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  if (demerits <= 15) return { label: "Alto riesgo", color: "#f97316", bg: "rgba(249,115,22,0.12)" };
  return { label: "Crítico", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
}

function getAvatarColor(name) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f59e0b","#10b981"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function DemeritosApp() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add");
  const [form, setForm] = useState({ reason: REASONS[0], points: 1, customReason: "" });
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "" });

  // Escuchar cambios en Firestore en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(data);
      setLoading(false);
      const high = data.filter(s => s.demerits > 10);
      setNotifications(high.map(s => ({
        id: s.id, message: `${s.name} tiene ${s.demerits} deméritos (${getRiskLevel(s.demerits).label})`,
        level: getRiskLevel(s.demerits),
      })));
    });
    return () => unsub();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = (student, type) => {
    setSelectedStudent(student);
    setModalType(type);
    setForm({ reason: REASONS[0], points: 1, customReason: "" });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const reason = form.reason === "Otro" ? form.customReason : form.reason;
    const pts = parseInt(form.points);
    if (!reason || pts < 1) return;
    const today = new Date().toISOString().split("T")[0];
    const ref = doc(db, "students", selectedStudent.id);
    const newDemerits = modalType === "add"
      ? selectedStudent.demerits + pts
      : Math.max(0, selectedStudent.demerits - pts);
    await updateDoc(ref, {
      demerits: newDemerits,
      history: arrayUnion({ date: today, reason, points: pts, type: modalType }),
    });
    setShowModal(false);
    showToast(
      modalType === "add"
        ? `+${pts} deméritos asignados a ${selectedStudent.name}`
        : `-${pts} deméritos removidos de ${selectedStudent.name}`,
      modalType === "add" ? "warning" : "success"
    );
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.grade) return;
    const initials = newStudent.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
    const id = Date.now().toString();
    await setDoc(doc(db, "students", id), {
      name: newStudent.name, grade: newStudent.grade,
      avatar: initials, demerits: 0, history: [],
    });
    setAddStudentModal(false);
    setNewStudent({ name: "", grade: "" });
    showToast(`${newStudent.name} agregado exitosamente`);
  };

  const sorted = [...students]
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.grade.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.demerits - a.demerits);

  const totalDemerits = students.reduce((sum, s) => sum + s.demerits, 0);
  const criticalCount = students.filter(s => s.demerits > 10).length;
  const topStudents = [...students].sort((a, b) => b.demerits - a.demerits).slice(0, 3);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e2e8f0",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes slideIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes toastIn { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .card { background:#111827; border:1px solid #1f2937; border-radius:16px; transition:all .2s; }
        .card:hover { border-color:#374151; transform:translateY(-2px); }
        .btn { border:none; cursor:pointer; font-family:inherit; font-weight:600; border-radius:10px; transition:all .15s; }
        .btn:hover { transform:translateY(-1px); filter:brightness(1.1); }
        .btn:active { transform:translateY(0); }
        .nav-item { cursor:pointer; padding:10px 18px; border-radius:10px; font-weight:500; font-size:14px; transition:all .2s; display:flex;align-items:center;gap:8px; }
        .nav-item:hover { background:rgba(255,255,255,0.06); }
        .nav-item.active { background:rgba(99,102,241,0.2); color:#818cf8; }
        .input { background:#1a2035; border:1px solid #2d3748; border-radius:10px; color:#e2e8f0; font-family:inherit; font-size:14px; padding:10px 14px; width:100%; transition:border .2s; outline:none; }
        .input:focus { border-color:#6366f1; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fadeIn .2s; }
        .modal { background:#111827;border:1px solid #1f2937;border-radius:20px;padding:28px;width:420px;max-width:95vw;animation:slideIn .25s; }
        .badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; letter-spacing:.5px; }
        .progress-bar { height:6px; border-radius:3px; background:#1f2937; overflow:hidden; }
        .progress-fill { height:100%; border-radius:3px; transition:width .8s cubic-bezier(.34,1.56,.64,1); }
        .student-row { display:grid; grid-template-columns:48px 1fr auto auto; align-items:center; gap:16px; padding:14px 18px; border-radius:14px; border:1px solid #1f2937; background:#111827; margin-bottom:8px; animation:slideIn .3s; transition:all .2s; }
        .student-row:hover { border-color:#374151; background:#131a2e; }
      `}</style>

      {/* Header */}
      <header style={{ background:"#0d1117", borderBottom:"1px solid #1f2937", padding:"0 24px", display:"flex", alignItems:"center", gap:24, height:64, position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚡</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, letterSpacing:"-0.5px" }}>DemeritOS</span>
          <span style={{ fontSize:11, color:"#4b5563", fontWeight:500, marginLeft:2 }}>Escolar</span>
        </div>
        <nav style={{ display:"flex", gap:4, flex:1 }}>
          {[["dashboard","📊","Dashboard"],["students","👥","Estudiantes"],["ranking","🏆","Ranking"],["alerts","🔔","Alertas"]].map(([v, icon, label]) => (
            <div key={v} className={`nav-item ${view===v?"active":""}`} onClick={() => setView(v)}>
              <span>{icon}</span><span>{label}</span>
              {v==="alerts" && notifications.length > 0 && (
                <span style={{ background:"#ef4444", color:"#fff", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{notifications.length}</span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", display:"inline-block", boxShadow:"0 0 6px #22c55e" }} />
          <span style={{ fontSize:12, color:"#6b7280" }}>Firebase conectado</span>
        </div>
        <button className="btn" onClick={() => setAddStudentModal(true)} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", padding:"9px 18px", fontSize:14 }}>+ Estudiante</button>
      </header>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:80, right:24, zIndex:200, animation:"toastIn .3s",
          background: toast.type==="warning" ? "#92400e" : toast.type==="error" ? "#7f1d1d" : "#064e3b",
          border:`1px solid ${toast.type==="warning"?"#d97706":toast.type==="error"?"#ef4444":"#10b981"}`,
          borderRadius:12, padding:"12px 18px", fontSize:14, fontWeight:500, maxWidth:340, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ width:40, height:40, border:"3px solid #1f2937", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
          <p style={{ color:"#6b7280", fontSize:14 }}>Conectando con Firebase...</p>
        </div>
      ) : (
      <main style={{ flex:1, padding:24, maxWidth:1200, margin:"0 auto", width:"100%" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div style={{ animation:"slideIn .3s" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:4 }}>Panel General</h1>
            <p style={{ color:"#6b7280", fontSize:14, marginBottom:24 }}>Datos sincronizados en tiempo real con Firebase ☁️</p>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
              {[
                { label:"Total Estudiantes", value:students.length, icon:"👥", color:"#6366f1" },
                { label:"Deméritos Totales", value:totalDemerits, icon:"⚡", color:"#f59e0b" },
                { label:"En Zona Crítica", value:criticalCount, icon:"🚨", color:"#ef4444" },
                { label:"Sin Deméritos", value:students.filter(s=>s.demerits===0).length, icon:"✅", color:"#22c55e" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="card" style={{ padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <p style={{ color:"#6b7280", fontSize:12, fontWeight:600, letterSpacing:".5px", textTransform:"uppercase", marginBottom:8 }}>{label}</p>
                      <p style={{ fontSize:36, fontWeight:800, fontFamily:"'Syne',sans-serif", color, lineHeight:1 }}>{value}</p>
                    </div>
                    <span style={{ fontSize:28 }}>{icon}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div className="card" style={{ padding:20 }}>
                <h3 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>🔥 Top Deméritos</h3>
                {topStudents.length === 0 ? <p style={{ color:"#6b7280", fontSize:13 }}>Aún no hay estudiantes.</p> : topStudents.map((s, i) => {
                  const risk = getRiskLevel(s.demerits);
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <span style={{ fontSize:20 }}>{["🥇","🥈","🥉"][i]}</span>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:getAvatarColor(s.name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{s.avatar}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                        <div className="progress-bar" style={{ marginTop:4 }}>
                          <div className="progress-fill" style={{ width:`${Math.min(100,(s.demerits/20)*100)}%`, background:risk.color }} />
                        </div>
                      </div>
                      <span style={{ fontWeight:800, color:risk.color, fontSize:18 }}>{s.demerits}</span>
                    </div>
                  );
                })}
              </div>

              <div className="card" style={{ padding:20 }}>
                <h3 style={{ fontWeight:700, marginBottom:16, fontSize:15 }}>📋 Actividad Reciente</h3>
                {students.flatMap(s => (s.history||[]).map(h => ({ ...h, studentName: s.name }))).sort((a,b) => b.date.localeCompare(a.date)).slice(0,6).map((h, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"8px 12px", background:"#0d1117", borderRadius:10 }}>
                    <span style={{ fontSize:14 }}>{h.type==="add"?"🔴":"🟢"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{h.studentName}</div>
                      <div style={{ fontSize:11, color:"#6b7280" }}>{h.reason} · {h.date}</div>
                    </div>
                    <span style={{ fontWeight:700, color: h.type==="add"?"#ef4444":"#22c55e", fontSize:13 }}>
                      {h.type==="add"?"+":"-"}{h.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {view === "students" && (
          <div style={{ animation:"slideIn .3s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:2 }}>Estudiantes</h1>
                <p style={{ color:"#6b7280", fontSize:14 }}>{sorted.length} registrados</p>
              </div>
              <input className="input" placeholder="🔍 Buscar por nombre o grupo..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:280 }} />
            </div>
            {sorted.length === 0 && <div className="card" style={{ padding:40, textAlign:"center", color:"#6b7280" }}>No hay estudiantes aún. ¡Agrega el primero!</div>}
            {sorted.map(s => {
              const risk = getRiskLevel(s.demerits);
              return (
                <div key={s.id} className="student-row">
                  <div style={{ width:46, height:46, borderRadius:"50%", background:getAvatarColor(s.name), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:14, flexShrink:0 }}>{s.avatar}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{s.name}</div>
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Grupo: {s.grade} · {(s.history||[]).length} registros</div>
                    <div className="progress-bar" style={{ width:180, marginTop:6 }}>
                      <div className="progress-fill" style={{ width:`${Math.min(100,(s.demerits/20)*100)}%`, background:risk.color }} />
                    </div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:800, fontFamily:"'Syne',sans-serif", color:risk.color }}>{s.demerits}</div>
                    <span className="badge" style={{ background:risk.bg, color:risk.color }}>{risk.label}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <button className="btn" onClick={() => openModal(s, "add")} style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", padding:"7px 14px", fontSize:13 }}>+ Demérito</button>
                    <button className="btn" onClick={() => openModal(s, "remove")} style={{ background:"rgba(34,197,94,0.15)", color:"#22c55e", padding:"7px 14px", fontSize:13 }}>− Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RANKING */}
        {view === "ranking" && (
          <div style={{ animation:"slideIn .3s" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:4 }}>🏆 Ranking</h1>
            <p style={{ color:"#6b7280", fontSize:14, marginBottom:24 }}>Ordenado por cantidad de deméritos</p>
            {[...students].sort((a,b) => b.demerits - a.demerits).map((s, i) => {
              const risk = getRiskLevel(s.demerits);
              const max = students.reduce((m, x) => Math.max(m, x.demerits), 1);
              return (
                <div key={s.id} className="card" style={{ padding:"16px 20px", marginBottom:10, display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:36, textAlign:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color: i===0?"#fbbf24":i===1?"#9ca3af":i===2?"#cd7c2f":"#4b5563" }}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                  </div>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:getAvatarColor(s.name), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:13 }}>{s.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:15 }}>{s.name} <span style={{ color:"#6b7280", fontWeight:400, fontSize:13 }}>· {s.grade}</span></div>
                    <div className="progress-bar" style={{ marginTop:6 }}>
                      <div className="progress-fill" style={{ width:`${(s.demerits/max)*100}%`, background:risk.color }} />
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif", color:risk.color }}>{s.demerits}</span>
                    <div><span className="badge" style={{ background:risk.bg, color:risk.color }}>{risk.label}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ALERTS */}
        {view === "alerts" && (
          <div style={{ animation:"slideIn .3s" }}>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, marginBottom:4 }}>🔔 Alertas</h1>
            <p style={{ color:"#6b7280", fontSize:14, marginBottom:24 }}>Estudiantes que requieren atención</p>
            {notifications.length === 0 ? (
              <div className="card" style={{ padding:48, textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                <p style={{ fontWeight:600, fontSize:18 }}>¡Todo en orden!</p>
                <p style={{ color:"#6b7280", marginTop:4 }}>Ningún estudiante tiene más de 10 deméritos.</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className="card" style={{ padding:"16px 20px", marginBottom:10, borderColor:n.level.color, borderLeftWidth:4, display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:28, animation:"pulse 2s infinite" }}>⚠️</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:15 }}>{n.message}</p>
                  <p style={{ color:"#6b7280", fontSize:12, marginTop:2 }}>Se recomienda notificar a los padres y citar al estudiante.</p>
                </div>
                <button className="btn" onClick={() => setView("students")} style={{ background:n.level.bg, color:n.level.color, padding:"8px 14px", fontSize:13 }}>Ver lista</button>
              </div>
            ))}

            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, marginTop:28, marginBottom:14 }}>📋 Historial Completo</h2>
            {students.flatMap(s => (s.history||[]).map(h => ({ ...h, studentName: s.name, grade: s.grade }))).sort((a,b) => b.date.localeCompare(a.date)).map((h, i) => (
              <div key={i} className="card" style={{ padding:"12px 18px", marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20 }}>{h.type==="add"?"🔴":"🟢"}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{h.studentName}</span>
                  <span style={{ color:"#6b7280", fontSize:13 }}> · {h.grade} · {h.reason}</span>
                </div>
                <span style={{ color:"#6b7280", fontSize:12 }}>{h.date}</span>
                <span style={{ fontWeight:700, color: h.type==="add"?"#ef4444":"#22c55e", fontSize:15, minWidth:40, textAlign:"right" }}>
                  {h.type==="add"?"+":"-"}{h.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
      )}

      {/* MODAL DEMERITS */}
      {showModal && selectedStudent && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:getAvatarColor(selectedStudent.name), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff" }}>{selectedStudent.avatar}</div>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>
                  {modalType==="add" ? "Asignar Demérito" : "Remover Demérito"}
                </h2>
                <p style={{ color:"#6b7280", fontSize:13 }}>{selectedStudent.name} · {selectedStudent.grade}</p>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:6 }}>Motivo</label>
              <select className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.reason === "Otro" && (
              <div style={{ marginBottom:14 }}>
                <input className="input" placeholder="Describe el motivo..." value={form.customReason} onChange={e => setForm({...form, customReason: e.target.value})} />
              </div>
            )}
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:12, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:6 }}>Puntos</label>
              <input type="number" className="input" min={1} max={20} value={form.points} onChange={e => setForm({...form, points: e.target.value})} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setShowModal(false)} style={{ flex:1, background:"#1f2937", color:"#9ca3af", padding:12 }}>Cancelar</button>
              <button className="btn" onClick={handleSubmit} style={{ flex:2, background: modalType==="add" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#22c55e,#16a34a)", color:"#fff", padding:12, fontSize:15 }}>
                {modalType==="add" ? `Asignar ${form.points} pts` : `Remover ${form.points} pts`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD STUDENT */}
      {addStudentModal && (
        <div className="overlay" onClick={() => setAddStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:20 }}>👤 Nuevo Estudiante</h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:6 }}>Nombre completo</label>
              <input className="input" placeholder="Ej: Ana García Pérez" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:12, color:"#9ca3af", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", display:"block", marginBottom:6 }}>Grupo</label>
              <input className="input" placeholder="Ej: 2°A" value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade: e.target.value})} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setAddStudentModal(false)} style={{ flex:1, background:"#1f2937", color:"#9ca3af", padding:12 }}>Cancelar</button>
              <button className="btn" onClick={handleAddStudent} style={{ flex:2, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", padding:12, fontSize:15 }}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
