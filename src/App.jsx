import { useState, useEffect, useRef } from "react";

// ── APPS SCRIPT API ────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw5YxNHGXX7S-1USNXogzhEeBRQwjQCtqcfFx0fr28npYnWIXjy9LIcCHOOopeWa7PL/exec";
// Use local Netlify proxy to avoid CORS
const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? "/.netlify/functions/proxy"
  : APPS_SCRIPT_URL;

async function callAPI(func, payload) {
  try {
    const url = payload
      ? `${APPS_SCRIPT_URL}?func=${func}&data=${encodeURIComponent(JSON.stringify(payload))}`
      : `${APPS_SCRIPT_URL}?func=${func}`;
    const res  = await fetch(url);
    const json = await res.json();
    return json;
  } catch(e) {
    console.error("API Error:", e);
    return { ok: false, error: e.message };
  }
}

// ── USERS (role-based) ────────────────────────────────────────────────────────
const USERS = [
  { id:"U01", name:"Khalid Al-Mansouri", email:"khalid.mansouri@ops.com",  password:"Admin@2026",  role:"executive", dept:"all",  avatar:"KM", color:"#00C2D4" },
  { id:"U02", name:"Sarah Al-Otaibi",    email:"sarah.otaibi@ops.com",     password:"OpsEx@2026", role:"manager",   dept:"D01",  avatar:"SO", color:"#7C3AED" },
  { id:"U03", name:"Faisal Al-Zahrani",  email:"faisal.zahrani@ops.com",   password:"LM@2026",    role:"manager",   dept:"D02",  avatar:"FZ", color:"#F59E0B" },
  { id:"U04", name:"Dina Al-Qahtani",    email:"dina.qahtani@ops.com",     password:"CS@2026",    role:"manager",   dept:"D03",  avatar:"DQ", color:"#10B981" },
  { id:"U05", name:"Waleed Al-Bishi",    email:"waleed.bishi@ops.com",     password:"FM@2026",    role:"manager",   dept:"D04",  avatar:"WB", color:"#EF4444" },
  { id:"U06", name:"Hassan Al-Otaibi",   email:"hassan.otaibi@ops.com",    password:"Store@2026", role:"manager",   dept:"D05",  avatar:"HO", color:"#8B5CF6" },
];

// ── GOOGLE SHEETS CONFIG ──────────────────────────────────────────────────────



// ── AUTO PHASES — calculated from project dates ──────────────────────────────
function getProjectPhases(proj) {
  if (!proj.startDate || !proj.endDate) return [];
  const start    = new Date(proj.startDate);
  const end      = new Date(proj.endDate);
  const total    = end - start;
  if (total <= 0) return [];
  const now      = new Date();
  const elapsed  = Math.min(now - start, total);
  const elapsedPct = Math.max(0, elapsed / total);

  const PHASE_NAMES = [
    { name:"Design & Planning", icon:"📐", from:0,    to:0.25 },
    { name:"Pilot & Testing",   icon:"🧪", from:0.25, to:0.50 },
    { name:"Rollout",           icon:"🚀", from:0.50, to:0.75 },
    { name:"Validation",        icon:"✅", from:0.75, to:1.00 },
  ];

  return PHASE_NAMES.map((ph, i) => {
    const phStart = new Date(start.getTime() + ph.from * total);
    const phEnd   = new Date(start.getTime() + ph.to   * total);

    let status, progress;
    if (elapsedPct >= ph.to) {
      status   = "Completed";
      progress = 100;
    } else if (elapsedPct >= ph.from) {
      status   = "In Progress";
      // How far into this phase?
      const phElapsed = (now - phStart) / (phEnd - phStart);
      progress = Math.round(Math.min(Math.max(phElapsed * 100, 0), 99));
    } else {
      status   = "Upcoming";
      progress = 0;
    }

    return {
      number:   i + 1,
      name:     ph.name,
      icon:     ph.icon,
      startDate: phStart.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}),
      endDate:   phEnd.toLocaleDateString("en-GB",{day:"2-digit",month:"short"}),
      status,
      progress,
    };
  });
}

// ── PRIMARY KPI MAP — drives project progress calculation ─────────────────────
const PRIMARY_KPI = {
  PR01:{ kpi:"K02", baseline:65,  target:85,  unit:"%",  dir:"higher" },
  PR02:{ kpi:"K01", baseline:87,  target:90,  unit:"%",  dir:"higher" },
  PR03:{ kpi:"K05", baseline:100, target:85,  unit:"idx",dir:"lower"  },
  PR04:{ kpi:"K03", baseline:0,   target:80,  unit:"%",  dir:"higher" },
  PR05:{ kpi:"K08", baseline:0,   target:100, unit:"%",  dir:"higher" },
  PR06:{ kpi:"K02", baseline:65,  target:85,  unit:"%",  dir:"higher" },
  PR07:{ kpi:"K05", baseline:100, target:85,  unit:"idx",dir:"lower"  },
  PR08:{ kpi:"K12", baseline:8.83,target:7.70,unit:"SAR",dir:"lower"  },
  PR09:{ kpi:"K10", baseline:43,  target:65,  unit:"%",  dir:"higher" },
  PR10:{ kpi:"K12", baseline:8.83,target:7.70,unit:"SAR",dir:"lower"  },
  PR11:{ kpi:"K12", baseline:8.83,target:7.70,unit:"SAR",dir:"lower"  },
  PR12:{ kpi:"K18", baseline:1.7, target:2.3, unit:"x",  dir:"higher" },
  PR13:{ kpi:"K10", baseline:43,  target:65,  unit:"%",  dir:"higher" },
  PR14:{ kpi:"K19", baseline:44,  target:70,  unit:"%",  dir:"higher" },
  PR15:{ kpi:"K20", baseline:100, target:20,  unit:"%",  dir:"lower"  },
  PR16:{ kpi:"K19", baseline:44,  target:70,  unit:"%",  dir:"higher" },
  PR17:{ kpi:"K10", baseline:43,  target:65,  unit:"%",  dir:"higher" },
  PR18:{ kpi:"K29", baseline:1.65,target:1.25,unit:"%",  dir:"lower"  },
  PR19:{ kpi:"K28", baseline:4.01,target:3.4, unit:"%",  dir:"lower"  },
  PR20:{ kpi:"K29", baseline:1.65,target:1.25,unit:"%",  dir:"lower"  },
  PR21:{ kpi:"K29", baseline:1.65,target:1.25,unit:"%",  dir:"lower"  },
  PR22:{ kpi:"K29", baseline:1.65,target:1.25,unit:"%",  dir:"lower"  },
  PR23:{ kpi:"K35", baseline:49,  target:90,  unit:"%",  dir:"higher" },
  PR24:{ kpi:"K38", baseline:null,target:null,unit:"SAR",dir:"lower"  },
  PR25:{ kpi:"K38", baseline:null,target:null,unit:"SAR",dir:"lower"  },
  PR26:{ kpi:"K35", baseline:49,  target:90,  unit:"%",  dir:"higher" },
  PR27:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR28:{ kpi:"K51", baseline:null,target:2,   unit:"%",  dir:"lower"  },
  PR29:{ kpi:"K45", baseline:null,target:3,   unit:"%",  dir:"lower"  },
  PR30:{ kpi:"K51", baseline:null,target:2,   unit:"%",  dir:"lower"  },
  PR31:{ kpi:"K41", baseline:67,  target:75,  unit:"%",  dir:"higher" },
  PR32:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR33:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR34:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR35:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR36:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
  PR37:{ kpi:"K52", baseline:null,target:0.40,unit:"SAR",dir:"lower"  },
  PR38:{ kpi:"K52", baseline:null,target:0.40,unit:"SAR",dir:"lower"  },
  PR39:{ kpi:"K42", baseline:3.4, target:3.25,unit:"SAR",dir:"lower"  },
};

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTF3VzIRtlUIp9JFiEHiOX-3Yf0arxLNd8pv_8mAMAK-a6f3HKAupLgWqvylMGk3sGYz95LIIDCtmTp/pub?output=csv";

// ── STATIC DATA (used when Google Sheets is unavailable / CORS) ───────────────
const STATIC_DATA = {
  departments: [
    { id: "D01", name: "Operations Excellence", color: "#00C2D4", icon: "⚙️" },
    { id: "D02", name: "Last Mile",              color: "#7C3AED", icon: "🚴" },
    { id: "D03", name: "Customer Service",        color: "#F59E0B", icon: "💬" },
    { id: "D04", name: "Facility & Maintenance",  color: "#10B981", icon: "🔧" },
    { id: "D05", name: "In-Store Operations",     color: "#EF4444", icon: "🏪" },
  ],
  kpis: [
    { id:"K01", dept:"D01", name:"Audit Score %",             actual:88,  target:90,  unit:"%",    dir:"higher", freq:"Monthly",  q1:"90%",   q2:"90%",   q3:"90%",   q4:"90%"   },
    { id:"K02", dept:"D01", name:"SOP Compliance %",          actual:67,  target:65,  unit:"%",    dir:"higher", freq:"Monthly",  q1:"65%",   q2:"70%",   q3:"80%",   q4:"85%"   },
    { id:"K03", dept:"D01", name:"Training Adherence %",      actual:35,  target:40,  unit:"%",    dir:"higher", freq:"Monthly",  q1:"40%",   q2:"50%",   q3:"70%",   q4:"80%"   },
    { id:"K04", dept:"D01", name:"CAPA Effectiveness %",      actual:78,  target:80,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"80%",   q2:"80%",   q3:"85%",   q4:"85%"   },
    { id:"K05", dept:"D01", name:"Cost of Quality",           actual:0,   target:0,   unit:"idx",  dir:"lower",  freq:"Monthly",  q1:"≥10%↓", q2:"≥10%↓", q3:"≥10%↓", q4:"≥10%↓"},
    { id:"K08", dept:"D01", name:"Action Plan Coverage %",    actual:90,  target:100, unit:"%",    dir:"higher", freq:"Weekly",   q1:"100%",  q2:"100%",  q3:"100%",  q4:"100%"  },
    { id:"K09", dept:"D01", name:"Action Plan Closure %",     actual:85,  target:90,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"90%",   q2:"90%",   q3:"90%",   q4:"90%"   },
    { id:"K10", dept:"D02", name:"SLA @ 11 min",              actual:45,  target:48,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"48%",   q2:"55%",   q3:"60%",   q4:"65%"   },
    { id:"K11", dept:"D02", name:"SLA @ 9 min",               actual:53,  target:55,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"55%",   q2:"60%",   q3:"65%",   q4:"75%"   },
    { id:"K12", dept:"D02", name:"Cost Per Order (CPO)",      actual:9.1, target:9.3, unit:"SAR",  dir:"lower",  freq:"Monthly",  q1:"≤9.30", q2:"≤8.50", q3:"≤8.20", q4:"≤7.70" },
    { id:"K13", dept:"D02", name:"Rider Retention %",         actual:77,  target:80,  unit:"%",    dir:"higher", freq:"Monthly",  q1:"80%",   q2:"80%",   q3:"85%",   q4:"85%"   },
    { id:"K16", dept:"D02", name:"Store CPO Compliance %",    actual:95,  target:98,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"98%",   q2:"98%",   q3:"99%",   q4:"99%"   },
    { id:"K17", dept:"D02", name:"Shift Compliance %",        actual:75,  target:80,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"80%",   q2:"80%",   q3:"85%",   q4:"85%"   },
    { id:"K18", dept:"D02", name:"Rider Productivity (UTR)",  actual:1.85,target:2.0, unit:"ratio",dir:"higher", freq:"Weekly",   q1:"≥2.0",  q2:"≥2.1",  q3:"≥2.2",  q4:"≥2.3"  },
    { id:"K19", dept:"D02", name:"Customer Handling Time SLA",actual:48,  target:50,  unit:"%",    dir:"higher", freq:"Daily",    q1:"50%",   q2:"55%",   q3:"60%",   q4:"65%"   },
    { id:"K20", dept:"D02", name:"Rider Nationality Diversity",actual:38, target:35,  unit:"%",    dir:"lower",  freq:"Weekly",   q1:"35%",   q2:"30%",   q3:"30%",   q4:"20%"   },
    { id:"K23", dept:"D03", name:"CSAT %",                    actual:91.5,target:92,  unit:"%",    dir:"higher", freq:"Monthly",  q1:"92%",   q2:"92.5%", q3:"93%",   q4:"≥93%"  },
    { id:"K25", dept:"D03", name:"FRT SLA % (≤25s)",          actual:52,  target:55,  unit:"%",    dir:"higher", freq:"Daily",    q1:"55%",   q2:"60%",   q3:"65%",   q4:"≥70%"  },
    { id:"K27", dept:"D03", name:"AHT SLA % (≤3:30)",         actual:48,  target:50,  unit:"%",    dir:"higher", freq:"Daily",    q1:"50%",   q2:"57.5%", q3:"65%",   q4:"≥70%"  },
    { id:"K28", dept:"D03", name:"Contact Ratio %",           actual:3.9, target:3.7, unit:"%",    dir:"lower",  freq:"Daily",    q1:"3.7%",  q2:"3.5%",  q3:"3.4%",  q4:"3.4%"  },
    { id:"K29", dept:"D03", name:"Incident Rate %",           actual:1.6, target:1.55,unit:"%",    dir:"lower",  freq:"Weekly",   q1:"1.55%", q2:"1.45%", q3:"1.35%", q4:"1.25%" },
    { id:"K32", dept:"D03", name:"Agent Performance %",       actual:91,  target:91.5,unit:"%",    dir:"higher", freq:"Weekly",   q1:"91.5%", q2:"92.5%", q3:"93.2%", q4:"94%"   },
    { id:"K35", dept:"D04", name:"Priority SLA Compliance %", actual:57,  target:60,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"60%",   q2:"70%",   q3:"80%",   q4:"90%"   },
    { id:"K36", dept:"D04", name:"Ticket Completion Rate %",  actual:96.5,target:97,  unit:"%",    dir:"higher", freq:"Weekly",   q1:"97%",   q2:"97%",   q3:"98%",   q4:"98%"   },
    { id:"K37", dept:"D04", name:"Ticket Rejection Rate %",   actual:4.5, target:4,   unit:"%",    dir:"lower",  freq:"Weekly",   q1:"4%",    q2:"3%",    q3:"2%",    q4:"2%"    },
    { id:"K38", dept:"D04", name:"F&M Cost Per Ticket",       actual:0,   target:0,   unit:"SAR",  dir:"lower",  freq:"Weekly",   q1:"TBD",   q2:"TBD",   q3:"TBD",   q4:"TBD"   },
    { id:"K39", dept:"D04", name:"Avg Resolution Time",       actual:18,  target:16,  unit:"Days", dir:"lower",  freq:"Weekly",   q1:"16",    q2:"14",    q3:"12",    q4:"10"    },
    { id:"K40", dept:"D04", name:"Technician UTR",            actual:6.5, target:6.7, unit:"t/u",  dir:"higher", freq:"Weekly",   q1:"6.7",   q2:"6.7",   q3:"7.0",   q4:"7.0"   },
    { id:"K41", dept:"D05", name:"Order Processing SLA %",    actual:69,  target:70,  unit:"%",    dir:"higher", freq:"Daily",    q1:"70%",   q2:"73%",   q3:"75%",   q4:"75%"   },
    { id:"K42", dept:"D05", name:"Store Cost (SAR)",          actual:3.95,target:4.17,unit:"SAR",  dir:"lower",  freq:"Monthly",  q1:"4.17",  q2:"3.5",   q3:"3.25",  q4:"3.37"  },
    { id:"K43", dept:"D05", name:"Order Fill Rate %",         actual:99,  target:99,  unit:"%",    dir:"higher", freq:"Daily",    q1:"99%",   q2:"99%",   q3:"99%",   q4:"99%"   },
    { id:"K44", dept:"D05", name:"In-Store Incident Rate %",  actual:1.7, target:1.65,unit:"%",    dir:"lower",  freq:"Daily",    q1:"1.65%", q2:"1.8%",  q3:"1.7%",  q4:"1.6%"  },
    { id:"K45", dept:"D05", name:"Wastage %",                 actual:3.4, target:3.0, unit:"%",    dir:"lower",  freq:"Monthly",  q1:"3%",    q2:"3%",    q3:"3%",    q4:"3%"    },
    { id:"K49", dept:"D05", name:"Picker CPO (SAR)",          actual:1.82,target:1.70,unit:"SAR",  dir:"lower",  freq:"Monthly",  q1:"1.70",  q2:"1.65",  q3:"1.60",  q4:"1.55"  },
    { id:"K50", dept:"D05", name:"Picker UTR",                actual:50,  target:55,  unit:"ord",  dir:"higher", freq:"Weekly",   q1:"55",    q2:"57",    q3:"59",    q4:"61"    },
    { id:"K51", dept:"D05", name:"Inventory Shrinkage %",     actual:4.8, target:4.0, unit:"%",    dir:"lower",  freq:"Monthly",  q1:"4%",    q2:"3%",    q3:"2%",    q4:"2%"    },
    { id:"K52", dept:"D05", name:"Bags CPO (SAR)",            actual:0.55,target:0.50,unit:"SAR",  dir:"lower",  freq:"Monthly",  q1:"0.50",  q2:"0.48",  q3:"0.45",  q4:"0.42"  },
  ],
  // ⚠️ Projects come ONLY from Google Sheet — no hardcoded data
  projects: [],
};

// ── STATUS LOGIC ──────────────────────────────────────────────────────────────
function getKPIStatus(kpi) {
  const variance = kpi.dir === "higher"
    ? (kpi.actual - kpi.target) / kpi.target
    : (kpi.target - kpi.actual) / kpi.target;
  if (variance >= -0.02) return "good";
  if (variance >= -0.10) return "warning";
  return "critical";
}

function getStatusConfig(status) {
  return {
    good:     { label: "On Track",  color: "#10B981", bg: "rgba(16,185,129,0.12)",  dot: "#10B981" },
    warning:  { label: "At Risk",   color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  dot: "#F59E0B" },
    critical: { label: "Critical",  color: "#EF4444", bg: "rgba(239,68,68,0.12)",   dot: "#EF4444" },
  }[status] || { label: status, color: "#64748B", bg: "rgba(100,116,139,0.12)", dot: "#64748B" };
}

function getProjStatusConfig(status) {
  return {
    "Completed":   { color: "#10B981", bg: "rgba(16,185,129,0.15)"  },
    "In Progress": { color: "#00C2D4", bg: "rgba(0,194,212,0.15)"   },
    "Planned":     { color: "#F59E0B", bg: "rgba(245,158,11,0.15)"  },
    "Delayed":     { color: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
    "On Hold":     { color: "#94A3B8", bg: "rgba(148,163,184,0.15)" },
  }[status] || { color: "#64748B", bg: "rgba(100,116,139,0.15)" };
}

// ── MINI SPARKLINE ────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={pts.split(" ").pop().split(",")[0]}
              cy={pts.split(" ").pop().split(",")[1]}
              r="3" fill={color} />
    </svg>
  );
}

// ── RADIAL GAUGE ──────────────────────────────────────────────────────────────
function RadialGauge({ value, max = 100, color, size = 64 }) {
  const pct = Math.min(value / max, 1);
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: "100%",
        background: `linear-gradient(90deg, ${color}99, ${color})`,
        borderRadius: 999, transition: "width 1s ease",
      }} />
    </div>
  );
}

// ── TREND ARROW ───────────────────────────────────────────────────────────────
function TrendArrow({ kpi }) {
  const st = getKPIStatus(kpi);
  const colors = { good: "#10B981", warning: "#F59E0B", critical: "#EF4444" };
  const arrows = { good: "↑", warning: "→", critical: "↓" };
  return <span style={{ color: colors[st], fontWeight: 700, fontSize: 14 }}>{arrows[st]}</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError,  setLoginError]  = useState("");
  const [view, setView]             = useState("executive");   // executive | dept | projects | kpi-detail
  const [activeDept, setActiveDept] = useState(null);
  const [activeKPI, setActiveKPI]   = useState(null);
  const [filterStatus, setFilter]   = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [sheetData, setSheetData]   = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [sidebarOpen, setSidebar]   = useState(true);
  const [animKey, setAnimKey]       = useState(0);
  const [pending,      setPending]    = useState([]);
  const [submitForm,   setSubmitForm] = useState({name:"",dept:"D01",lead:"",leadEmail:"",startDate:"",endDate:"",priority:"High",kpis:[],note:"",trello:""});
  const [submitDone,   setSubmitDone] = useState(false);
  const [rejectNote,   setRejectNote] = useState({});
  const [approvalToast,setApprToast] = useState(null);
  const [editingActual, setEditingActual] = useState(null);
  const [alertModalProj, setAlertModal]  = useState(null);
  const [docsModal,      setDocsModal]  = useState(null);

  const [localProjects, setProjects] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(true);
  const data = {
    ...(sheetData || STATIC_DATA),
    projects: localProjects || (sheetData?.projects?.length ? sheetData.projects : []),
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchSheetData();
    const interval = setInterval(() => { fetchSheetData(); }, 300000);
    return () => clearInterval(interval);
  }, []);

  // Auto-set dept filter when user logs in
  useEffect(() => {
    if (currentUser && currentUser.dept !== "all") {
      setFilterDept(currentUser.dept);
    }
  }, [currentUser]);

  function login(email, password) {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      if (user.dept !== "all") setFilterDept(user.dept);
      setLoginError("");
      // Log to ActivityLog sheet
      fetch(`${APPS_SCRIPT_URL}?func=logLogin&data=${encodeURIComponent(JSON.stringify({ id:user.id, name:user.name, role:user.role }))}`).catch(()=>{});
    } else {
      setLoginError("Incorrect email or password. Please try again.");
    }
  }

  function logout() {
    setCurrentUser(null);
    setFilterDept("all");
    setView("executive");
  }

  // Critical KPI notification
  useEffect(() => {
    const criticals = data.kpis.filter(k => getKPIStatus(k) === "critical");
    if (criticals.length > 0) {
      setNotification(`⚠️ ${criticals.length} Critical KPIs need attention`);
    }
  }, [data]);

  async function fetchSheetData() {
    if (typeof google !== 'undefined' && google.script) {
      // Inside Apps Script
      google.script.run
        .withSuccessHandler(function(json) {
          try {
            const res = JSON.parse(json);
            if (!res.ok) { setSheetLoading(false); return; }
            const projects = res.projects.filter(p => p.id && p.name);
            setSheetData(d => ({ ...(d || STATIC_DATA), projects }));
            setLastRefresh(new Date());
            setSheetLoading(false);
          } catch(e) { setSheetLoading(false); }
        })
        .withFailureHandler(() => setSheetLoading(false))
        .getProjectsData();
    } else {
      // Netlify — use local proxy function
      try {
        const url  = `${API_BASE}?func=getProjectsData`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.ok && data.projects?.length) {
          const projects = data.projects.filter(p => p.id && p.name);
          console.log("✅ Loaded", projects.length, "projects");
          setSheetData(d => ({ ...(d || STATIC_DATA), projects }));
          setSheetLoading(false);
          setLastRefresh(new Date());
        } else {
          console.warn("⚠ No projects:", data.error||"");
          setSheetLoading(false);
        }
      } catch(e) {
        console.error("⚠ Error:", e.message);
        setSheetLoading(false);
      }
    }
  }

  function mapDept(name) {
    if (!name) return "D01";
    const n = name.toLowerCase();
    if (n.includes("excellence") || n.includes("ops ex")) return "D01";
    if (n.includes("last mile") || n.includes("lm"))       return "D02";
    if (n.includes("customer service") || n.includes("cs"))return "D03";
    if (n.includes("facility") || n.includes("maintenance"))return "D04";
    if (n.includes("in-store") || n.includes("store"))     return "D05";
    return "D01";
  }

  // ── ALERT HELPERS ───────────────────────────────────────────────────────
  function daysRemaining(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    return Math.round((end - now) / (1000 * 60 * 60 * 24));
  }

  // ── Parse KPI value from sheet format "K29: 1.55% | K27: 50%" ──────────────
  function parseKPIValue(raw, kpiId) {
    if (!raw || raw === "" || raw === "—" || raw === "TBD") return null;
    const str = String(raw);
    const segments = str.split("|").map(s => s.trim());
    for (const seg of segments) {
      if (kpiId && seg.toUpperCase().includes(kpiId.toUpperCase())) {
        // Extract number — skip the KNN part
        const afterColon = seg.includes(":") ? seg.split(":").slice(1).join(":") : seg;
        const match = afterColon.match(/[\d.]+/);
        if (match) return parseFloat(match[0]);
      }
    }
    // No kpiId match — return first number found
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  // ── KPI Actual — from Sheet KPI_Actual column ────────────────────────────
  function getKPIActual(kpiId, projId) {
    const proj = data.projects.find(p => p.id === projId);
    if (proj?.kpiActual) {
      const v = parseKPIValue(proj.kpiActual, kpiId);
      if (v !== null) return v;
    }
    // fallback static
    const kpi = data.kpis.find(k => k.id === kpiId);
    return kpi?.actual ?? null;
  }

  // ── KPI Target — from Sheet KPI_Target column ────────────────────────────
  function getKPITarget(kpiId, projId) {
    const proj = data.projects.find(p => p.id === projId);
    if (proj?.kpiTarget) {
      const v = parseKPIValue(proj.kpiTarget, kpiId);
      if (v !== null) return v;
    }
    return PRIMARY_KPI[projId]?.target ?? null;
  }

  // ── KPI Baseline — from Sheet KPI_Baseline column ────────────────────────
  function getKPIBaseline(kpiId, projId) {
    const proj = data.projects.find(p => p.id === projId);
    if (proj?.kpiBaseline) {
      const v = parseKPIValue(proj.kpiBaseline, kpiId);
      if (v !== null) return v;
    }
    return PRIMARY_KPI[projId]?.baseline ?? null;
  }

  // ── Progress = average of all linked KPIs ────────────────────────────────
  // (Actual - Baseline) ÷ (Target - Baseline) × 100 per KPI → average
  function getKPIProgress(projId) {
    const proj = data.projects.find(p => p.id === projId);
    if (!proj?.kpis?.length) return null;
    const results = [];
    proj.kpis.forEach(kpiId => {
      const actual   = getKPIActual(kpiId, projId);
      const target   = getKPITarget(kpiId, projId);
      const baseline = getKPIBaseline(kpiId, projId);
      if (actual === null || target === null || baseline === null) return;
      if (baseline === target) { results.push(100); return; }
      const map = PRIMARY_KPI[projId];
      const dir = map?.dir || "higher";
      let prog;
      if (dir === "higher") {
        prog = ((actual - baseline) / (target - baseline)) * 100;
      } else {
        prog = ((baseline - actual) / (baseline - target)) * 100;
      }
      results.push(Math.min(Math.max(prog, 0), 100));
    });
    if (!results.length) return null;
    return Math.round(results.reduce((a,b)=>a+b,0) / results.length);
  }

  function getProjProgress(projId) {
    // KPI-based progress (from sheet data)
    const kpiProg = getKPIProgress(projId);
    if (kpiProg !== null) return kpiProg;
    return null;
  }

  function getAlertStatus(proj) {
    if (proj.status === "Completed") return "done";
    const days = daysRemaining(proj.endDate);
    if (days < 0) return "overdue";
    if (days < 14 && proj.progress < 80) return "atrisk";
    if (days < 30 && proj.progress < 50) return "watch";
    return "ontrack";
  }

  const ALERT_CFG = {
    done:    { label:"✅ Done",      color:"#10B981", bg:"rgba(16,185,129,0.12)"  },
    overdue: { label:"🔴 Overdue",   color:"#EF4444", bg:"rgba(239,68,68,0.12)"   },
    atrisk:  { label:"🟡 At Risk",   color:"#F59E0B", bg:"rgba(245,158,11,0.12)"  },
    watch:   { label:"⚠ Watch",      color:"#F97316", bg:"rgba(249,115,22,0.12)"  },
    ontrack: { label:"🟢 On Track",  color:"#10B981", bg:"rgba(16,185,129,0.08)"  },
  };

  function getKPIVariance(proj) {
    if (!proj.kpiActual || proj.kpiActual === "") return null;
    return "filled";
  }

  // Projects that need alerts (overdue or at risk)
  const alertProjects = (sheetData||STATIC_DATA).projects.filter(p => {
    const s = getAlertStatus(p);
    const deptMatch = filterDept === "all" || p.dept === filterDept;
    return deptMatch && (s === "overdue" || s === "atrisk");
  });

  // Summary stats
  const allKPIs = data.kpis.filter(k => filterDept === "all" || k.dept === filterDept);
  const goodKPIs     = allKPIs.filter(k => getKPIStatus(k) === "good").length;
  const warningKPIs  = allKPIs.filter(k => getKPIStatus(k) === "warning").length;
  const criticalKPIs = allKPIs.filter(k => getKPIStatus(k) === "critical").length;
  const healthScore  = Math.round((goodKPIs / allKPIs.length) * 100);

  const allProjects  = data.projects.filter(p => filterDept === "all" || p.dept === filterDept);
  const completedP   = allProjects.filter(p => p.status === "Completed").length;
  const inProgressP  = allProjects.filter(p => p.status === "In Progress").length;
  const criticalP    = allProjects.filter(p => p.priority === "Critical" && p.status !== "Completed").length;

  function submitProject() {
    if (!submitForm.name || !submitForm.lead || !submitForm.leadEmail) return;
    setPending(p => [{...submitForm, id:`PR${Date.now()}`, submittedAt:new Date().toLocaleDateString("en-GB"), approvalStatus:"Pending"}, ...p]);
    setSubmitDone(true);
    setTimeout(() => { setSubmitDone(false); setSubmitForm({name:"",dept:"D01",lead:"",leadEmail:"",startDate:"",endDate:"",priority:"High",kpis:[],note:"",trello:""}); setView("executive"); }, 2000);
  }
  function approveProject(pid) {
    const p = pending.find(x => x.id === pid);
    if (!p) return;
    const approved = {...p, status:"Planned", progress:0, milestones:[], weeklyLogs:[], assessments:[], approvalStatus:"Approved"};
    setSheetData(d => ({...(d||STATIC_DATA), projects:[approved, ...(d||STATIC_DATA).projects]}));
    setPending(ps => ps.filter(x => x.id !== pid));
    setApprToast({type:"approved", name:p.name, email:p.leadEmail});
    setTimeout(() => setApprToast(null), 4000);
    // ✅ Add to Google Sheet via API
    const _deptNames = {D01:"Operations Excellence",D02:"Last Mile",D03:"Customer Service",D04:"Facility & Maintenance",D05:"In-Store Operations"};
    const _addPayload = { name:p.name, deptName:_deptNames[p.dept]||p.dept,
      lead:p.lead, leadEmail:p.leadEmail||p.email,
      startDate:p.startDate||'', endDate:p.endDate||'',
      priority:p.priority, kpis:p.kpis||[], trello:p.trello||'',
      approvedBy:currentUser?.name||'Executive' };
    fetch(`${APPS_SCRIPT_URL}?func=addProject&data=${encodeURIComponent(JSON.stringify(_addPayload))}`)
      .then(r=>r.json()).then(r=>console.log("✅ Added to sheet:", r)).catch(()=>{});
  }
  function rejectProject(pid) {
    const p = pending.find(x => x.id === pid);
    setPending(ps => ps.map(x => x.id===pid ? {...x, approvalStatus:"Rejected", rejectReason:rejectNote[pid]||""} : x));
    if(p){ setApprToast({type:"rejected", name:p.name, email:p.leadEmail}); setTimeout(()=>setApprToast(null),4000); }
  }

  const navigate = (v, dept = null, kpi = null) => {
    setView(v);
    setActiveDept(dept);
    setActiveKPI(kpi);
    setAnimKey(k => k + 1);
  };

  // ── STYLES ─────────────────────────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh",
      height: "100vh",
      width: "100vw",
      background: "#060E1A",
      color: "#E2E8F0",
      fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
      display: "flex",
      position: "fixed",
      inset: 0,
      overflow: "hidden",
    },
    bg: {
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,194,212,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.05) 0%, transparent 60%)",
    },
    sidebar: {
      width: sidebarOpen ? 240 : 64,
      minHeight: "100vh",
      background: "rgba(10,22,40,0.95)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      transition: "width 0.3s ease",
      zIndex: 10, flexShrink: 0,
      backdropFilter: "blur(20px)",
    },
    main: {
      flex: 1, padding: "24px", overflowY: "auto", zIndex: 1,
      maxHeight: "100vh",
    },
    card: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "20px",
      backdropFilter: "blur(12px)",
      transition: "all 0.2s ease",
    },
    cardHover: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(0,194,212,0.25)",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    },
    badge: (color) => ({
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${color}20`, color, border: `1px solid ${color}40`,
      borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600,
    }),
    btn: (active, color = "#00C2D4") => ({
      display: "flex", alignItems: "center", gap: 8,
      padding: sidebarOpen ? "10px 16px" : "10px 0",
      justifyContent: sidebarOpen ? "flex-start" : "center",
      borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
      background: active ? `${color}18` : "transparent",
      color: active ? color : "#64748B",
      border: active ? `1px solid ${color}30` : "1px solid transparent",
      fontWeight: active ? 600 : 400, fontSize: 13,
      width: "100%",
    }),
  };

  // ── HOVER STATE for cards ──────────────────────────────────────────────────
  const [hoveredCard, setHoveredCard] = useState(null);
  const cardStyle = (id) => ({
    ...S.card,
    ...(hoveredCard === id ? S.cardHover : {}),
    cursor: "pointer",
  });

  // ── NOTIFICATION BAR ───────────────────────────────────────────────────────
  const NotifBar = () => notification ? (
    <div style={{
      background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 10, padding: "10px 16px", marginBottom: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      animation: "slideDown 0.4s ease",
    }}>
      <span style={{ color: "#EF4444", fontSize: 13, fontWeight: 600 }}>{notification}</span>
      <button onClick={() => setNotification(null)}
        style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 16 }}>✕</button>
    </div>
  ) : null;

  // ── SIDEBAR ────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={S.sidebar}>
      {/* Logo */}
      <div style={{ padding:"16px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)", cursor:"pointer" }}
        onClick={()=>setSidebar(o=>!o)}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:"'Nunito','DM Sans',sans-serif", fontWeight:900, fontStyle:"italic",
            color:"#00C2D4", fontSize:sidebarOpen?20:16, lineHeight:1, whiteSpace:"nowrap" }}>
            {sidebarOpen ? "ninja" : "n"}
          </span>
          {sidebarOpen && <span style={{ fontFamily:"'Nunito','DM Sans',sans-serif", fontWeight:900,
            fontStyle:"italic", color:"rgba(255,255,255,0.15)", fontSize:20, lineHeight:1 }}>ops</span>}
        </div>
      </div>




      {/* Nav */}
      <div style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { id: "executive", label: "Executive Overview", icon: "🎯" },
          { id: "projects",  label: "All Projects",       icon: "📋" },
          ...(currentUser?.role==="executive" ? [{ id:"alerts", label:`🚨 Alerts${alertProjects.length>0?" ("+alertProjects.length+")":""}`, icon:"🚨" }] : []),
          { id: "submit",    label: "➕ Submit Project",    icon: "➕" },
          ...(currentUser?.role==="executive" ? [{ id:"approvals", label:`✅ Approvals${pending.filter(p=>p.approvalStatus==="Pending").length>0?" ("+pending.filter(p=>p.approvalStatus==="Pending").length+")":""}`, icon:"✅" }] : []),
        ].map(item => (
          <button key={item.id} onClick={() => navigate(item.id)}
            style={S.btn(view === item.id)}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
            {sidebarOpen && item.label}
          </button>
        ))}

        {sidebarOpen && <div style={{ fontSize: 10, color: "#64748B", padding: "12px 8px 4px",
          textTransform: "uppercase", letterSpacing: 1 }}>Departments</div>}

        {data.departments.map(dept => (
          <button key={dept.id} onClick={() => navigate("dept", dept.id)}
            style={S.btn(view === "dept" && activeDept === dept.id, dept.color)}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{dept.icon}</span>
            {sidebarOpen && <span style={{ fontSize: 12, textAlign: "left" }}>{dept.name}</span>}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {sidebarOpen && <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>
          Refreshed: {lastRefresh.toLocaleTimeString()}
        </div>}
        <button onClick={fetchSheetData} style={{
          ...S.btn(false), justifyContent: sidebarOpen ? "flex-start" : "center",
        }}>
          <span>🔄</span>{sidebarOpen && "Sync Sheet"}
        </button>
        {sidebarOpen && (
          <div style={{ fontSize:8, marginTop:6, padding:"4px 8px",
            background:"rgba(16,185,129,0.08)",
            border:"1px solid rgba(16,185,129,0.2)",
            borderRadius:6, color:"#10B981", textAlign:"center" }}>
            {`✅ ${data.projects.length} projects loaded`}
          </div>
        )}
      </div>
      {/* User + Logout */}
      <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.06)",
        display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
          background:`${currentUser?.color||"#00C2D4"}25`,
          border:`1px solid ${currentUser?.color||"#00C2D4"}40`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:800, color:currentUser?.color||"#00C2D4" }}>
          {currentUser?.avatar}
        </div>
        {sidebarOpen && (
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#E2E8F0",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {currentUser?.name.split(" ")[0]}
            </div>
            <div style={{ fontSize:9, color:"#475569", textTransform:"capitalize" }}>
              {currentUser?.role}
            </div>
          </div>
        )}
        {sidebarOpen && (
          <button onClick={logout} title="Sign out"
            style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
              borderRadius:7, padding:"5px 8px", cursor:"pointer",
              fontSize:11, color:"#EF4444", fontWeight:700 }}>
            ↩
          </button>
        )}
      </div>
    </div>
  );

  // ── KPI CARD ───────────────────────────────────────────────────────────────
  const KPICard = ({ kpi, dept, compact = false }) => {
    const st = getKPIStatus(kpi);
    const cfg = getStatusConfig(st);
    const pct = kpi.dir === "higher"
      ? Math.min((kpi.actual / kpi.target) * 100, 110)
      : Math.min((kpi.target / kpi.actual) * 100, 110);
    const trendData = [kpi.actual * 0.85, kpi.actual * 0.9, kpi.actual * 0.95, kpi.actual * 0.92, kpi.actual];

    return (
      <div style={cardStyle(`kpi-${kpi.id}`)}
        onMouseEnter={() => setHoveredCard(`kpi-${kpi.id}`)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => navigate("kpi-detail", kpi.dept, kpi.id)}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>{kpi.id} · {kpi.freq}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", lineHeight: 1.3 }}>{kpi.name}</div>
          </div>
          <div style={{ ...S.badge(cfg.color), fontSize: 10 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
            {cfg.label}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
              {typeof kpi.actual === "number" ? kpi.actual.toFixed(kpi.actual % 1 !== 0 ? 1 : 0) : kpi.actual}
              <span style={{ fontSize: 12, fontWeight: 400, color: "#64748B", marginLeft: 4 }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              Target: {kpi.target}{kpi.unit}
            </div>
          </div>
          {!compact && <Sparkline data={trendData} color={cfg.color} />}
        </div>

        <ProgressBar value={pct} color={cfg.color} />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#475569" }}>
          <span>Q1:{kpi.q1} · Q2:{kpi.q2}</span>
          <TrendArrow kpi={kpi} />
        </div>
      </div>
    );
  };

  // ── PROJECT CARD ──────────────────────────────────────────────────────────
  const ProjectCard = ({ proj }) => {
    const dept       = data.departments.find(d => d.id === proj.dept);
    const linkedKPIs = data.kpis.filter(k => proj.kpis.includes(k.id));
    const alert      = getAlertStatus(proj);
    const alertC     = ALERT_CFG[alert];
    const days       = proj.endDate ? daysRemaining(proj.endDate) : null;
    const map        = PRIMARY_KPI[proj.id];
    const kpiObj     = map ? data.kpis.find(k => k.id === map.kpi) : null;
    const calcProg   = getKPIProgress(proj.id) ?? proj.progress ?? 0;
    const priCfg     = { Critical:"#EF4444", High:"#F59E0B", Medium:"#00C2D4", Low:"#10B981" }[proj.priority] || "#64748B";
    const stCfg      = getProjStatusConfig(proj.status);
    const [alertSent, setAlertSent] = useState(false);
    const [showPhases, setShowPhases] = useState(false);
    const phases = getProjectPhases(proj);

    function fmtDate(d) {
      if (!d) return "";
      try { return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
      catch { return d; }
    }

    const initials = (proj.lead||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("");

    // Progress color
    const progColor = calcProg >= 70 ? "#10B981" : calcProg >= 40 ? "#F59E0B" : "#EF4444";

    return (
      <div style={{
        background:"#0D1626",
        borderRadius:20,
        border:`1px solid rgba(255,255,255,0.06)`,
        boxShadow:"0 4px 24px rgba(0,0,0,0.3)",
        overflow:"hidden",
        fontFamily:"'DM Sans',system-ui,sans-serif",
        transition:"transform 0.15s,box-shadow 0.15s",
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.4)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.3)";}}
      >
        {/* ── Top accent bar ── */}
        <div style={{ height:3, background:`linear-gradient(90deg,${progColor},${progColor}40)` }}/>

        <div style={{ padding:"16px 18px" }}>

          {/* ── Row 1: ID + Priority + Status ── */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:14 }}>{dept?.icon}</span>
              <span style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:0.5 }}>{proj.id}</span>
              <span style={{ fontSize:9,fontWeight:700,color:priCfg,
                background:`${priCfg}15`,borderRadius:99,padding:"2px 8px" }}>
                {proj.priority}
              </span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:5,
              background:`${stCfg.color}12`,borderRadius:99,
              padding:"4px 10px",border:`1px solid ${stCfg.color}25` }}>
              <div style={{ width:6,height:6,borderRadius:"50%",
                background:stCfg.color,boxShadow:`0 0 5px ${stCfg.color}` }}/>
              <span style={{ fontSize:10,fontWeight:700,color:stCfg.color }}>{proj.status}</span>
            </div>
          </div>

          {/* ── Row 2: Title ── */}
          <div style={{ fontSize:13,fontWeight:800,color:"#F1F5F9",
            lineHeight:1.3,marginBottom:14,letterSpacing:-0.3 }}>
            {proj.name}
          </div>

          {/* ── Row 3: Progress (most prominent) ── */}
          <div style={{ background:`${progColor}08`,borderRadius:14,
            padding:"14px 16px",marginBottom:14,
            border:`1px solid ${progColor}20` }}>
            <div style={{ display:"flex",justifyContent:"space-between",
              alignItems:"center",marginBottom:10 }}>
              <div>
                <div style={{ fontSize:9,color:"#475569",fontWeight:600,
                  textTransform:"uppercase",letterSpacing:0.8,marginBottom:4 }}>
                  Project Progress
                </div>
                <div style={{ fontSize:36,fontWeight:900,color:progColor,
                  lineHeight:1,letterSpacing:-1 }}>
                  {calcProg}<span style={{ fontSize:20 }}>%</span>
                </div>
              </div>
              {/* Circular progress indicator */}
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={progColor} strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*22}`}
                  strokeDashoffset={`${2*Math.PI*22*(1-calcProg/100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                  style={{ transition:"stroke-dashoffset 1s ease" }}/>
                <text x="28" y="33" textAnchor="middle"
                  fontSize="11" fontWeight="800" fill={progColor}>
                  {calcProg}%
                </text>
              </svg>
            </div>
            {/* Progress bar */}
            <div style={{ height:5,borderRadius:99,
              background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
              <div style={{ width:`${calcProg}%`,height:"100%",borderRadius:99,
                background:`linear-gradient(90deg,${progColor}80,${progColor})`,
                transition:"width 1s ease" }}/>
            </div>
          </div>

          {/* ── Row 4: Owner + Dates (side by side) ── */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
            {/* Owner */}
            <div style={{ background:"rgba(255,255,255,0.03)",borderRadius:10,
              padding:"8px 10px",border:"1px solid rgba(255,255,255,0.05)",
              display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,
                background:`${dept?.color||"#64748B"}20`,
                border:`1.5px solid ${dept?.color||"#64748B"}40`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:9,fontWeight:800,color:dept?.color||"#64748B" }}>
                {initials}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:10,fontWeight:700,color:"#CBD5E1",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {proj.lead || "—"}
                </div>
                <div style={{ fontSize:8,color:"#475569",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {proj.email || ""}
                </div>
              </div>
            </div>
            {/* Dates */}
            <div style={{ background:"rgba(255,255,255,0.03)",borderRadius:10,
              padding:"8px 10px",border:`1px solid ${days!==null&&days<0?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.05)"}` }}>
              <div style={{ fontSize:8,color:"#475569",fontWeight:600,
                textTransform:"uppercase",letterSpacing:0.6,marginBottom:3 }}>Timeline</div>
              <div style={{ fontSize:10,fontWeight:600,color:"#94A3B8",lineHeight:1.4 }}>
                {fmtDate(proj.startDate)}
              </div>
              <div style={{ fontSize:10,fontWeight:600,
                color:days!==null&&days<0?"#EF4444":"#94A3B8",lineHeight:1.4 }}>
                → {fmtDate(proj.endDate)}
              </div>
              {days !== null && (
                <div style={{ fontSize:9,fontWeight:700,marginTop:2,
                  color:days<0?"#EF4444":days<14?"#F59E0B":"#10B981" }}>
                  {days<0?`${Math.abs(days)}d overdue`:`${days}d left`}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 5: Primary KPI ── */}
          {kpiObj && map && (
            <div style={{ background:"rgba(255,255,255,0.03)",borderRadius:10,
              padding:"10px 12px",marginBottom:14,
              border:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:8,color:"#475569",fontWeight:600,
                    textTransform:"uppercase",letterSpacing:0.6,marginBottom:3 }}>
                    {kpiObj.name}
                  </div>
                  <div style={{ display:"flex",alignItems:"baseline",gap:6 }}>
                    <span style={{ fontSize:18,fontWeight:800,color:progColor }}>
                      {getKPIActual(map?.kpi, proj.id) ?? "—"}
                    </span>
                    <span style={{ fontSize:11,color:"#475569" }}>{map?.unit}</span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:8,color:"#475569",marginBottom:3 }}>Target</div>
                  <div style={{ fontSize:14,fontWeight:700,color:"#64748B" }}>
                    {getKPITarget(map?.kpi, proj.id) ?? map?.target ?? "—"} {map?.unit}
                  </div>
                  <div style={{ fontSize:8,color:"#475569",marginTop:2 }}>
                    Base: {getKPIBaseline(map?.kpi, proj.id) ?? map?.baseline ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Row 6: KPI tags ── */}
          {linkedKPIs.length > 0 && (
            <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:14 }}>
              {linkedKPIs.slice(0,4).map(k=>(
                <span key={k.id} style={{ fontSize:9,fontWeight:600,color:"#00C2D4",
                  background:"rgba(0,194,212,0.08)",border:"1px solid rgba(0,194,212,0.15)",
                  borderRadius:99,padding:"2px 8px" }}>
                  {k.name}
                </span>
              ))}
              {linkedKPIs.length>4 && (
                <span style={{ fontSize:9,color:"#475569" }}>+{linkedKPIs.length-4} more</span>
              )}
            </div>
          )}

          {/* ── Row 7: Update KPI Actual ── */}
          {editingActual === proj.id ? (
            <div style={{ background:"rgba(0,194,212,0.06)",borderRadius:10,
              padding:"10px 12px",marginBottom:14,
              border:"1px solid rgba(0,194,212,0.2)" }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:9,color:"#00C2D4",fontWeight:700,
                marginBottom:8 }}>✏ Update KPI Actual — syncs to Sheet</div>
              {linkedKPIs.map(k => {
                const [val, setVal] = useState(k.actual !== undefined ? String(k.actual) : "");
                return (
                  <div key={k.id} style={{ display:"flex",alignItems:"center",
                    gap:6,marginBottom:6 }}>
                    <span style={{ fontSize:9,color:"#94A3B8",flex:1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {k.name}
                    </span>
                    <span style={{ fontSize:9,color:"#10B981",
                      background:"rgba(16,185,129,0.1)",borderRadius:99,
                      padding:"1px 6px",whiteSpace:"nowrap" }}>T:{k.q1}</span>
                    <input value={val} onChange={e=>setVal(e.target.value)}
                      placeholder="Actual"
                      style={{ width:60,background:"rgba(0,194,212,0.08)",
                        border:"1px solid #00C2D4",borderRadius:6,
                        padding:"3px 7px",color:"#E2E8F0",
                        fontSize:10,fontFamily:"inherit",outline:"none",textAlign:"center" }}/>
                    <button onClick={async()=>{
                      try {
                        const payload = { id:proj.id, kpiId:k.id, kpiActual:val,
                          updatedBy:currentUser?.name||"", role:currentUser?.role||"" };
                        const url = `/.netlify/functions/proxy?func=updateProject&data=${encodeURIComponent(JSON.stringify(payload))}`;
                        const res = await fetch(url);
                        const d2 = await res.json();
                        if (d2.ok) { k.actual=parseFloat(val)||val; setEditingActual(null); }
                      } catch(e) { console.error(e); }
                    }} style={{ background:"#10B981",color:"#fff",border:"none",
                      borderRadius:6,padding:"3px 8px",fontSize:9,
                      fontWeight:700,cursor:"pointer" }}>Save ✓</button>
                  </div>
                );
              })}
              <button onClick={e=>{e.stopPropagation();setEditingActual(null);}}
                style={{ width:"100%",background:"rgba(255,255,255,0.04)",border:"none",
                  borderRadius:6,padding:"5px 0",fontSize:9,color:"#64748B",
                  cursor:"pointer",marginTop:4 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={e=>{e.stopPropagation();setEditingActual(proj.id);}}
              style={{ width:"100%",background:"rgba(0,194,212,0.06)",color:"#00C2D4",
                border:"1px solid rgba(0,194,212,0.15)",borderRadius:10,
                padding:"7px 0",fontSize:10,fontWeight:700,
                cursor:"pointer",marginBottom:14,fontFamily:"inherit" }}>
              ✏ Update KPI Actual
            </button>
          )}

          {/* ── Row 8: Phases expand ── */}
          {(()=>{
            const doneCount = phases.filter(p=>p.status==="Completed").length;
            return (
              <>
                {showPhases && (
                  <div style={{ marginBottom:14,padding:"10px 12px",
                    background:"rgba(124,58,237,0.06)",borderRadius:10,
                    border:"1px solid rgba(124,58,237,0.15)" }}
                    onClick={e=>e.stopPropagation()}>
                    {phases.map((ph,i)=>{
                      const isDone=ph.status==="Completed";
                      const isActive=ph.status==="In Progress";
                      const c=isDone?"#10B981":isActive?"#00C2D4":"#334155";
                      return (
                        <div key={i} style={{ marginBottom:i<3?10:0 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",
                            alignItems:"center",marginBottom:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                              <span>{ph.icon}</span>
                              <span style={{ fontSize:10,fontWeight:700,color:c }}>
                                {ph.name}
                              </span>
                              <span style={{ fontSize:8,color:c,
                                background:`${c}15`,borderRadius:99,padding:"1px 5px" }}>
                                {ph.status}
                              </span>
                            </div>
                            <span style={{ fontSize:10,fontWeight:800,color:c }}>{ph.progress}%</span>
                          </div>
                          <div style={{ height:4,borderRadius:99,
                            background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
                            <div style={{ width:`${ph.progress}%`,height:"100%",
                              background:c,borderRadius:99,transition:"width 0.8s" }}/>
                          </div>
                          <div style={{ fontSize:8,color:"#334155",marginTop:2 }}>
                            {ph.startDate} → {ph.endDate}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Row 9: Action buttons ── */}
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
            {proj.trello && (
              <a href={proj.trello} target="_blank" rel="noreferrer"
                onClick={e=>e.stopPropagation()}
                style={{ fontSize:9,color:"#00C2D4",textDecoration:"none",
                  background:"rgba(0,194,212,0.08)",border:"1px solid rgba(0,194,212,0.2)",
                  borderRadius:8,padding:"5px 10px",fontWeight:700 }}>
                🔗 Trello
              </a>
            )}
            <button onClick={e=>{e.stopPropagation();setShowPhases(v=>!v);}}
              style={{ fontSize:9,color:"#7C3AED",fontWeight:700,
                background:showPhases?"rgba(124,58,237,0.2)":"rgba(124,58,237,0.08)",
                border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,
                padding:"5px 10px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:4 }}>
              📋 Phases
              <span style={{ background:"rgba(124,58,237,0.3)",borderRadius:99,
                padding:"0px 5px",fontSize:8 }}>
                {phases.filter(p=>p.status==="Completed").length}/4
              </span>
            </button>
            <button onClick={e=>{e.stopPropagation();setDocsModal(proj.id);}}
              style={{ fontSize:9,color:"#F59E0B",fontWeight:700,
                background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
                borderRadius:8,padding:"5px 10px",cursor:"pointer" }}>
              📁 Docs
            </button>
            {currentUser?.role==="executive" && (alert==="overdue"||alert==="atrisk") && proj.email && (
              <button onClick={e=>{e.stopPropagation();setAlertSent(true);
                setTimeout(()=>setAlertSent(false),3000);setAlertModal(proj);}}
                style={{ marginLeft:"auto",fontSize:9,fontWeight:700,
                  background:alertSent?"rgba(16,185,129,0.15)":"#EF4444",
                  color:alertSent?"#10B981":"#fff",
                  border:"none",borderRadius:8,padding:"5px 12px",
                  cursor:"pointer",transition:"all 0.2s" }}>
                {alertSent?"✓ Sent":"📧 Alert"}
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };


  const ExecutiveView = () => {
    const visibleDepts = filterDept === "all"
      ? data.departments
      : data.departments.filter(d => d.id === filterDept);

    const deptHealth = visibleDepts.map(dept => {
      const dKPIs = data.kpis.filter(k => k.dept === dept.id);
      const good  = dKPIs.filter(k => getKPIStatus(k) === "good").length;
      const warn  = dKPIs.filter(k => getKPIStatus(k) === "warning").length;
      const crit  = dKPIs.filter(k => getKPIStatus(k) === "critical").length;
      const score = dKPIs.length ? Math.round((good / dKPIs.length) * 100) : 0;
      const dProj = data.projects.filter(p => p.dept === dept.id);
      return { ...dept, good, warn, crit, score, kpiCount: dKPIs.length, projCount: dProj.length };
    });

    return (
      <div key={animKey} style={{ animation: "fadeIn 0.5s ease" }}>
        <NotifBar />

        {/* Header */}
      {currentUser?.role==="executive" && alertProjects.length > 0 && (
        <div onClick={()=>navigate("alerts")} style={{
          background:"rgba(239,68,68,0.08)",
          border:"1px solid rgba(239,68,68,0.25)",
          borderRadius:12, padding:"10px 18px", marginBottom:18,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:8, cursor:"pointer", transition:"background 0.2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.13)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16, animation:"pulse 1.8s infinite" }}>🚨</span>
            <div>
              <span style={{ fontSize:12, fontWeight:700, color:"#EF4444" }}>
                {alertProjects.length} project{alertProjects.length>1?"s":""} need attention
              </span>
              <span style={{ fontSize:11, color:"#94A3B8", marginLeft:8 }}>
                {alertProjects.map(p=>p.id).join(" · ")}
              </span>
            </div>
          </div>
          <span style={{ background:"#EF4444", color:"#fff", borderRadius:8,
            padding:"4px 13px", fontSize:11, fontWeight:700 }}>
            View →
          </span>
        </div>
      )}
      <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F1F5F9", marginBottom: 4 }}>
            ninja ops · Command Center
          </div>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            OMP 2026 · {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </div>
        </div>

        {/* Global Health Score */}
        <div style={{
          ...S.card,
          background: "linear-gradient(135deg, rgba(0,194,212,0.1) 0%, rgba(124,58,237,0.08) 100%)",
          border: "1px solid rgba(0,194,212,0.2)", marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Global Health Score</div>
              <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1,
                background: "linear-gradient(135deg, #00C2D4, #7C3AED)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {healthScore}%
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                {goodKPIs} on track · {warningKPIs} at risk · {criticalKPIs} critical
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Total KPIs",    val: allKPIs.length,   color: "#00C2D4" },
                { label: "Projects",      val: allProjects.length,color: "#7C3AED" },
                { label: "Completed",     val: completedP,        color: "#10B981" },
                { label: "In Progress",   val: inProgressP,       color: "#F59E0B" },
                { label: "Critical Projects", val: criticalP,     color: "#EF4444" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "#64748B" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <ProgressBar value={healthScore} color="#00C2D4" height={4} />
        </div>

        {/* Department Health Grid */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Department Health</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
          {deptHealth.map(dept => (
            <div key={dept.id} style={cardStyle(`dept-${dept.id}`)}
              onMouseEnter={() => setHoveredCard(`dept-${dept.id}`)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => navigate("dept", dept.id)}>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${dept.color}20`, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{dept.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{dept.name}</div>
                  <div style={{ fontSize: 10, color: "#64748B" }}>{dept.kpiCount} KPIs · {dept.projCount} Projects</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ position: "relative", width: 52, height: 52 }}>
                  <RadialGauge value={dept.score} color={dept.color} size={52} />
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: dept.color,
                  }}>{dept.score}%</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ ...S.badge("#10B981"), fontSize: 9 }}>✓ {dept.good} Good</span>
                  <span style={{ ...S.badge("#F59E0B"), fontSize: 9 }}>⚠ {dept.warn} Warn</span>
                  <span style={{ ...S.badge("#EF4444"), fontSize: 9 }}>✕ {dept.crit} Crit</span>
                </div>
              </div>

              <ProgressBar value={dept.score} color={dept.color} height={4} />
            </div>
          ))}
        </div>

        {/* Critical KPIs */}
        {criticalKPIs > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#EF4444", marginBottom: 12,
              textTransform: "uppercase", letterSpacing: 1 }}>🚨 Critical KPIs</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
              {data.kpis.filter(k => getKPIStatus(k) === "critical" && (filterDept==="all"||k.dept===filterDept)).map(kpi => (
                <KPICard key={kpi.id} kpi={kpi} compact />
              ))}
            </div>
          </>
        )}

        {/* Recent Projects */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>Critical Projects</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {data.projects.filter(p => p.priority === "Critical" && (filterDept==="all"||p.dept===filterDept)).map(p => (
            <ProjectCard key={p.id} proj={p} />
          ))}
        </div>
      </div>
    );
  };

  // ── DEPARTMENT VIEW ───────────────────────────────────────────────────────
  const DeptView = () => {
    const dept = data.departments.find(d => d.id === activeDept);
    if (!dept) return null;
    const dKPIs  = data.kpis.filter(k => k.dept === dept.id);
    const dProj  = data.projects.filter(p => p.dept === dept.id);
    const good   = dKPIs.filter(k => getKPIStatus(k) === "good").length;
    const warn   = dKPIs.filter(k => getKPIStatus(k) === "warning").length;
    const crit   = dKPIs.filter(k => getKPIStatus(k) === "critical").length;
    const onTrack   = dProj.filter(p => getAlertStatus(p) === "ontrack").length;
    const atRisk    = dProj.filter(p => getAlertStatus(p) === "atrisk").length;
    const overdue   = dProj.filter(p => getAlertStatus(p) === "overdue").length;
    const completed = dProj.filter(p => p.status === "Completed").length;

    return (
      <div key={animKey} style={{ animation:"fadeIn 0.4s ease" }}>

        {/* ── Dept Header ── */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:16,
            background:`${dept.color}18`, border:`2px solid ${dept.color}30`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
            {dept.icon}
          </div>
          <div>
            <div style={{ fontSize:24, fontWeight:900, color:"#F1F5F9", letterSpacing:-0.5 }}>{dept.name}</div>
            <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
              {dProj.length} Projects · {dKPIs.length} KPIs tracked
            </div>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
          {[
            { label:"On Track",  val:onTrack,   color:"#10B981", bg:"rgba(16,185,129,0.08)"  },
            { label:"At Risk",   val:atRisk,    color:"#F59E0B", bg:"rgba(245,158,11,0.08)"  },
            { label:"Overdue",   val:overdue,   color:"#EF4444", bg:"rgba(239,68,68,0.08)"   },
            { label:"Completed", val:completed, color:"#00C2D4", bg:"rgba(0,194,212,0.08)"   },
          ].map(s=>(
            <div key={s.label} style={{ background:s.bg, borderRadius:12,
              padding:"12px 14px", border:`1px solid ${s.color}20`,
              textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:10, color:"#64748B", marginTop:4, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── KPI Health Bar (compact) ── */}
        <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12,
          padding:"12px 16px", marginBottom:24,
          border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#94A3B8",
              textTransform:"uppercase", letterSpacing:0.8 }}>KPI Health</span>
            <div style={{ display:"flex", gap:12, fontSize:10 }}>
              <span style={{ color:"#10B981" }}>✓ {good} Good</span>
              <span style={{ color:"#F59E0B" }}>⚠ {warn} At Risk</span>
              <span style={{ color:"#EF4444" }}>✕ {crit} Critical</span>
            </div>
          </div>
          <div style={{ display:"flex", height:8, borderRadius:99, overflow:"hidden", gap:2 }}>
            {good>0&&<div style={{ flex:good, background:"#10B981", borderRadius:99 }}/>}
            {warn>0&&<div style={{ flex:warn, background:"#F59E0B", borderRadius:99 }}/>}
            {crit>0&&<div style={{ flex:crit, background:"#EF4444", borderRadius:99 }}/>}
          </div>
        </div>

        {/* ── Projects ── */}
        <div style={{ fontSize:13, fontWeight:700, color:"#94A3B8", marginBottom:14,
          textTransform:"uppercase", letterSpacing:1,
          display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:3, height:16, borderRadius:99, background:dept.color }}/>
          Projects
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
          {dProj.length > 0
            ? dProj.map(p => <ProjectCard key={p.id} proj={p} />)
            : <div style={{ color:"#475569", fontSize:13, padding:20 }}>No projects in this department.</div>
          }
        </div>
      </div>
    );
  };

  // ── ALL PROJECTS VIEW ─────────────────────────────────────────────────────
  const ProjectsView = () => {
    const [pFilter, setPFilter] = useState("all");
    const filtered = data.projects
      .filter(p => pFilter === "all" || p.status === pFilter)
      .filter(p => filterDept === "all" || p.dept === filterDept);

    return (
      <div key={animKey} style={{ animation: "fadeIn 0.5s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9" }}>All Projects</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{filtered.length} projects</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all","In Progress","Planned","Completed"].map(s => (
              <button key={s} onClick={() => setPFilter(s)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                background: pFilter === s ? "rgba(0,194,212,0.2)" : "rgba(255,255,255,0.05)",
                color: pFilter === s ? "#00C2D4" : "#64748B",
              }}>{s === "all" ? "All" : s}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map(p => <ProjectCard key={p.id} proj={p} />)}
        </div>
      </div>
    );
  };

  // ── KPI DETAIL VIEW ───────────────────────────────────────────────────────
  const KPIDetailView = () => {
    const kpi = data.kpis.find(k => k.id === activeKPI);
    if (!kpi) return null;
    const dept = data.departments.find(d => d.id === kpi.dept);
    const st = getKPIStatus(kpi);
    const cfg = getStatusConfig(st);
    const relProjects = data.projects.filter(p => p.kpis.includes(kpi.id));
    const trend = [kpi.actual*0.8,kpi.actual*0.85,kpi.actual*0.88,kpi.actual*0.92,kpi.actual*0.95,kpi.actual];

    return (
      <div key={animKey} style={{ animation: "fadeIn 0.5s ease", maxWidth: 800 }}>
        <button onClick={() => navigate("dept", kpi.dept)} style={{
          background: "none", border: "none", color: "#64748B",
          cursor: "pointer", fontSize: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
        }}>← Back to {dept?.name}</button>

        <div style={{ ...S.card, borderColor: `${cfg.color}30`, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>{kpi.id} · {dept?.name} · {kpi.freq}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9" }}>{kpi.name}</div>
            </div>
            <div style={S.badge(cfg.color)}>{cfg.label}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Actual", val: kpi.actual, unit: kpi.unit, color: cfg.color },
              { label: "Target", val: kpi.target, unit: kpi.unit, color: "#64748B" },
              { label: "Q1 Target", val: kpi.q1, unit: "", color: "#00C2D4" },
              { label: "Q2 Target", val: kpi.q2, unit: "", color: "#7C3AED" },
              { label: "Q3 Target", val: kpi.q3, unit: "", color: "#F59E0B" },
              { label: "Q4 Target", val: kpi.q4, unit: "", color: "#10B981" },
            ].map(s => (
              <div key={s.label} style={{ ...S.card, padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>
                  {s.val}{s.unit && s.unit !== "%" ? ` ${s.unit}` : s.unit}
                </div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>Recent Trend</div>
            <Sparkline data={trend} color={cfg.color} width={300} height={50} />
          </div>
        </div>

        {relProjects.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", marginBottom: 12,
              textTransform: "uppercase", letterSpacing: 1 }}>Projects Driving This KPI</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {relProjects.map(p => <ProjectCard key={p.id} proj={p} />)}
            </div>
          </>
        )}
      </div>
    );
  };


  // ── TOAST ─────────────────────────────────────────────────────────────────
  const ApprovalToast = () => approvalToast ? (
    <div style={{ position:"fixed", top:20, right:20, zIndex:300,
      background: approvalToast.type==="approved" ? "#10B981" : "#EF4444",
      color:"#fff", borderRadius:12, padding:"14px 20px",
      boxShadow:"0 8px 32px rgba(0,0,0,0.25)", maxWidth:320, animation:"slideDown 0.3s ease" }}>
      <div style={{ fontSize:13, fontWeight:800, marginBottom:3 }}>
        {approvalToast.type==="approved" ? "✅ Project Approved!" : "❌ Project Rejected"}
      </div>
      <div style={{ fontSize:11, opacity:0.85 }}>{approvalToast.name}</div>
      <div style={{ fontSize:10, opacity:0.7 }}>📧 Email sent to {approvalToast.email}</div>
    </div>
  ) : null;

  // ── SUBMIT VIEW ───────────────────────────────────────────────────────────
  const SubmitView = () => {
    const kpiKeys = (sheetData||STATIC_DATA).kpis.map(k=>k.id);
    const [lf, setLf] = useState({...submitForm, startDate:submitForm.startDate||"", endDate:submitForm.endDate||""});
    function toggleKPI(kid) { setLf(f=>({...f, kpis:f.kpis.includes(kid)?f.kpis.filter(k=>k!==kid):[...f.kpis,kid]})); }
    const inp = { width:"100%", borderRadius:9, border:"1px solid rgba(255,255,255,0.1)",
      padding:"9px 12px", fontSize:12, fontFamily:"inherit",
      color:"#E2E8F0", background:"rgba(255,255,255,0.06)", outline:"none" };
    const lbl = { fontSize:10, fontWeight:700, color:"#64748B", display:"block",
      marginBottom:5, textTransform:"uppercase", letterSpacing:0.8 };
    return (
      <div key={animKey} style={{ animation:"fadeIn 0.4s ease", maxWidth:600 }}>
        <div style={{ fontSize:18, fontWeight:900, color:"#F1F5F9", marginBottom:4 }}>➕ Submit New Project</div>
        <div style={{ fontSize:11, color:"#64748B", marginBottom:20 }}>
          Your submission goes to the manager for approval before appearing in the tracker.
        </div>
        {submitDone && (
          <div style={{ background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)",
            borderRadius:10, padding:"12px 16px", marginBottom:16,
            fontSize:13, fontWeight:700, color:"#10B981", textAlign:"center" }}>
            ✅ Submitted! Awaiting manager approval.
          </div>
        )}
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:16, padding:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Project Name *</label>
              <input style={inp} placeholder="e.g. Smart Inventory System"
                value={lf.name} onChange={e=>setLf(f=>({...f,name:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Department *</label>
              <select style={inp} value={lf.dept} onChange={e=>setLf(f=>({...f,dept:e.target.value}))}>
                {(sheetData||STATIC_DATA).departments.map(d=>(
                  <option key={d.id} value={d.id} style={{background:"#1e293b"}}>{d.icon} {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <select style={inp} value={lf.priority} onChange={e=>setLf(f=>({...f,priority:e.target.value}))}>
                {["Critical","High","Medium","Low"].map(p=><option key={p} style={{background:"#1e293b"}}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Project Lead *</label>
              <input style={inp} placeholder="Full name"
                value={lf.lead} onChange={e=>setLf(f=>({...f,lead:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Lead Email *</label>
              <input style={inp} placeholder="lead@company.com" type="email"
                value={lf.leadEmail} onChange={e=>setLf(f=>({...f,leadEmail:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Start Date</label>
              <input type="date" style={inp} value={lf.startDate||""}
                onChange={e=>setLf(f=>({...f,startDate:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>End Date</label>
              <input type="date" style={inp} value={lf.endDate||""}
                onChange={e=>setLf(f=>({...f,endDate:e.target.value}))}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Trello Link</label>
              <input style={inp} placeholder="https://trello.com/..."
                value={lf.trello} onChange={e=>setLf(f=>({...f,trello:e.target.value}))}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Related KPIs <span style={{fontWeight:400,textTransform:"none",color:"#475569"}}>({lf.kpis.length} selected)</span></label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, maxHeight:130, overflowY:"auto",
                background:"rgba(255,255,255,0.03)", borderRadius:10, padding:10,
                border:"1px solid rgba(255,255,255,0.08)" }}>
                {kpiKeys.map(kid=>{
                  const sel=lf.kpis.includes(kid);
                  return (
                    <button key={kid} onClick={()=>toggleKPI(kid)} style={{
                      padding:"3px 10px", borderRadius:99,
                      border:`1px solid ${sel?"#00C2D4":"rgba(255,255,255,0.15)"}`,
                      background:sel?"rgba(0,194,212,0.2)":"transparent",
                      color:sel?"#00C2D4":"#64748B",
                      fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                    }}>{kid}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Description / Objective</label>
              <textarea style={{...inp, resize:"none"}} rows={3}
                placeholder="What is the goal of this project?"
                value={lf.note} onChange={e=>setLf(f=>({...f,note:e.target.value}))}/>
            </div>
          </div>
          <button onClick={()=>{setSubmitForm(lf);setTimeout(submitProject,30);}}
            disabled={!lf.name||!lf.lead||!lf.leadEmail}
            style={{ width:"100%", marginTop:18, padding:"12px 0", borderRadius:10, border:"none",
              background:(lf.name&&lf.lead&&lf.leadEmail)?"linear-gradient(135deg,#00C2D4,#0D1B2A)":"rgba(255,255,255,0.08)",
              color:(lf.name&&lf.lead&&lf.leadEmail)?"#fff":"#475569",
              fontWeight:800, fontSize:14,
              cursor:(lf.name&&lf.lead&&lf.leadEmail)?"pointer":"not-allowed",
              transition:"all 0.2s" }}>
            Submit for Approval →
          </button>
        </div>
      </div>
    );
  };

  // ── APPROVALS VIEW ────────────────────────────────────────────────────────
  const ApprovalsView = () => {
    const waiting = pending.filter(p=>p.approvalStatus==="Pending");
    const done    = pending.filter(p=>p.approvalStatus!=="Pending");
    return (
      <div key={animKey} style={{ animation:"fadeIn 0.4s ease" }}>
        <div style={{ fontSize:18, fontWeight:900, color:"#F1F5F9", marginBottom:4 }}>✅ Project Approvals</div>
        <div style={{ fontSize:11, color:"#64748B", marginBottom:20 }}>
          Review submitted projects and approve or reject them
        </div>

        {waiting.length===0 && (
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:14, padding:40, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📭</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#94A3B8" }}>No pending submissions</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>All caught up!</div>
          </div>
        )}

        {waiting.length>0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#F59E0B",
              textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>
              ⏳ Pending ({waiting.length})
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {waiting.map(p=>{
                const dept=(sheetData||STATIC_DATA).departments.find(d=>d.id===p.dept)||{color:"#64748B",icon:"📁",name:"Unknown"};
                return (
                  <div key={p.id} style={{ background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:14 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:16 }}>{dept.icon}</span>
                          <span style={{ fontSize:14, fontWeight:800, color:"#F1F5F9" }}>{p.name}</span>
                          <span style={{ background:`rgba(239,68,68,0.15)`, color:"#EF4444",
                            border:"1px solid rgba(239,68,68,0.3)", borderRadius:99,
                            padding:"2px 8px", fontSize:9, fontWeight:700 }}>{p.priority}</span>
                        </div>
                        <div style={{ fontSize:11, color:"#64748B" }}>
                          👤 {p.lead} · {p.leadEmail}
                        </div>
                        <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>
                          {dept.icon} {dept.name} · {p.startDate||p.startQ||''} → {p.endDate||p.endQ||''}
                        </div>
                        {p.note&&<div style={{ fontSize:11, color:"#94A3B8", marginTop:6, fontStyle:"italic" }}>"{p.note}"</div>}
                        {p.kpis?.length>0&&(
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:8 }}>
                            {p.kpis.map(k=>(
                              <span key={k} style={{ background:"rgba(0,194,212,0.12)", color:"#00C2D4",
                                border:"1px solid rgba(0,194,212,0.25)", borderRadius:99,
                                padding:"1px 7px", fontSize:9, fontWeight:700 }}>{k}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize:9, color:"#475569", marginTop:6 }}>Submitted: {p.submittedAt}</div>
                      </div>
                      <span style={{ background:"rgba(245,158,11,0.12)", color:"#F59E0B",
                        border:"1px solid rgba(245,158,11,0.3)", borderRadius:99,
                        padding:"4px 12px", fontSize:11, fontWeight:700 }}>⏳ Pending</span>
                    </div>
                    <input placeholder="Rejection reason (optional)..."
                      value={rejectNote[p.id]||""}
                      onChange={e=>setRejectNote(n=>({...n,[p.id]:e.target.value}))}
                      style={{ width:"100%", borderRadius:8,
                        border:"1px solid rgba(255,255,255,0.08)",
                        background:"rgba(255,255,255,0.04)", padding:"7px 11px",
                        fontSize:11, fontFamily:"inherit", color:"#E2E8F0",
                        outline:"none", marginBottom:10 }}/>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>approveProject(p.id)} style={{
                        flex:2, padding:"9px 0", borderRadius:9, border:"none",
                        background:"#10B981", color:"#fff", fontWeight:800,
                        fontSize:13, cursor:"pointer" }}>
                        ✓ Approve & Add to Dashboard
                      </button>
                      <button onClick={()=>rejectProject(p.id)} style={{
                        flex:1, padding:"9px 0", borderRadius:9,
                        border:"1px solid rgba(239,68,68,0.4)",
                        background:"rgba(239,68,68,0.1)",
                        color:"#EF4444", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {done.length>0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569",
              textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              History ({done.length})
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {done.map(p=>{
                const isApproved=p.approvalStatus==="Approved";
                const dept=(sheetData||STATIC_DATA).departments.find(d=>d.id===p.dept)||{icon:"📁",name:"Unknown"};
                return (
                  <div key={p.id} style={{ background:"rgba(255,255,255,0.03)",
                    border:"1px solid rgba(255,255,255,0.07)", borderRadius:11,
                    padding:"12px 16px", display:"flex",
                    justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{p.name}</div>
                      <div style={{ fontSize:10, color:"#64748B" }}>{dept.icon} {dept.name} · {p.lead}</div>
                      {p.rejectReason&&<div style={{ fontSize:10, color:"#EF4444", marginTop:2 }}>Reason: {p.rejectReason}</div>}
                    </div>
                    <span style={{
                      background:isApproved?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.12)",
                      color:isApproved?"#10B981":"#EF4444",
                      border:`1px solid ${isApproved?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`,
                      borderRadius:99, padding:"3px 12px", fontSize:11, fontWeight:700
                    }}>{isApproved?"✓ Approved":"✕ Rejected"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── DOCUMENTS MODAL (Google Drive link per project) ─────────────────────────
  const DocsModal = () => {
    const p = data.projects.find(x => x.id === docsModal);
    if (!docsModal || !p) return null;
    const dept = data.departments.find(d => d.id === p.dept);
    const [docs, setDocs] = useState(p.docs || []);
    const [name, setName] = useState("");
    const [url,  setUrl]  = useState("");

    const INP = {
      width:"100%", borderRadius:9,
      border:"1px solid rgba(255,255,255,0.1)",
      background:"rgba(255,255,255,0.06)",
      padding:"9px 12px", fontSize:12,
      color:"#E2E8F0", outline:"none",
      fontFamily:"inherit", boxSizing:"border-box",
    };

    function addLink() {
      if (!name || !url) return;
      const entry = { name, url, date: new Date().toLocaleDateString("en-GB") };
      const updated = [entry, ...docs];
      setDocs(updated);
      p.docs = updated;
      setName(""); setUrl("");
    }

    function removeDoc(i) {
      const updated = docs.filter((_,idx) => idx !== i);
      setDocs(updated);
      p.docs = updated;
    }

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)",
        zIndex:200, display:"flex", alignItems:"center", justifyContent:"center",
        backdropFilter:"blur(6px)", padding:16 }}>
        <div style={{ background:"#0D1B2A", borderRadius:18, padding:26,
          width:"100%", maxWidth:460, maxHeight:"80vh",
          display:"flex", flexDirection:"column",
          border:"1px solid rgba(255,255,255,0.1)",
          boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:18 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#F1F5F9" }}>📁 Documents</div>
              <div style={{ fontSize:10, color:"#64748B", marginTop:2 }}>
                {dept?.icon} {p.name}
              </div>
            </div>
            <button onClick={()=>setDocsModal(null)} style={{ background:"none",
              border:"none", color:"#64748B", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>

          {/* Add link form */}
          <div style={{ background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:12, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#64748B",
              textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>
              Add Google Drive Link
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <input style={INP} placeholder="Document name (e.g. Project Brief)"
                value={name} onChange={e=>setName(e.target.value)}/>
              <input style={INP} placeholder="Google Drive URL"
                value={url} onChange={e=>setUrl(e.target.value)}/>
              <button onClick={addLink} disabled={!name||!url} style={{
                padding:"9px 0", borderRadius:9, border:"none",
                background:(name&&url)?"#F59E0B":"rgba(255,255,255,0.06)",
                color:(name&&url)?"#0D1B2A":"#475569",
                fontWeight:800, fontSize:13,
                cursor:(name&&url)?"pointer":"not-allowed",
                transition:"all 0.2s",
              }}>+ Add Link</button>
            </div>
          </div>

          {/* Docs list */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {docs.length === 0 ? (
              <div style={{ textAlign:"center", padding:28, color:"#475569" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>📭</div>
                <div style={{ fontSize:12 }}>No documents linked yet</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {docs.map((doc,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                    background:"rgba(255,255,255,0.04)", borderRadius:10,
                    padding:"10px 12px",
                    border:"1px solid rgba(255,255,255,0.07)" }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>📄</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#F1F5F9",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{doc.date}</div>
                    </div>
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <a href={doc.url} target="_blank" rel="noreferrer"
                        style={{ background:"rgba(0,194,212,0.15)", color:"#00C2D4",
                          border:"1px solid rgba(0,194,212,0.2)", borderRadius:6,
                          padding:"4px 10px", fontSize:9, fontWeight:700,
                          textDecoration:"none" }}>🔗 Open</a>
                      <button onClick={()=>removeDoc(i)} style={{
                        background:"rgba(239,68,68,0.1)", color:"#EF4444",
                        border:"1px solid rgba(239,68,68,0.2)",
                        borderRadius:6, padding:"4px 8px",
                        fontSize:9, cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  // ── ALERT EMAIL MODAL ────────────────────────────────────────────────────
  const AlertModal = () => {
    if (!alertModalProj) return null;
    const p = alertModalProj;
    const days = daysRemaining(p.endDate);
    const alert = getAlertStatus(p);
    const alertC = ALERT_CFG[alert];
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
        zIndex:200, display:"flex", alignItems:"center", justifyContent:"center",
        backdropFilter:"blur(6px)", padding:16 }}>
        <div style={{ background:"#0D1B2A", borderRadius:18, padding:28,
          maxWidth:460, width:"100%",
          border:"1px solid rgba(239,68,68,0.3)",
          boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:18 }}>
            <div style={{ fontSize:16, fontWeight:900, color:"#F1F5F9" }}>📧 Alert Email Preview</div>
            <button onClick={()=>setAlertModal(null)} style={{ background:"none",
              border:"none", color:"#64748B", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10,
            padding:16, marginBottom:16, border:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize:11, color:"#64748B", marginBottom:3 }}>To:</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#00C2D4" }}>{p.email}</div>
            <div style={{ fontSize:11, color:"#64748B", marginTop:10, marginBottom:3 }}>Subject:</div>
            <div style={{ fontSize:12, fontWeight:600, color:"#F1F5F9" }}>
              Action Required: {p.name} — {alertC.label.replace(/[🔴🟡⚠✅🟢]/g,"").trim()}
            </div>
            <div style={{ fontSize:11, color:"#64748B", marginTop:10, marginBottom:3 }}>Message:</div>
            <div style={{ fontSize:11, color:"#94A3B8", lineHeight:1.6 }}>
              Dear {p.lead},<br/><br/>
              Your project <strong style={{color:"#F1F5F9"}}>{p.name}</strong> requires immediate attention.<br/><br/>
              Status: <span style={{color:alertC.color,fontWeight:700}}>{alertC.label}</span><br/>
              End Date: {p.endDate}<br/>
              Days {days < 0 ? `overdue: ${Math.abs(days)}` : `remaining: ${days}`}<br/>
              Current Progress: {p.progress}%<br/><br/>
              Please update your progress report and address any blockers immediately.
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{
              setApprToast({type:"approved", name:`Alert sent to ${p.lead}`, email:p.email});
              setTimeout(()=>setApprToast(null),3500);
              // Log alert to sheet
              const _days = daysRemaining(p.endDate);
              const _ast  = getAlertStatus(p);
              const _payload = { projectId:p.id, projectName:p.name, lead:p.lead, email:p.email,
                endDate:p.endDate, daysLeft:_days, alertStatus:ALERT_CFG[_ast]?.label||_ast,
                action:_days<0?'Immediate escalation required':'Alert sent from dashboard',
                sentBy:currentUser?.name||'Executive' };
              fetch(`${APPS_SCRIPT_URL}?func=logAlert&data=${encodeURIComponent(JSON.stringify(_payload))}`).catch(()=>{});
              setAlertModal(null);
            }} style={{ flex:2, padding:"11px 0", borderRadius:10, border:"none",
              background:"#EF4444", color:"#fff", fontWeight:800,
              fontSize:13, cursor:"pointer" }}>
              📧 Send Alert Email
            </button>
            <button onClick={()=>setAlertModal(null)} style={{ flex:1, padding:"11px 0",
              borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
              background:"transparent", color:"#64748B",
              fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  // ── ALERT BANNER (top of executive view) ──────────────────────────────────
  const AlertBanner = () => {
    if (alertProjects.length === 0) return null;
    return (
      <div style={{ marginBottom:22, animation:"fadeIn 0.4s ease" }}>

        {/* Header strip */}
        <div style={{
          background:"linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.06))",
          border:"1px solid rgba(239,68,68,0.3)", borderRadius:"14px 14px 0 0",
          padding:"12px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:8,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:8, flexShrink:0,
              background:"rgba(239,68,68,0.2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16,
              animation:"pulse 1.8s infinite",
            }}>🚨</div>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:"#EF4444", lineHeight:1 }}>
                {alertProjects.length} Project{alertProjects.length>1?"s":""} Need Attention
              </div>
              <div style={{ fontSize:10, color:"#94A3B8", marginTop:2 }}>
                Overdue or at risk of missing deadline — immediate action required
              </div>
            </div>
          </div>
          <button onClick={()=>navigate("projects")} style={{
            background:"#EF4444", color:"#fff", border:"none",
            borderRadius:8, padding:"7px 16px", fontSize:11,
            fontWeight:700, cursor:"pointer",
          }}>View All Projects →</button>
        </div>

        {/* Alert project cards */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))",
          gap:0,
          border:"1px solid rgba(239,68,68,0.2)",
          borderTop:"none",
          borderRadius:"0 0 14px 14px",
          overflow:"hidden",
        }}>
          {alertProjects.map((p, i) => {
            const dept  = data.departments.find(d => d.id === p.dept);
            const days  = daysRemaining(p.endDate);
            const alert = getAlertStatus(p);
            const ac    = ALERT_CFG[alert];
            const priC  = { Critical:"#EF4444", High:"#F59E0B", Medium:"#00C2D4", Low:"#10B981" }[p.priority]||"#64748B";
            const linkedKPIs = data.kpis.filter(k => p.kpis.includes(k.id));
            return (
              <div key={p.id} style={{
                background: i%2===0 ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.03)",
                borderRight: i%2===0 ? "1px solid rgba(239,68,68,0.12)" : "none",
                padding:"16px 18px",
                cursor:"pointer",
                transition:"background 0.2s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.1)"}
              onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"rgba(239,68,68,0.05)":"rgba(239,68,68,0.03)"}
              onClick={()=>navigate("projects")}>

                {/* Top row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13 }}>{dept?.icon}</span>
                      <span style={{ fontSize:9, color:dept?.color, fontWeight:700 }}>{p.id}</span>
                      <span style={{
                        background:`${priC}20`, color:priC,
                        border:`1px solid ${priC}30`, borderRadius:99,
                        padding:"1px 6px", fontSize:8, fontWeight:700,
                      }}>{p.priority}</span>
                    </div>
                    <div style={{ fontSize:12, fontWeight:800, color:"#F1F5F9", lineHeight:1.3 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"#64748B", marginTop:2 }}>
                      👤 {p.lead}
                      {p.email && <span style={{ color:"#00C2D4", marginLeft:5 }}>· {p.email}</span>}
                    </div>
                  </div>
                  <div style={{
                    background:ac.bg, color:ac.color,
                    border:`1px solid ${ac.color}40`,
                    borderRadius:99, padding:"3px 9px",
                    fontSize:10, fontWeight:800, whiteSpace:"nowrap", flexShrink:0,
                  }}>{ac.label}</div>
                </div>

                {/* Date + days */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:10, color:"#64748B" }}>📅 {p.startDate} → {p.endDate}</span>
                  <span style={{
                    fontWeight:800, fontSize:11,
                    color: days < 0 ? "#EF4444" : "#F59E0B",
                    background: days < 0 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                    border: `1px solid ${days<0?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.3)"}`,
                    borderRadius:99, padding:"1px 8px",
                  }}>
                    {days < 0 ? `⚠ ${Math.abs(days)}d overdue` : `${days}d left`}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#64748B", marginBottom:3 }}>
                    <span>Progress</span>
                    <span style={{ fontWeight:700, color:ac.color }}>{p.progress}%</span>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:99, height:6, overflow:"hidden" }}>
                    <div style={{
                      width:`${p.progress}%`, height:"100%",
                      background:`linear-gradient(90deg,${ac.color}80,${ac.color})`,
                      borderRadius:99, transition:"width 1s ease",
                    }}/>
                  </div>
                </div>

                {/* KPIs */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                  {linkedKPIs.slice(0,3).map(k=>(
                    <span key={k.id} style={{
                      background:"rgba(0,194,212,0.1)", color:"#00C2D4",
                      border:"1px solid rgba(0,194,212,0.2)",
                      borderRadius:99, padding:"1px 7px", fontSize:8, fontWeight:700,
                    }}>{k.name}</span>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:6 }}>
                  {currentUser?.role==="executive" && (
                    <button onClick={e=>{e.stopPropagation();setAlertModal(p);}} style={{
                      flex:1, padding:"7px 0", borderRadius:8, border:"none",
                      background:"#EF4444", color:"#fff",
                      fontWeight:700, fontSize:10, cursor:"pointer",
                    }}>📧 Send Alert</button>
                  )}
                  {p.trello && (
                    <a href={p.trello} target="_blank" rel="noreferrer"
                      onClick={e=>e.stopPropagation()}
                      style={{
                        padding:"7px 12px", borderRadius:8,
                        background:"rgba(0,82,204,0.2)", color:"#60A5FA",
                        fontWeight:700, fontSize:10, textDecoration:"none",
                        display:"flex", alignItems:"center",
                      }}>🔗</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── ALERTS PAGE ──────────────────────────────────────────────────────────
  const AlertsPage = () => {
    const allAlerts = data.projects
      .map(p => ({ ...p, alert: getAlertStatus(p), days: daysRemaining(p.endDate) }))
      .filter(p => p.alert !== "done" && p.alert !== "ontrack")
      .sort((a,b) => a.days - b.days);

    const grouped = {
      overdue: allAlerts.filter(p=>p.alert==="overdue"),
      atrisk:  allAlerts.filter(p=>p.alert==="atrisk"),
      watch:   allAlerts.filter(p=>p.alert==="watch"),
    };

    return (
      <div key={animKey} style={{ animation:"fadeIn 0.4s ease" }}>
        {/* Page header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:900, color:"#F1F5F9", marginBottom:4 }}>
            🚨 Alerts & At-Risk Projects
          </div>
          <div style={{ fontSize:12, color:"#64748B" }}>
            {allAlerts.length} project{allAlerts.length!==1?"s":""} require attention ·
            Send email alerts directly from this page
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {[
            { label:"🔴 Overdue",  count:grouped.overdue.length, color:"#EF4444", bg:"rgba(239,68,68,0.12)"  },
            { label:"🟡 At Risk",  count:grouped.atrisk.length,  color:"#F59E0B", bg:"rgba(245,158,11,0.12)" },
            { label:"⚠ Watch",    count:grouped.watch.length,   color:"#F97316", bg:"rgba(249,115,22,0.12)" },
          ].map(s=>(
            <div key={s.label} style={{
              background:s.bg, border:`1px solid ${s.color}30`,
              borderRadius:12, padding:"10px 18px", textAlign:"center",
            }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.count}</div>
              <div style={{ fontSize:10, color:s.color, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex:1 }}/>
          {currentUser?.role==="executive" && (
            <button onClick={()=>{
              alertProjects.forEach(p=>setAlertModal(p));
              if(alertProjects[0]) setAlertModal(alertProjects[0]);
            }} style={{
              background:"#EF4444", color:"#fff", border:"none",
              borderRadius:10, padding:"10px 20px",
              fontWeight:800, fontSize:12, cursor:"pointer",
              alignSelf:"center",
            }}>📧 Send All Alerts</button>
          )}
        </div>

        {/* Grouped sections */}
        {[
          { key:"overdue", label:"🔴 Overdue Projects", color:"#EF4444" },
          { key:"atrisk",  label:"🟡 At Risk (< 14 days & < 80% progress)", color:"#F59E0B" },
          { key:"watch",   label:"⚠ Watch (< 30 days & < 50% progress)",    color:"#F97316" },
        ].map(section => {
          const projs = grouped[section.key];
          if (projs.length === 0) return null;
          return (
            <div key={section.key} style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:800, color:section.color,
                textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>
                {section.label} ({projs.length})
              </div>
              {/* Table-style list */}
              <div style={{
                background:"rgba(255,255,255,0.04)",
                border:`1px solid ${section.color}20`,
                borderRadius:14, overflow:"hidden",
              }}>
                {/* Table header */}
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"100px 1fr 140px 120px 90px 90px 140px",
                  padding:"8px 16px",
                  background:"rgba(255,255,255,0.03)",
                  borderBottom:`1px solid rgba(255,255,255,0.06)`,
                  gap:8,
                }}>
                  {["ID","Project / Lead","End Date","Days","Progress","KPIs","Action"].map(h=>(
                    <div key={h} style={{ fontSize:9, fontWeight:700, color:"#475569",
                      textTransform:"uppercase", letterSpacing:0.8 }}>{h}</div>
                  ))}
                </div>
                {projs.map((p,i)=>{
                  const dept = data.departments.find(d=>d.id===p.dept);
                  const ac   = ALERT_CFG[p.alert];
                  const linkedKPIs = data.kpis.filter(k=>p.kpis.includes(k.id));
                  return (
                    <div key={p.id} style={{
                      display:"grid",
                      gridTemplateColumns:"100px 1fr 140px 120px 90px 90px 140px",
                      padding:"12px 16px", gap:8,
                      background: i%2===0 ? "transparent" : "rgba(255,255,255,0.02)",
                      borderBottom: i<projs.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      alignItems:"center",
                      cursor:"pointer",
                      transition:"background 0.15s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.02)"}
                    onClick={()=>navigate("projects")}>

                      {/* ID */}
                      <div style={{ fontSize:10, fontWeight:800, color:dept?.color }}>{p.id}</div>

                      {/* Name + lead */}
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#F1F5F9", marginBottom:2 }}>{p.name}</div>
                        <div style={{ fontSize:9, color:"#64748B" }}>
                          {dept?.icon} {dept?.name} · 👤 {p.lead}
                          {p.email && <span style={{ color:"#00C2D4", marginLeft:4 }}>· {p.email}</span>}
                        </div>
                      </div>

                      {/* End date */}
                      <div style={{ fontSize:10, color:"#94A3B8" }}>{p.endDate}</div>

                      {/* Days */}
                      <div style={{
                        fontWeight:800, fontSize:11, color:ac.color,
                        background:ac.bg, borderRadius:99,
                        padding:"2px 10px", textAlign:"center", width:"fit-content",
                      }}>
                        {p.days < 0 ? `${Math.abs(p.days)}d over` : `${p.days}d left`}
                      </div>

                      {/* Progress */}
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:ac.color, marginBottom:2 }}>{p.progress}%</div>
                        <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:99, height:4, overflow:"hidden", width:70 }}>
                          <div style={{ width:`${p.progress}%`, height:"100%",
                            background:ac.color, borderRadius:99 }}/>
                        </div>
                      </div>

                      {/* KPIs */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:2 }}>
                        {linkedKPIs.slice(0,2).map(k=>(
                          <span key={k.id} style={{
                            background:"rgba(0,194,212,0.1)", color:"#00C2D4",
                            border:"1px solid rgba(0,194,212,0.2)",
                            borderRadius:99, padding:"1px 5px", fontSize:8, fontWeight:700,
                          }}>{k.name}</span>
                        ))}
                      </div>

                      {/* Action */}
                      {currentUser?.role==="executive"
                        ? <button onClick={e=>{e.stopPropagation();setAlertModal(p);}} style={{
                            background:"#EF4444", color:"#fff", border:"none",
                            borderRadius:7, padding:"5px 12px",
                            fontWeight:700, fontSize:10, cursor:"pointer",
                            width:"100%",
                          }}>📧 Send Alert</button>
                        : <span style={{ fontSize:9, color:"#334155", textAlign:"center",
                            display:"block" }}>—</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {allAlerts.length === 0 && (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#94A3B8" }}>All projects on track!</div>
            <div style={{ fontSize:12, color:"#475569", marginTop:4 }}>No alerts at this time.</div>
          </div>
        )}
      </div>
    );
  };

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────
  const LoginScreen = () => {
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading,  setLoading]  = useState(false);

    function handleLogin() {
      if (!email || !password) return;
      setLoading(true);
      setTimeout(() => {
        login(email, password);
        setLoading(false);
      }, 500);
    }

    const INP = {
      width:"100%", borderRadius:10,
      border:"1px solid rgba(255,255,255,0.12)",
      background:"rgba(255,255,255,0.07)",
      padding:"11px 14px", fontSize:13,
      color:"#E2E8F0", outline:"none",
      fontFamily:"inherit", boxSizing:"border-box",
    };

    return (
      <div style={{
        minHeight:"100vh", background:"#060E1A",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'DM Sans',system-ui,sans-serif",
        position:"relative", overflow:"hidden",
      }}>
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=Nunito:ital,wght@1,900&display=swap');
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
        * { box-sizing: border-box; }
        button, input, textarea, select { font-family: inherit; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
      `}</style>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(ellipse 70% 50% at 20% 10%, rgba(0,194,212,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 80% 85%, rgba(124,58,237,0.08) 0%, transparent 55%)" }}/>

        <div style={{ width:"100%", maxWidth:420, padding:"0 20px", zIndex:1, animation:"fadeIn 0.5s ease" }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ marginBottom:8 }}>
              <span style={{ fontFamily:"'Nunito','DM Sans',sans-serif", fontWeight:900, fontStyle:"italic",
                color:"#00C2D4", fontSize:58, lineHeight:1 }}>ninja</span>
              <span style={{ fontFamily:"'Nunito','DM Sans',sans-serif", fontWeight:900, fontStyle:"italic",
                color:"rgba(255,255,255,0.18)", fontSize:58, lineHeight:1, marginLeft:10 }}>ops</span>
            </div>
            <div style={{ fontSize:10, color:"#334155", marginTop:4, letterSpacing:3, textTransform:"uppercase" }}>Operations Command Center</div>
          </div>

          {/* Card */}
          <div style={{
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:20, padding:32,
            backdropFilter:"blur(20px)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontSize:17, fontWeight:800, color:"#F1F5F9", marginBottom:5 }}>Sign in</div>
            <div style={{ fontSize:11, color:"#64748B", marginBottom:24 }}>
              Enter your credentials to access the dashboard
            </div>

            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#64748B",
                marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>Email</div>
              <input
                type="text" value={email}
                onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="your@email.com"
                style={INP}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#64748B",
                marginBottom:6, textTransform:"uppercase", letterSpacing:0.8 }}>Password</div>
              <div style={{ position:"relative" }}>
                <input
                  type={showPass?"text":"password"} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                  placeholder="••••••••"
                  style={{...INP, paddingRight:44}}
                />
                <button onClick={()=>setShowPass(s=>!s)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", color:"#64748B",
                    cursor:"pointer", fontSize:16, padding:0 }}>
                  {showPass?"🙈":"👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {loginError && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
                borderRadius:8, padding:"9px 12px", marginBottom:16,
                fontSize:11, color:"#EF4444", fontWeight:600 }}>
                ⚠ {loginError}
              </div>
            )}

            {/* Sign in button */}
            <button onClick={handleLogin} disabled={loading||!email||!password}
              style={{
                width:"100%", padding:"13px 0", borderRadius:11, border:"none",
                background:(email&&password)?"linear-gradient(135deg,#00C2D4,#0891B2)":"rgba(255,255,255,0.08)",
                color:(email&&password)?"#fff":"#475569",
                fontWeight:800, fontSize:14, cursor:(email&&password&&!loading)?"pointer":"not-allowed",
                transition:"all 0.2s", boxShadow:(email&&password)?"0 4px 20px rgba(0,194,212,0.3)":"none",
                fontFamily:"inherit",
              }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>

            {/* Quick login hints */}
            <div style={{ marginTop:20, padding:"12px 14px",
              background:"rgba(255,255,255,0.03)", borderRadius:10,
              border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:9, color:"#475569", marginBottom:6,
                textTransform:"uppercase", letterSpacing:0.8, fontWeight:700 }}>
                Demo Accounts
              </div>
              {USERS.slice(0,3).map(u=>(
                <div key={u.id} onClick={()=>{ setEmail(u.email); setPassword(u.password); }}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0",
                    cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                    background:`${u.color}25`, border:`1px solid ${u.color}40`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:8, fontWeight:800, color:u.color }}>
                    {u.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:"#94A3B8", fontWeight:600 }}>{u.name}</div>
                    <div style={{ fontSize:9, color:"#475569" }}>{u.role === "executive" ? "Executive" : "Manager"} · {u.email}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:9, color:"#334155", marginTop:5, textAlign:"center" }}>
                Click any account to auto-fill
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (!currentUser) return <LoginScreen />;

  if (sheetLoading && data.projects.length === 0) return (
    <div style={{ minHeight:"100vh", background:"#060E1A", display:"flex",
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16,
      fontFamily:"'DM Sans',sans-serif" }}>
      <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontStyle:"italic",
        color:"#00C2D4", fontSize:48 }}>ninja</span>
      <div style={{ color:"#475569", fontSize:13 }}>Loading projects from Google Sheet...</div>
      <div style={{ width:200, height:3, background:"rgba(255,255,255,0.07)", borderRadius:99 }}>
        <div style={{ width:"60%", height:"100%", background:"#00C2D4", borderRadius:99,
          animation:"pulse 1.5s infinite" }}/>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=Nunito:ital,wght@1,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>

      <div style={S.bg} />
      <ApprovalToast />
      <AlertModal />
      <DocsModal />
      <Sidebar />

      <div style={S.main}>
        {/* Top bar with dept filter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setFilterDept("all"); }} style={{
              padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
              background: filterDept === "all" ? "rgba(0,194,212,0.2)" : "rgba(255,255,255,0.05)",
              color: filterDept === "all" ? "#00C2D4" : "#64748B",
            }}>All Depts</button>
            {data.departments.map(d => (
              <button key={d.id} onClick={() => {
                setFilterDept(d.id);
                if(view !== "executive" && view !== "projects" && view !== "kpis") navigate("executive");
              }} style={{
                padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                background: filterDept === d.id ? `${d.color}25` : "rgba(255,255,255,0.05)",
                color: filterDept === d.id ? d.color : "#64748B",
              }}>{d.icon} {d.name.split(" ")[0]}</button>
            ))}
          </div>
        </div>

        {view === "executive"  && <ExecutiveView />}
        {view === "dept"       && <DeptView />}
        {view === "projects"   && <ProjectsView />}
        {view === "kpi-detail" && <KPIDetailView />}
        {view === "alerts"     && currentUser?.role==="executive" && <AlertsPage />}
        {view === "submit"     && <SubmitView />}
        {view === "approvals"  && currentUser?.role==="executive" && <ApprovalsView />}
      </div>
    </div>
  );
}