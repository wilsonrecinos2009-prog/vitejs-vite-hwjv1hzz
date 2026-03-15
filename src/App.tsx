import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion
} from "firebase/firestore";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth";

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
const auth = getAuth(firebaseApp);

const INVITE_CODE = "CEAH1769";
const LOGO_URL = "https://raw.githubusercontent.com/wilsonrecinos2009-prog/vitejs-vite-hwjv1hzz/refs/heads/nuevo/public/logo.png";

// Colores institucionales - Bandera Alemania
const C = {
  black:   "#1a1a1a",
  blackSoft: "#2a2a2a",
  red:     "#CC0000",
  redDark: "#990000",
  gold:    "#FFCC00",
  goldDark:"#E6B800",
  white:   "#F5F5F0",
  gray:    "#6b6b6b",
  grayLight:"#e8e8e8",
  border:  "#3a3a3a",
  cardBg:  "#222222",
  pageBg:  "#141414",
};

interface HistoryEntry {
  date: string;
  reason: string;
  points: number;
  type: "add" | "remove";
}
interface Student {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  demerits: number;
  history: HistoryEntry[];
}
interface Notification { id: string; message: string; level: RiskLevel; }
interface Toast { msg: string; type: "success" | "warning" | "error"; }
interface RiskLevel { label: string; color: string; bg: string; }

const REASONS = [
  "Llegada tarde","Tarea incompleta","Comportamiento en clase",
  "Falta injustificada","Uniforme incompleto","Uso de celular",
  "Falta de respeto","Deshonestidad académica","Otro",
];

function getRiskLevel(d: number): RiskLevel {
  if (d === 0) return { label: "Sin deméritos", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (d <= 5)  return { label: "Bajo",          color: "#84cc16", bg: "rgba(132,204,22,0.12)" };
  if (d <= 10) return { label: "Moderado",       color: C.gold,    bg: "rgba(255,204,0,0.15)" };
  if (d <= 15) return { label: "Alto",           color: "#f97316", bg: "rgba(249,115,22,0.12)" };
  return               { label: "Crítico",        color: C.red,     bg: "rgba(204,0,0,0.15)" };
}

function getAvatarColor(name: string): string {
  const colors = [C.red, C.redDark, "#8b0000", "#a50000", "#b30000", "#7f0000"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Franja tricolor decorativa ──────────────────────────────────────────────
function GermanStripe() {
  return (
    <div style={{ display:"flex", height:5, width:"100%" }}>
      <div style={{ flex:1, background:C.black }} />
      <div style={{ flex:1, background:C.red }} />
      <div style={{ flex:1, background:C.gold }} />
    </div>
  );
}

// ── Pantalla de autenticación ────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState<"login"|"register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Complete todos los campos."); return; }
    if (mode === "register" && inviteCode !== INVITE_CODE) { setError("Código de autorización incorrecto."); return; }
    setLoading(true);
    try {
      if (mode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code || "";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential"))
        setError("Correo electrónico o contraseña incorrectos.");
      else if (msg.includes("email-already-in-use")) setError("Este correo ya se encuentra registrado.");
      else if (msg.includes("weak-password")) setError("La contraseña debe tener mínimo 6 caracteres.");
      else setError("Error al procesar la solicitud. Intente nuevamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.pageBg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Georgia', 'Times New Roman', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .a-input { background:#1e1e1e; border:1px solid #3a3a3a; border-radius:4px; color:#f0f0f0; font-family:'Source Sans 3',sans-serif; font-size:15px; padding:12px 14px; width:100%; outline:none; transition:border .2s; }
        .a-input:focus { border-color:${C.gold}; }
        .a-btn { border:none; cursor:pointer; font-family:'Source Sans 3',sans-serif; font-weight:600; border-radius:4px; transition:all .15s; width:100%; padding:13px; font-size:15px; letter-spacing:.5px; }
        .a-btn:hover { filter:brightness(1.1); }
        .tab-auth { cursor:pointer; padding:9px 20px; font-family:'Source Sans 3',sans-serif; font-weight:600; font-size:13px; letter-spacing:.5px; text-transform:uppercase; transition:all .2s; border-bottom:2px solid transparent; }
      `}</style>

      <div style={{ width:440, maxWidth:"95vw", animation:"fadeUp .4s" }}>
        {/* Header institucional */}
        <div style={{ background:C.blackSoft, border:`1px solid ${C.border}`, borderBottom:"none", borderRadius:"6px 6px 0 0", padding:"28px 32px 24px", textAlign:"center" }}>
          <GermanStripe />
          <div style={{ marginTop:20, marginBottom:16 }}>
            <img src={LOGO_URL} alt="CEAH Logo" style={{ width:90, height:90, objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <h1 style={{ fontFamily:"'Playfair Display', serif", fontWeight:800, fontSize:18, color:C.white, letterSpacing:".5px", lineHeight:1.3, marginBottom:4 }}>
            Complejo Educativo<br/>Alejandro de Humboldt
          </h1>
          <p style={{ color:C.gold, fontSize:12, fontFamily:"'Source Sans 3',sans-serif", fontWeight:600, letterSpacing:"2px", textTransform:"uppercase", marginTop:6 }}>Sistema de Control de Deméritos</p>
          <div style={{ marginTop:16 }}><GermanStripe /></div>
        </div>

        {/* Formulario */}
        <div style={{ background:C.cardBg, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 6px 6px", padding:"0 32px 28px" }}>
          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:24 }}>
            {(["login","register"] as const).map(m => (
              <div key={m} className="tab-auth" onClick={() => { setMode(m); setError(""); }}
                style={{ color: mode===m ? C.gold : C.gray, borderBottomColor: mode===m ? C.gold : "transparent" }}>
                {m === "login" ? "Iniciar Sesión" : "Registrarse"}
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ fontSize:11, color:C.gray, fontFamily:"'Source Sans 3',sans-serif", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Correo Electrónico</label>
              <input className="a-input" type="email" placeholder="docente@ceah.edu.sv" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, color:C.gray, fontFamily:"'Source Sans 3',sans-serif", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Contraseña</label>
              <input className="a-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSubmit()} />
            </div>
            {mode === "register" && (
              <div>
                <label style={{ fontSize:11, color:C.gray, fontFamily:"'Source Sans 3',sans-serif", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Código de Autorización</label>
                <input className="a-input" type="text" placeholder="Solicitarlo a Dirección" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
              </div>
            )}
            {error && (
              <div style={{ background:"rgba(204,0,0,0.1)", border:`1px solid rgba(204,0,0,0.4)`, borderRadius:4, padding:"10px 14px", fontSize:13, color:"#ff6666", fontFamily:"'Source Sans 3',sans-serif" }}>
                ⚠ {error}
              </div>
            )}
            <button className="a-btn" onClick={handleSubmit} disabled={loading}
              style={{ background:`linear-gradient(135deg,${C.red},${C.redDark})`, color:"#fff", marginTop:4, borderTop:`2px solid ${C.gold}` }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 1s linear infinite", display:"inline-block" }} />
                  Procesando...
                </span>
              ) : mode === "login" ? "INGRESAR AL SISTEMA" : "CREAR CUENTA"}
            </button>
          </div>
          {mode === "register" && <p style={{ fontSize:11, color:C.gray, textAlign:"center", marginTop:14, fontFamily:"'Source Sans 3',sans-serif", letterSpacing:".3px" }}>El código de autorización es otorgado exclusivamente por la Dirección del plantel.</p>}
        </div>

        <p style={{ textAlign:"center", color:"#444", fontSize:11, marginTop:16, fontFamily:"'Source Sans 3',sans-serif" }}>© 2026 CEAH · Ahuachapán, El Salvador</p>
      </div>
    </div>
  );
}

// ── App principal ────────────────────────────────────────────────────────────
export default function DemeritosApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add"|"remove">("add");
  const [form, setForm] = useState({ reason: REASONS[0], points: 1, customReason: "" });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [addStudentModal, setAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthChecked(true); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "students"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data);
      setLoadingData(false);
      setNotifications(data.filter(s => s.demerits > 10).map(s => ({
        id: s.id, message: `${s.name} — ${s.demerits} deméritos acumulados`, level: getRiskLevel(s.demerits),
      })));
    });
    return () => unsub();
  }, [user]);

  const showToast = (msg: string, type: "success"|"warning"|"error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const openModal = (s: Student, t: "add"|"remove") => {
    setSelectedStudent(s); setModalType(t); setForm({ reason: REASONS[0], points: 1, customReason: "" }); setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;
    const reason = form.reason === "Otro" ? form.customReason : form.reason;
    const pts = parseInt(String(form.points));
    if (!reason || pts < 1) return;
    const today = new Date().toISOString().split("T")[0];
    const newDem = modalType === "add" ? selectedStudent.demerits + pts : Math.max(0, selectedStudent.demerits - pts);
    await updateDoc(doc(db, "students", selectedStudent.id), {
      demerits: newDem, history: arrayUnion({ date: today, reason, points: pts, type: modalType }),
    });
    setShowModal(false);
    showToast(modalType === "add" ? `${pts} deméritos registrados — ${selectedStudent.name}` : `${pts} deméritos removidos — ${selectedStudent.name}`, modalType === "add" ? "warning" : "success");
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.grade) return;
    const initials = newStudent.name.split(" ").map((w:string) => w[0]).join("").substring(0,2).toUpperCase();
    await setDoc(doc(db, "students", Date.now().toString()), { name: newStudent.name, grade: newStudent.grade, avatar: initials, demerits: 0, history: [] });
    setAddStudentModal(false); setNewStudent({ name:"", grade:"" });
    showToast(`Estudiante ${newStudent.name} registrado correctamente.`);
  };

  const sorted = [...students].filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.grade.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.demerits - a.demerits);
  const totalDem = students.reduce((s,x) => s + x.demerits, 0);
  const critCount = students.filter(s => s.demerits > 10).length;
  const topStudents = [...students].sort((a,b) => b.demerits - a.demerits).slice(0,3);

  if (!authChecked) return (
    <div style={{ minHeight:"100vh", background:C.pageBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.gold}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} />
    </div>
  );

  if (!user) return <AuthScreen />;

  return (
    <div style={{ minHeight:"100vh", background:C.pageBg, fontFamily:"'Source Sans 3','Segoe UI',sans-serif", color:C.white, display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#3a3a3a;border-radius:2px}
        @keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes toastIn{from{opacity:0;transform:translateX(80px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
        .card { background:${C.cardBg}; border:1px solid ${C.border}; border-radius:4px; transition:all .2s; }
        .card:hover { border-color:#555; }
        .btn { border:none; cursor:pointer; font-family:'Source Sans 3',sans-serif; font-weight:600; border-radius:3px; transition:all .15s; letter-spacing:.3px; }
        .btn:hover { filter:brightness(1.1); }
        .nav-item { cursor:pointer; padding:0 20px; height:64px; font-weight:600; font-size:13px; transition:all .2s; display:flex; align-items:center; gap:8px; letter-spacing:.5px; text-transform:uppercase; border-bottom:3px solid transparent; }
        .nav-item:hover { color:${C.white}; border-bottom-color:#444; }
        .nav-item.active { color:${C.gold}; border-bottom-color:${C.gold}; }
        .input { background:#1e1e1e; border:1px solid #3a3a3a; border-radius:3px; color:#f0f0f0; font-family:'Source Sans 3',sans-serif; font-size:14px; padding:10px 12px; width:100%; transition:border .2s; outline:none; }
        .input:focus { border-color:${C.gold}; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fadeIn .2s; }
        .modal { background:${C.cardBg};border:1px solid ${C.border};border-radius:4px;padding:28px;width:440px;max-width:95vw;animation:slideIn .2s; }
        .badge { padding:2px 10px; border-radius:2px; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
        .progress-bar { height:4px; border-radius:2px; background:#333; overflow:hidden; }
        .progress-fill { height:100%; border-radius:2px; transition:width .6s ease; }
        .student-row { display:grid; grid-template-columns:48px 1fr auto auto; align-items:center; gap:16px; padding:14px 18px; border-radius:4px; border:1px solid ${C.border}; background:${C.cardBg}; margin-bottom:6px; transition:all .2s; }
        .student-row:hover { border-color:#555; background:#272727; }
        .divider { height:1px; background:${C.border}; margin:20px 0; }
      `}</style>

      {/* Header institucional */}
      <div><GermanStripe /></div>
      <header style={{ background:C.blackSoft, borderBottom:`1px solid ${C.border}`, padding:"0 32px", display:"flex", alignItems:"center", gap:20, height:64, position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, paddingRight:20, borderRight:`1px solid ${C.border}` }}>
          <img src={LOGO_URL} alt="CEAH" style={{ width:38, height:38, objectFit:"contain" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:14, color:C.white, letterSpacing:".3px" }}>C.E.A.H.</div>
            <div style={{ fontSize:10, color:C.gold, fontWeight:600, letterSpacing:"1.5px", textTransform:"uppercase" }}>Sistema de Deméritos</div>
          </div>
        </div>
        <nav style={{ display:"flex", flex:1 }}>
          {[["dashboard","Panel General"],["students","Estudiantes"],["ranking","Clasificación"],["alerts","Alertas"]].map(([v, label]) => (
            <div key={v} className={`nav-item ${view===v?"active":""}`} onClick={() => setView(v)} style={{ color: view===v ? C.gold : "#888", fontSize:12 }}>
              <span>{label}</span>
              {v==="alerts" && notifications.length > 0 && <span style={{ background:C.red, color:"#fff", borderRadius:"50%", width:17, height:17, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700 }}>{notifications.length}</span>}
            </div>
          ))}
        </nav>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, paddingRight:12, borderRight:`1px solid ${C.border}` }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:C.red, border:`2px solid ${C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{user.email?.[0].toUpperCase()}</div>
            <span style={{ fontSize:12, color:"#aaa", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</span>
          </div>
          <button className="btn" onClick={() => signOut(auth)} style={{ background:"transparent", border:`1px solid #444`, color:"#888", padding:"6px 14px", fontSize:12 }}>Cerrar Sesión</button>
          <button className="btn" onClick={() => setAddStudentModal(true)} style={{ background:C.red, border:`1px solid ${C.redDark}`, color:"#fff", padding:"7px 16px", fontSize:12 }}>+ Registrar Alumno</button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:76, right:24, zIndex:200, animation:"toastIn .3s",
          background: toast.type==="warning" ? "#3a1500" : toast.type==="error" ? "#2a0000" : "#0a2a0a",
          border:`1px solid ${toast.type==="warning"?C.gold:toast.type==="error"?C.red:"#22c55e"}`,
          borderRadius:3, padding:"11px 16px", fontSize:13, maxWidth:360, boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
          fontFamily:"'Source Sans 3',sans-serif" }}>
          {toast.msg}
        </div>
      )}

      {loadingData ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ width:36, height:36, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.gold}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} />
          <p style={{ color:"#666", fontSize:13, letterSpacing:".5px" }}>Cargando registros...</p>
        </div>
      ) : (
        <main style={{ flex:1, padding:"28px 32px", maxWidth:1280, margin:"0 auto", width:"100%" }}>

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div style={{ animation:"slideIn .3s" }}>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.white, marginBottom:4 }}>Panel General</h1>
                <p style={{ color:"#666", fontSize:13 }}>Complejo Educativo Alejandro de Humboldt — Año escolar 2026</p>
              </div>
              <div className="divider" />

              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
                {[
                  { label:"Total Alumnos", value:students.length, color:C.gold, border:C.gold },
                  { label:"Deméritos Totales", value:totalDem, color:"#f97316", border:"#f97316" },
                  { label:"En Zona Crítica", value:critCount, color:C.red, border:C.red },
                  { label:"Sin Deméritos", value:students.filter(s=>s.demerits===0).length, color:"#22c55e", border:"#22c55e" },
                ].map(({ label, value, color, border }) => (
                  <div key={label} className="card" style={{ padding:"18px 20px", borderTop:`3px solid ${border}` }}>
                    <p style={{ color:"#666", fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>{label}</p>
                    <p style={{ fontSize:38, fontWeight:800, fontFamily:"'Playfair Display',serif", color, lineHeight:1 }}>{value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div className="card" style={{ padding:20 }}>
                  <h3 style={{ fontWeight:700, marginBottom:4, fontSize:13, letterSpacing:"1px", textTransform:"uppercase", color:C.gold }}>Mayores Deméritos</h3>
                  <div className="divider" style={{ margin:"12px 0" }} />
                  {topStudents.length === 0 ? <p style={{ color:"#555", fontSize:13 }}>Sin registros.</p> : topStudents.map((s, i) => {
                    const risk = getRiskLevel(s.demerits);
                    return (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:i===0?C.gold:i===1?"#ccc":"#a07050", width:20, textAlign:"center" }}>#{i+1}</span>
                        <div style={{ width:34, height:34, borderRadius:"50%", background:getAvatarColor(s.name), border:`2px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{s.avatar}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:600 }}>{s.name}</div>
                          <div className="progress-bar" style={{ marginTop:5 }}>
                            <div className="progress-fill" style={{ width:`${Math.min(100,(s.demerits/20)*100)}%`, background:risk.color }} />
                          </div>
                        </div>
                        <span style={{ fontWeight:800, color:risk.color, fontSize:20, fontFamily:"'Playfair Display',serif" }}>{s.demerits}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="card" style={{ padding:20 }}>
                  <h3 style={{ fontWeight:700, marginBottom:4, fontSize:13, letterSpacing:"1px", textTransform:"uppercase", color:C.gold }}>Registros Recientes</h3>
                  <div className="divider" style={{ margin:"12px 0" }} />
                  {students.flatMap(s => (s.history||[]).map(h => ({ ...h, studentName:s.name }))).sort((a,b) => b.date.localeCompare(a.date)).slice(0,7).map((h, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"8px 12px", background:"#1a1a1a", borderRadius:3, borderLeft:`3px solid ${h.type==="add"?C.red:"#22c55e"}` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{h.studentName}</div>
                        <div style={{ fontSize:11, color:"#666" }}>{h.reason} · {h.date}</div>
                      </div>
                      <span style={{ fontWeight:700, color:h.type==="add"?C.red:"#22c55e", fontSize:14 }}>{h.type==="add"?"+":"-"}{h.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {view === "students" && (
            <div style={{ animation:"slideIn .3s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
                <div>
                  <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Registro de Estudiantes</h1>
                  <p style={{ color:"#666", fontSize:13 }}>{sorted.length} alumnos registrados</p>
                </div>
                <input className="input" placeholder="Buscar por nombre o sección..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:280 }} />
              </div>
              <div className="divider" />
              {sorted.length === 0 && <div className="card" style={{ padding:40, textAlign:"center", color:"#555" }}>No se encontraron registros.</div>}
              {sorted.map(s => {
                const risk = getRiskLevel(s.demerits);
                return (
                  <div key={s.id} className="student-row">
                    <div style={{ width:42, height:42, borderRadius:"50%", background:getAvatarColor(s.name), border:`2px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:13 }}>{s.avatar}</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:15 }}>{s.name}</div>
                      <div style={{ fontSize:12, color:"#666", marginTop:2 }}>Sección: {s.grade} &nbsp;·&nbsp; {(s.history||[]).length} registros</div>
                      <div className="progress-bar" style={{ width:200, marginTop:6 }}>
                        <div className="progress-fill" style={{ width:`${Math.min(100,(s.demerits/20)*100)}%`, background:risk.color }} />
                      </div>
                    </div>
                    <div style={{ textAlign:"center", minWidth:70 }}>
                      <div style={{ fontSize:30, fontWeight:800, fontFamily:"'Playfair Display',serif", color:risk.color, lineHeight:1 }}>{s.demerits}</div>
                      <span className="badge" style={{ background:risk.bg, color:risk.color }}>{risk.label}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <button className="btn" onClick={() => openModal(s,"add")} style={{ background:C.red, color:"#fff", padding:"7px 14px", fontSize:12 }}>+ Demérito</button>
                      <button className="btn" onClick={() => openModal(s,"remove")} style={{ background:"#1e1e1e", border:"1px solid #444", color:"#aaa", padding:"7px 14px", fontSize:12 }}>− Remover</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RANKING */}
          {view === "ranking" && (
            <div style={{ animation:"slideIn .3s" }}>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Tabla de Clasificación</h1>
              <p style={{ color:"#666", fontSize:13, marginBottom:16 }}>Ordenado por acumulación de deméritos</p>
              <div className="divider" />
              {[...students].sort((a,b) => b.demerits-a.demerits).map((s, i) => {
                const risk = getRiskLevel(s.demerits);
                const max = students.reduce((m,x) => Math.max(m,x.demerits), 1);
                return (
                  <div key={s.id} className="card" style={{ padding:"14px 20px", marginBottom:6, display:"flex", alignItems:"center", gap:16, borderLeft:`4px solid ${i===0?C.gold:i===1?"#ccc":i===2?"#a07050":C.border}` }}>
                    <div style={{ width:32, textAlign:"center", fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:16, color:i===0?C.gold:i===1?"#ccc":i===2?"#a07050":"#444" }}>#{i+1}</div>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:getAvatarColor(s.name), border:`2px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:12 }}>{s.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15 }}>{s.name} <span style={{ color:"#555", fontWeight:400, fontSize:13 }}>· {s.grade}</span></div>
                      <div className="progress-bar" style={{ marginTop:6 }}>
                        <div className="progress-fill" style={{ width:`${(s.demerits/max)*100}%`, background:risk.color }} />
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:24, fontWeight:800, fontFamily:"'Playfair Display',serif", color:risk.color }}>{s.demerits}</span>
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
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Alertas Disciplinarias</h1>
              <p style={{ color:"#666", fontSize:13, marginBottom:16 }}>Alumnos que superan el umbral de 10 deméritos</p>
              <div className="divider" />
              {notifications.length === 0 ? (
                <div className="card" style={{ padding:48, textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:12, color:"#22c55e" }}>✓</div>
                  <p style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:18, marginBottom:6 }}>Sin alertas activas</p>
                  <p style={{ color:"#555", fontSize:13 }}>Todos los alumnos están dentro del rango aceptable.</p>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} className="card" style={{ padding:"14px 20px", marginBottom:8, borderLeft:`4px solid ${n.level.color}`, display:"flex", alignItems:"center", gap:14 }}>
                  <span style={{ fontSize:22, animation:"pulse 2s infinite", color:C.red }}>⚠</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:14 }}>{n.message}</p>
                    <p style={{ color:"#555", fontSize:12, marginTop:3 }}>Se recomienda comunicar a padres de familia y registrar en expediente.</p>
                  </div>
                  <button className="btn" onClick={() => setView("students")} style={{ background:"#1e1e1e", border:"1px solid #444", color:"#aaa", padding:"7px 14px", fontSize:12 }}>Ver registro</button>
                </div>
              ))}
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, marginTop:28, marginBottom:12 }}>Historial General</h2>
              <div className="divider" style={{ margin:"0 0 16px" }} />
              {students.flatMap(s => (s.history||[]).map(h => ({ ...h, studentName:s.name, grade:s.grade }))).sort((a,b) => b.date.localeCompare(a.date)).map((h, i) => (
                <div key={i} className="card" style={{ padding:"10px 16px", marginBottom:6, display:"flex", alignItems:"center", gap:12, borderLeft:`3px solid ${h.type==="add"?C.red:"#22c55e"}` }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{h.studentName}</span>
                    <span style={{ color:"#555", fontSize:12 }}> · {h.grade} · {h.reason}</span>
                  </div>
                  <span style={{ color:"#555", fontSize:11 }}>{h.date}</span>
                  <span style={{ fontWeight:700, color:h.type==="add"?C.red:"#22c55e", fontSize:14, minWidth:36, textAlign:"right" }}>{h.type==="add"?"+":"-"}{h.points}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <div><GermanStripe /></div>
      <footer style={{ background:C.blackSoft, borderTop:`1px solid ${C.border}`, padding:"10px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, color:"#444" }}>© 2026 Complejo Educativo Alejandro de Humboldt · Ahuachapán, El Salvador</span>
        <span style={{ fontSize:11, color:"#333" }}>Sistema de Control Disciplinario</span>
      </footer>

      {/* Modal deméritos */}
      {showModal && selectedStudent && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:16, marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:18, marginBottom:4 }}>{modalType==="add"?"Registrar Demérito":"Remover Demérito"}</h2>
              <p style={{ color:"#666", fontSize:13 }}>{selectedStudent.name} · Sección {selectedStudent.grade}</p>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:"#666", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Motivo</label>
              <select className="input" value={form.reason} onChange={e => setForm({...form, reason:e.target.value})}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.reason === "Otro" && (
              <div style={{ marginBottom:14 }}>
                <input className="input" placeholder="Describa el motivo..." value={form.customReason} onChange={e => setForm({...form, customReason:e.target.value})} />
              </div>
            )}
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:11, color:"#666", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Puntos a {modalType==="add"?"asignar":"remover"}</label>
              <input type="number" className="input" min={1} max={20} value={form.points} onChange={e => setForm({...form, points:parseInt(e.target.value)})} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setShowModal(false)} style={{ flex:1, background:"#1e1e1e", border:"1px solid #444", color:"#888", padding:12 }}>Cancelar</button>
              <button className="btn" onClick={handleSubmit} style={{ flex:2, background:modalType==="add"?C.red:"#166534", color:"#fff", padding:12, fontSize:14 }}>
                {modalType==="add"?`Registrar ${form.points} punto(s)`:`Remover ${form.points} punto(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar alumno */}
      {addStudentModal && (
        <div className="overlay" onClick={() => setAddStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:16, marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:18 }}>Registrar Nuevo Alumno</h2>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:"#666", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Nombre Completo</label>
              <input className="input" placeholder="Ej: Ana García Pérez" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name:e.target.value})} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ fontSize:11, color:"#666", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:6 }}>Sección / Grado</label>
              <input className="input" placeholder="Ej: 2°A" value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade:e.target.value})} />
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn" onClick={() => setAddStudentModal(false)} style={{ flex:1, background:"#1e1e1e", border:"1px solid #444", color:"#888", padding:12 }}>Cancelar</button>
              <button className="btn" onClick={handleAddStudent} style={{ flex:2, background:C.red, color:"#fff", padding:12, fontSize:14 }}>Registrar Alumno</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
