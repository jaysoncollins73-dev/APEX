// ============================================================
// Wound Care Visit Note App
// src/App.jsx
// React 18 — no external dependencies beyond React itself
// ============================================================

import { useState, useRef, useCallback } from "react";

const TISSUE_TYPES = ["Granulation", "Slough", "Eschar", "Epithelialization", "Necrotic", "Hypergranulation"];
const PERIWOUND = ["Intact", "Macerated", "Erythema", "Edema", "Induration", "Callus", "Fragile"];
const WOUND_TYPES = ["Pressure injury", "Diabetic foot ulcer", "Venous leg ulcer", "Arterial ulcer", "Surgical wound", "Traumatic wound", "Burn", "Skin tear", "Other"];
const EXUDATE_TYPES = ["Serous", "Serosanguineous", "Sanguineous", "Purulent", "None"];
const EXUDATE_AMOUNTS = ["None", "Scant", "Minimal", "Moderate", "Heavy"];
const EDGE_TYPES = ["Well-defined", "Irregular", "Rolled/Epibole", "Undermined", "Hyperkeratotic", "Macerated"];

// ── ICD-10 mapping by wound type + location keyword ─────────
const ICD10_MAP = {
  "Pressure injury": {
    "Sacrum":      ["L89.150","L89.151","L89.152","L89.153","L89.154"],
    "Heel":        ["L89.600","L89.601","L89.602","L89.603","L89.604"],
    "Right heel":  ["L89.610","L89.611","L89.612","L89.613","L89.614"],
    "Left heel":   ["L89.620","L89.621","L89.622","L89.623","L89.624"],
    "Buttock":     ["L89.300","L89.301","L89.302","L89.303","L89.304"],
    "default":     ["L89.90","L89.91","L89.92","L89.93","L89.94"],
  },
  "Diabetic foot ulcer": { "default": ["E11.621","E11.622"] },
  "Venous leg ulcer":    { "default": ["I87.311","I87.312","I87.313","I87.319"] },
  "Arterial ulcer":      { "default": ["I70.231","I70.232","I70.233","I70.234","I70.235"] },
  "Surgical wound":      { "default": ["T81.31XA","T81.32XA"] },
  "Traumatic wound":     { "default": ["S01.001A","S01.011A"] },
  "Burn":                { "default": ["T30.0","T30.4"] },
  "Skin tear":           { "default": ["S00.01XA","S00.811A"] },
};

const STAGE_IDX = { "Stage 1": 1, "Stage 2": 2, "Stage 3": 3, "Stage 4": 4, "Unstageable": 0 };

// ── Auto-coding helpers ──────────────────────────────────────
function getICD10(wound) {
  const typeMap = ICD10_MAP[wound.woundType];
  if (!typeMap) return [];
  const locKey =
    Object.keys(typeMap).find(k =>
      k !== "default" && wound.location?.toLowerCase().includes(k.toLowerCase())
    ) || "default";
  const codes = typeMap[locKey] || typeMap["default"] || [];
  if (wound.woundType === "Pressure injury" && wound.stage) {
    const idx = STAGE_IDX[wound.stage] ?? 0;
    return [codes[idx] || codes[0]].filter(Boolean);
  }
  return codes.slice(0, 2);
}

function getCPT(wound) {
  const codes = [];
  const area = parseFloat(wound.area) || 0;
  const hasDebridement = wound.treatment?.toLowerCase().includes("debridement");
  const hasNecrotic = wound.tissue?.some(t => ["Necrotic","Slough","Eschar"].includes(t));

  if (hasDebridement && hasNecrotic) {
    codes.push({ code: "97597", desc: "Selective debridement, first 20 sq cm", type: "Debridement" });
    if (area > 20) codes.push({ code: "97598", desc: "Selective debridement, each addl 20 sq cm", type: "Debridement" });
  }
  if (wound.woundType === "Pressure injury") {
    codes.push({ code: "97602", desc: "Non-selective debridement, per session", type: "Debridement" });
  }
  if (area > 0 && area <= 20) codes.push({ code: "97602", desc: "Wound care mgmt ≤20 sq cm", type: "Wound care" });
  else if (area > 20)          codes.push({ code: "97603", desc: "Wound care mgmt >20 sq cm",  type: "Wound care" });

  const dressingLC = wound.dressing?.toLowerCase() || "";
  if (dressingLC.includes("negative pressure") || dressingLC.includes("npwt") || dressingLC.includes("wound vac")) {
    codes.push({ code: "97607", desc: "NPWT ≤50 sq cm", type: "NPWT" });
  }
  codes.push({ code: "99213", desc: "Office visit, established, moderate complexity", type: "E&M" });
  return codes;
}

function getMDSItems(wound) {
  const items = [];
  if (wound.woundType === "Pressure injury") {
    items.push({ item: "M0100", desc: "Determination of pressure ulcer risk" });
    items.push({ item: "M0150", desc: "Risk of pressure ulcers" });
    const stageMap = { "Stage 1":"M0300A","Stage 2":"M0300B","Stage 3":"M0300C","Stage 4":"M0300D","Unstageable":"M0300E" };
    if (wound.stage && stageMap[wound.stage])
      items.push({ item: stageMap[wound.stage], desc: `Number of ${wound.stage} pressure ulcers` });
    items.push({ item: "M0800", desc: "Worsening in pressure ulcer status since prior assessment" });
  }
  if (wound.tissue?.some(t => ["Necrotic","Eschar"].includes(t)))
    items.push({ item: "M1040", desc: "Other ulcers, wounds — necrotic tissue present" });
  if (wound.woundType !== "Pressure injury")
    items.push({ item: "M1040", desc: "Other ulcers, wounds and skin problems" });
  return items;
}

function getComplianceFlags(wound, patient) {
  const flags = [];
  const e = (msg) => flags.push({ level: "error", msg });
  const w = (msg) => flags.push({ level: "warn",  msg });

  if (!wound.location)                           e("Wound location required for coding");
  if (!wound.woundType)                          e("Wound type required for ICD-10 selection");
  if (!wound.length || !wound.width)             e("Measurements required for CPT coding (97597–97603)");
  if (!wound.tissue?.length)                     w("Tissue type required for medical necessity documentation");
  if (!wound.exudate)                            w("Exudate type required for OASIS-E / MDS documentation");
  if (!wound.treatment)                          w("Treatment description required — supports medical necessity");
  if (!wound.dressing)                           w("Dressing type required for supply billing");
  if (!wound.periwound?.length)                  w("Periwound assessment supports wound chronicity documentation");
  if (wound.woundType === "Pressure injury" && !wound.stage)
                                                 e("Pressure injury stage required for ICD-10 and MDS coding");
  if (wound.woundType === "Diabetic foot ulcer" && !patient.a1c)
                                                 w("Document HbA1c — required for diabetic wound medical necessity");
  if (!wound.photos?.length)                     w("Wound photo recommended — strongest audit defense");
  if (wound.tissue?.includes("Necrotic") && !wound.treatment?.toLowerCase().includes("debridement"))
                                                 w("Necrotic tissue present — document debridement for CPT 97597/97598");
  if (!patient.name || !patient.mrn || !patient.dob)
                                                 e("Patient demographics incomplete — required for claim submission");
  return flags;
}

// ── OASIS-E items ────────────────────────────────────────────
const OASIS_ITEMS = [
  { id: "M1020", label: "Primary diagnosis",        desc: "ICD-10 for primary diagnosis at SOC/ROC" },
  { id: "M1030", label: "Therapies at home",         desc: "IV, parenteral nutrition, enteral nutrition" },
  { id: "M1200", label: "Vision",                    desc: "Ability to see in adequate light" },
  { id: "M1240", label: "Pain assessment",           desc: "Pain interfering with activity/movement" },
  { id: "M1300", label: "Pressure ulcer risk",       desc: "Use validated tool (Braden scale)" },
  { id: "M1306", label: "Unhealed pressure ulcer(s)",desc: "At least one Stage 2 or higher" },
  { id: "M1322", label: "Stage 1 pressure ulcer(s)", desc: "Count of Stage 1 pressure ulcers" },
  { id: "M1324", label: "Stage 2 pressure ulcer(s)", desc: "Count of Stage 2 pressure ulcers" },
  { id: "M1334", label: "Stasis ulcer status",       desc: "Presence and status of stasis ulcers" },
  { id: "M1340", label: "Surgical wound status",     desc: "Open surgical wound present" },
  { id: "M1342", label: "Surgical wound status detail", desc: "Status of most problematic surgical wound" },
];

// ── Initial state ────────────────────────────────────────────
const blankWound = () => ({
  id: Date.now(),
  location: "", woundType: "", stage: "",
  length: "", width: "", depth: "", area: "",
  tissue: [], exudate: "", exudateAmount: "", odor: "",
  periwound: [], edges: "", undermining: "", tunneling: "",
  painScore: "0", treatment: "", dressing: "", frequency: "",
  photos: [], notes: "",
});

const blankPatient = () => ({
  name: "", dob: "", mrn: "", npi: "", provider: "",
  date: new Date().toISOString().split("T")[0],
  visitType: "Follow-up", insurance: "", a1c: "", braden: "",
});

const blankPlan = () => ({
  hpi: "", allergies: "", medications: "",
  assessment: "", followUp: "", signature: "", modifier: "",
});

// ── Component ────────────────────────────────────────────────
export default function App() {
  const [step, setStep]               = useState("patient");
  const [patient, setPatient]         = useState(blankPatient());
  const [wounds, setWounds]           = useState([blankWound()]);
  const [activeWound, setActiveWound] = useState(0);
  const [plan, setPlan]               = useState(blankPlan());
  const [oasisValues, setOasisValues] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measuredDims, setMeasuredDims]   = useState(null);
  const [scale, setScale]             = useState("");
  const [submitted, setSubmitted]     = useState(false);
  const fileRef = useRef(null);
  const imgRef  = useRef(null);

  // ── State helpers ──────────────────────────────────────────
  const updatePatient = (k, v) => setPatient(p => ({ ...p, [k]: v }));
  const updatePlan    = (k, v) => setPlan(p => ({ ...p, [k]: v }));

  const updateWound = (idx, k, v) =>
    setWounds(ws => ws.map((w, i) => {
      if (i !== idx) return w;
      const updated = { ...w, [k]: v };
      if (k === "length" || k === "width") {
        const l  = parseFloat(k === "length" ? v : updated.length) || 0;
        const ww = parseFloat(k === "width"  ? v : updated.width)  || 0;
        updated.area = (l * ww).toFixed(2);
      }
      return updated;
    }));

  const toggleArray = (idx, key, val) =>
    setWounds(ws => ws.map((w, i) =>
      i !== idx ? w
        : { ...w, [key]: w[key].includes(val) ? w[key].filter(x => x !== val) : [...w[key], val] }
    ));

  const addWound = () => {
    setWounds(ws => [...ws, blankWound()]);
    setActiveWound(wounds.length);
  };

  const resetAll = () => {
    setStep("patient"); setPatient(blankPatient()); setWounds([blankWound()]);
    setActiveWound(0); setPlan(blankPlan()); setOasisValues({});
    setPreviewPhoto(null); setMeasureMode(false); setMeasurePoints([]);
    setMeasuredDims(null); setScale(""); setSubmitted(false);
  };

  // ── Photo handling ─────────────────────────────────────────
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      setMeasurePoints([]); setMeasuredDims(null); setPreviewPhoto(src);
      updateWound(activeWound, "photos",
        [...wounds[activeWound].photos, { src, dims: null, timestamp: new Date().toLocaleString() }]
      );
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = useCallback((e) => {
    if (!measureMode) return;
    const rect = e.target.getBoundingClientRect();
    const pts  = [...measurePoints, { x: e.clientX - rect.left, y: e.clientY - rect.top }];
    setMeasurePoints(pts);
    if (pts.length === 2) {
      const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
      const px = Math.sqrt(dx * dx + dy * dy);
      const sf = scale ? parseFloat(scale) : 1;
      const cm = (px / 50 * sf).toFixed(1);
      setMeasuredDims({ px: px.toFixed(0), cm });
      setMeasurePoints([]);
    }
  }, [measureMode, measurePoints, scale]);

  // ── Derived ────────────────────────────────────────────────
  const w        = wounds[activeWound] || wounds[0];
  const allFlags = wounds.flatMap((wnd, i) =>
    getComplianceFlags(wnd, patient).map(f => ({ ...f, wound: i + 1 }))
  );
  const errors   = allFlags.filter(f => f.level === "error");
  const warnings = allFlags.filter(f => f.level === "warn");

  // ── Micro-components ───────────────────────────────────────
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{ fontWeight: 500, fontSize: 13, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{title}</p>
      {children}
    </div>
  );

  const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
    <div style={{ marginBottom: 10 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box" }} />
    </div>
  );

  const Select = ({ label, value, onChange, options }) => (
    <div style={{ marginBottom: 10 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const Textarea = ({ label, value, onChange, rows = 3, placeholder = "" }) => (
    <div style={{ marginBottom: 10 }}>
      {label && <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: "8px 10px",
          border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-primary)", color: "var(--color-text-primary)",
          fontSize: 14, fontFamily: "inherit" }} />
    </div>
  );

  const Chips = ({ options, selected, onToggle }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {options.map(o => (
        <button key={o} onClick={() => onToggle(o)}
          style={{ padding: "4px 10px", fontSize: 13, borderRadius: 20, border: "0.5px solid", cursor: "pointer",
            background:   selected.includes(o) ? "var(--color-background-info)" : "var(--color-background-secondary)",
            color:        selected.includes(o) ? "var(--color-text-info)"       : "var(--color-text-primary)",
            borderColor:  selected.includes(o) ? "var(--color-border-info)"     : "var(--color-border-secondary)" }}>
          {o}
        </button>
      ))}
    </div>
  );

  const WoundTabs = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
      {wounds.map((_, i) => (
        <button key={i} onClick={() => setActiveWound(i)}
          style={{ padding: "4px 12px", fontSize: 13, borderRadius: 20, border: "0.5px solid", cursor: "pointer",
            background:  activeWound === i ? "var(--color-background-info)" : "var(--color-background-secondary)",
            color:       activeWound === i ? "var(--color-text-info)"       : "var(--color-text-primary)",
            borderColor: activeWound === i ? "var(--color-border-info)"     : "var(--color-border-secondary)" }}>
          Wound {i + 1}
        </button>
      ))}
      <button onClick={addWound} style={{ fontSize: 13, padding: "4px 10px" }}>+ Add wound</button>
    </div>
  );

  const Card = ({ children }) => (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
      {children}
    </div>
  );

  const NavRow = () => {
    const nav = ["patient","wound","photos","coding","oasis","plan","review"];
    const labels = { patient:"Patient", wound:"Wound", photos:"Photos", coding:"Coding", oasis:"OASIS", plan:"Plan", review:"Review" };
    return (
      <div style={{ display: "flex", gap: 3, marginBottom: "1.5rem", background: "var(--color-background-secondary)", padding: 4, borderRadius: "var(--border-radius-lg)", overflowX: "auto" }}>
        {nav.map(s => (
          <button key={s} onClick={() => setStep(s)}
            style={{ flex: "0 0 auto", padding: "6px 10px", fontSize: 11, borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer",
              background: step === s ? "var(--color-background-primary)" : "transparent",
              color:      step === s ? "var(--color-text-primary)"       : "var(--color-text-secondary)",
              fontWeight: step === s ? 500 : 400,
              boxShadow:  step === s ? "0 0 0 0.5px var(--color-border-secondary)" : "none" }}>
            {labels[s]}
          </button>
        ))}
      </div>
    );
  };

  // ── Submitted screen ───────────────────────────────────────
  if (submitted) return (
    <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-background-success)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 28, color: "var(--color-text-success)" }}>✓</div>
      <h2 style={{ fontWeight: 500, marginBottom: 8 }}>Note submitted</h2>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
        Wound care visit note for <strong>{patient.name}</strong> has been saved and sent to billing.
      </p>
      <button onClick={resetAll}>Start new note</button>
    </div>
  );

  // ── Main render ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 680, margin: "0 auto", padding: "1rem 0" }}>
      <h2 aria-hidden style={{ fontWeight: 500, fontSize: 20, margin: "0 0 2px" }}>Wound Care Visit Note</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>Medicare/Medicaid compliant documentation</p>
        <div style={{ display: "flex", gap: 6 }}>
          {errors.length > 0 && (
            <span style={{ padding: "4px 10px", fontSize: 12, borderRadius: 20, background: "var(--color-background-danger)", color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger)" }}>
              {errors.length} error{errors.length > 1 ? "s" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span style={{ padding: "4px 10px", fontSize: 12, borderRadius: 20, background: "var(--color-background-warning)", color: "var(--color-text-warning)", border: "0.5px solid var(--color-border-warning)" }}>
              {warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <NavRow />

      {/* ── PATIENT ── */}
      {step === "patient" && (
        <Card>
          <Section title="Patient information">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Patient name *"  value={patient.name}     onChange={v => updatePatient("name", v)}     placeholder="Full name" />
              <Input label="Date of birth *" value={patient.dob}      onChange={v => updatePatient("dob", v)}      type="date" />
              <Input label="MRN *"           value={patient.mrn}      onChange={v => updatePatient("mrn", v)}      placeholder="Medical record #" />
              <Input label="Visit date"      value={patient.date}     onChange={v => updatePatient("date", v)}     type="date" />
              <Input label="Provider name *" value={patient.provider} onChange={v => updatePatient("provider", v)} placeholder="Clinician name" />
              <Input label="Provider NPI *"  value={patient.npi}      onChange={v => updatePatient("npi", v)}      placeholder="10-digit NPI" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Select label="Visit type" value={patient.visitType} onChange={v => updatePatient("visitType", v)} options={["Initial","Follow-up","Consult","Urgent"]} />
              <Select label="Primary insurance" value={patient.insurance} onChange={v => updatePatient("insurance", v)} options={["Medicare Part A","Medicare Part B","Medicaid","Medicare Advantage","Commercial","Self-pay"]} />
            </div>
          </Section>
          <Section title="Clinical indicators (for coding)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Most recent HbA1c (%)" value={patient.a1c}    onChange={v => updatePatient("a1c", v)}    type="number" placeholder="e.g. 8.2" />
              <Input label="Braden Scale score"     value={patient.braden} onChange={v => updatePatient("braden", v)} type="number" placeholder="6–23" />
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "-4px 0 0" }}>Braden ≤18 = at-risk; required for Medicare pressure injury documentation.</p>
          </Section>
          <div style={{ textAlign: "right" }}>
            <button onClick={() => setStep("wound")}>Next: Wound assessment →</button>
          </div>
        </Card>
      )}

      {/* ── WOUND ── */}
      {step === "wound" && (
        <Card>
          <WoundTabs />
          <Section title="Wound identification">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Wound location / anatomical site *" value={w.location} onChange={v => updateWound(activeWound, "location", v)} placeholder="e.g. Right heel, sacrum" />
              <Select label="Wound type *" value={w.woundType} onChange={v => updateWound(activeWound, "woundType", v)} options={WOUND_TYPES} />
            </div>
            {w.woundType === "Pressure injury" && (
              <Select label="Pressure injury stage *" value={w.stage} onChange={v => updateWound(activeWound, "stage", v)}
                options={["Stage 1","Stage 2","Stage 3","Stage 4","Unstageable","Deep tissue injury (DTI)"]} />
            )}
          </Section>
          <Section title="Measurements (cm) *">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <Input label="Length" value={w.length} onChange={v => updateWound(activeWound, "length", v)} type="number" placeholder="0.0" />
              <Input label="Width"  value={w.width}  onChange={v => updateWound(activeWound, "width", v)}  type="number" placeholder="0.0" />
              <Input label="Depth"  value={w.depth}  onChange={v => updateWound(activeWound, "depth", v)}  type="number" placeholder="0.0" />
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>Area (cm²)</label>
                <div style={{ padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", fontSize: 14 }}>{w.area || "—"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Undermining (clock & cm)" value={w.undermining} onChange={v => updateWound(activeWound, "undermining", v)} placeholder="e.g. 3 o'clock, 2 cm" />
              <Input label="Tunneling (clock & cm)"   value={w.tunneling}   onChange={v => updateWound(activeWound, "tunneling", v)}   placeholder="e.g. 12 o'clock, 1.5 cm" />
            </div>
          </Section>
          <Section title="Wound bed *">
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>Tissue type (select all that apply)</label>
            <Chips options={TISSUE_TYPES} selected={w.tissue} onToggle={v => toggleArray(activeWound, "tissue", v)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
              <Select label="Exudate type *"   value={w.exudate}       onChange={v => updateWound(activeWound, "exudate", v)}       options={EXUDATE_TYPES} />
              <Select label="Exudate amount *" value={w.exudateAmount} onChange={v => updateWound(activeWound, "exudateAmount", v)} options={EXUDATE_AMOUNTS} />
            </div>
            <Select label="Odor" value={w.odor} onChange={v => updateWound(activeWound, "odor", v)} options={["None","Mild","Moderate","Strong"]} />
          </Section>
          <Section title="Wound edges & periwound *">
            <Select label="Wound edges" value={w.edges} onChange={v => updateWound(activeWound, "edges", v)} options={EDGE_TYPES} />
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6, marginTop: 8 }}>Periwound skin</label>
            <Chips options={PERIWOUND} selected={w.periwound} onToggle={v => toggleArray(activeWound, "periwound", v)} />
          </Section>
          <Section title="Pain">
            <label style={{ display: "block", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8 }}>Pain score: {w.painScore}/10</label>
            <input type="range" min="0" max="10" step="1" value={w.painScore} onChange={e => updateWound(activeWound, "painScore", e.target.value)} style={{ width: "100%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-tertiary)" }}><span>No pain (0)</span><span>Worst (10)</span></div>
          </Section>
          <Section title="Treatment & dressing *">
            <Textarea label="Wound care performed *" value={w.treatment} onChange={v => updateWound(activeWound, "treatment", v)}
              placeholder="Be specific — e.g. Irrigated with 60mL NS, sharp debridement of slough with 15-blade, tissue sample sent for culture..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Dressing applied *" value={w.dressing}  onChange={v => updateWound(activeWound, "dressing", v)}  placeholder="e.g. Mepilex Border" />
              <Select label="Change frequency"  value={w.frequency} onChange={v => updateWound(activeWound, "frequency", v)} options={["Daily","Every 2 days","Every 3 days","Twice weekly","Weekly","PRN","Other"]} />
            </div>
            <Textarea label="Additional wound notes" value={w.notes} onChange={v => updateWound(activeWound, "notes", v)} rows={2} placeholder="Additional clinical observations..." />
          </Section>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep("patient")}>← Back</button>
            <button onClick={() => setStep("photos")}>Next: Photos →</button>
          </div>
        </Card>
      )}

      {/* ── PHOTOS ── */}
      {step === "photos" && (
        <Card>
          <WoundTabs />
          <div style={{ padding: "10px 14px", background: "var(--color-background-warning)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-warning)", marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-warning)", fontWeight: 500 }}>Medicare audit tip</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-warning)" }}>Photos with a calibrated ruler in frame are your strongest audit defense. Include a date-stamped ruler sticker for best results.</p>
          </div>
          <Section title="Wound photos (recommended for audit defense)">
            <div style={{ border: "1.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", padding: "2rem", textAlign: "center", marginBottom: "1rem", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 32, color: "var(--color-text-tertiary)", marginBottom: 8 }}>📷</div>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: 0 }}>Tap to take photo or upload image</p>
              <p style={{ color: "var(--color-text-tertiary)", fontSize: 12, margin: "4px 0 0" }}>Supports JPG, PNG</p>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
            </div>
            {w.photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
                {w.photos.map((ph, pi) => (
                  <div key={pi} style={{ position: "relative", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
                    <img src={ph.src} alt={`Wound ${activeWound + 1} photo ${pi + 1}`} style={{ width: "100%", display: "block", maxHeight: 180, objectFit: "cover" }} />
                    <div style={{ padding: "6px 8px", background: "var(--color-background-secondary)" }}>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{ph.timestamp}</p>
                    </div>
                    <button onClick={() => setPreviewPhoto(ph.src)} style={{ position: "absolute", top: 6, right: 6, padding: "2px 8px", fontSize: 11, borderRadius: 4 }}>Measure</button>
                  </div>
                ))}
              </div>
            )}
          </Section>
          {previewPhoto && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>Measurement tool</p>
                <button onClick={() => setMeasureMode(!measureMode)}
                  style={{ padding: "4px 10px", fontSize: 12,
                    background:  measureMode ? "var(--color-background-info)" : undefined,
                    color:       measureMode ? "var(--color-text-info)"       : undefined,
                    borderColor: measureMode ? "var(--color-border-info)"     : undefined }}>
                  {measureMode ? "Measuring — click 2 points" : "Enable measurement"}
                </button>
                <input placeholder="Scale (px/cm)" value={scale} onChange={e => setScale(e.target.value)} type="number" style={{ width: 120, fontSize: 12 }} />
                <button onClick={() => { setPreviewPhoto(null); setMeasureMode(false); setMeasurePoints([]); setMeasuredDims(null); }} style={{ fontSize: 12 }}>Close</button>
              </div>
              <div style={{ position: "relative", display: "inline-block", width: "100%", userSelect: "none" }}>
                <img ref={imgRef} src={previewPhoto} alt="Wound for measurement"
                  style={{ width: "100%", display: "block", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", cursor: measureMode ? "crosshair" : "default" }}
                  onClick={handleCanvasClick} />
                {measurePoints.map((pt, i) => (
                  <div key={i} style={{ position: "absolute", left: pt.x - 6, top: pt.y - 6, width: 12, height: 12, borderRadius: "50%", background: "#E24B4A", border: "2px solid white", pointerEvents: "none" }} />
                ))}
              </div>
              {measuredDims && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--color-background-info)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-info)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-info)" }}>
                    Measured: {measuredDims.px}px ≈ {measuredDims.cm} cm {scale ? `(at ${scale} px/cm)` : "(set scale for accuracy)"}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { updateWound(activeWound, "length", measuredDims.cm); setMeasuredDims(null); }} style={{ fontSize: 12, padding: "4px 10px" }}>Use as length</button>
                    <button onClick={() => { updateWound(activeWound, "width",  measuredDims.cm); setMeasuredDims(null); }} style={{ fontSize: 12, padding: "4px 10px" }}>Use as width</button>
                  </div>
                </div>
              )}
              {measureMode && <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>Tip: place a calibrated ruler sticker in the photo frame and enter pixels-per-cm as the scale.</p>}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep("wound")}>← Back</button>
            <button onClick={() => setStep("coding")}>Next: Coding →</button>
          </div>
        </Card>
      )}

      {/* ── CODING ── */}
      {step === "coding" && (
        <Card>
          <WoundTabs />
          <Section title="Auto-suggested ICD-10 codes">
            {getICD10(w).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {getICD10(w).map((code, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background:  i === 0 ? "var(--color-background-info)" : "var(--color-background-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    border: `0.5px solid ${i === 0 ? "var(--color-border-info)" : "var(--color-border-tertiary)"}` }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, minWidth: 80,
                      color: i === 0 ? "var(--color-text-info)" : "var(--color-text-primary)" }}>{code}</span>
                    <span style={{ fontSize: 13, color: i === 0 ? "var(--color-text-info)" : "var(--color-text-secondary)" }}>
                      {i === 0 ? "Primary diagnosis" : "Secondary / alternate"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Complete wound type and location to generate ICD-10 suggestions.
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 8 }}>Always verify with your certified coder (CPC/CCS). These are auto-suggestions based on documented data.</p>
          </Section>

          <Section title="Auto-suggested CPT codes">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getCPT(w).map((c, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500 }}>{c.code}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", marginLeft: 10 }}>{c.desc}</span>
                  </div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>{c.type}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <Select label="Modifier (if applicable)" value={plan.modifier} onChange={v => updatePlan("modifier", v)}
                options={["None","25 — Significant, separate E&M","59 — Distinct procedural service","LT — Left side","RT — Right side","TC — Technical component","26 — Professional component"]} />
            </div>
          </Section>

          <Section title="MDS 3.0 items (SNF / LTC)">
            {getMDSItems(w).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {getMDSItems(w).map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, minWidth: 64 }}>{m.item}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{m.desc}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>MDS items populate based on wound type — complete wound assessment first.</p>
            )}
          </Section>

          <Section title="Compliance checklist">
            {allFlags.length === 0 ? (
              <div style={{ padding: "12px 14px", background: "var(--color-background-success)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-success)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-success)", fontWeight: 500 }}>All required fields complete — ready for billing</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allFlags.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid",
                    background:  f.level === "error" ? "var(--color-background-danger)"  : "var(--color-background-warning)",
                    borderColor: f.level === "error" ? "var(--color-border-danger)"      : "var(--color-border-warning)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 78, color: f.level === "error" ? "var(--color-text-danger)" : "var(--color-text-warning)" }}>
                      Wound {f.wound} {f.level}
                    </span>
                    <span style={{ fontSize: 13, color: f.level === "error" ? "var(--color-text-danger)" : "var(--color-text-warning)" }}>{f.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep("photos")}>← Back</button>
            <button onClick={() => setStep("oasis")}>Next: OASIS →</button>
          </div>
        </Card>
      )}

      {/* ── OASIS ── */}
      {step === "oasis" && (
        <Card>
          <div style={{ padding: "10px 14px", background: "var(--color-background-info)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-info)", marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-info)", fontWeight: 500 }}>OASIS-E — Home health agencies</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-info)" }}>Required for Medicare home health PPS reimbursement. Complete at SOC, ROC, follow-up, and discharge. Accurate OASIS drives PDGM case-mix grouping and payment.</p>
          </div>
          <Section title="Wound-related OASIS-E items">
            {OASIS_ITEMS.map(item => (
              <div key={item.id} style={{ marginBottom: 12, padding: "10px 14px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)" }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{item.id}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 8 }}>{item.label}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px" }}>{item.desc}</p>
                <input value={oasisValues[item.id] || ""} onChange={e => setOasisValues(v => ({ ...v, [item.id]: e.target.value }))}
                  placeholder="Enter value or response..." style={{ width: "100%", boxSizing: "border-box", fontSize: 13 }} />
              </div>
            ))}
          </Section>
          <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>OASIS-E replaced OASIS-D1 in January 2023. Wound/skin is one of the highest-weighted PDGM clinical groupings — accurate documentation directly impacts reimbursement.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep("coding")}>← Back</button>
            <button onClick={() => setStep("plan")}>Next: Plan →</button>
          </div>
        </Card>
      )}

      {/* ── PLAN ── */}
      {step === "plan" && (
        <Card>
          <Section title="History of present illness">
            <Textarea label="HPI" value={plan.hpi} onChange={v => updatePlan("hpi", v)} rows={3}
              placeholder="Include: wound etiology, duration, prior treatments, relevant PMH, risk factors (diabetes, vascular disease, immobility)..." />
          </Section>
          <Section title="Medications & allergies">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Textarea label="Relevant medications" value={plan.medications} onChange={v => updatePlan("medications", v)} rows={3}
                placeholder="Include anticoagulants, steroids, immunosuppressants — affect healing and coding" />
              <Textarea label="Allergies" value={plan.allergies} onChange={v => updatePlan("allergies", v)} rows={3} placeholder="NKDA or list..." />
            </div>
          </Section>
          <Section title="Assessment & plan">
            <Textarea label="Clinical assessment (medical necessity statement)" value={plan.assessment} onChange={v => updatePlan("assessment", v)} rows={4}
              placeholder="Document: wound status (improving/stable/deteriorating), clinical rationale for chosen treatment, barriers to healing, response to prior treatment..." />
            <Input label="Follow-up plan" value={plan.followUp} onChange={v => updatePlan("followUp", v)}
              placeholder="e.g. Return in 1 week; refer to vascular surgery if no improvement in 4 weeks" />
          </Section>
          <Section title="Provider attestation">
            <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", marginBottom: 10, fontSize: 12, color: "var(--color-text-secondary)" }}>
              By signing, I attest that this documentation accurately reflects the services rendered, that the services were medically necessary, and that I personally performed or directly supervised the services documented herein. This note meets Medicare/Medicaid documentation requirements per 42 CFR Part 424.
            </div>
            <Input label="Electronic signature / name and credentials *" value={plan.signature} onChange={v => updatePlan("signature", v)}
              placeholder="e.g. Jane Smith, MD — NPI: 1234567890" />
          </Section>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep("oasis")}>← Back</button>
            <button onClick={() => setStep("review")}>Review note →</button>
          </div>
        </Card>
      )}

      {/* ── REVIEW ── */}
      {step === "review" && (
        <div>
          {errors.length > 0 && (
            <div style={{ padding: "12px 14px", background: "var(--color-background-danger)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-danger)", marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 500, fontSize: 13, color: "var(--color-text-danger)" }}>Billing errors must be resolved before submission</p>
              {errors.map((f, i) => <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "var(--color-text-danger)" }}>• Wound {f.wound}: {f.msg}</p>)}
            </div>
          )}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontWeight: 500, margin: "0 0 4px" }}>Wound Care Visit Note</h3>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>{patient.visitType} visit — {patient.date} — {patient.insurance}</p>
              </div>
              <div style={{ padding: "4px 10px", fontSize: 12, borderRadius: 20,
                background:  errors.length > 0 ? "var(--color-background-danger)"  : "var(--color-background-warning)",
                color:       errors.length > 0 ? "var(--color-text-danger)"        : "var(--color-text-warning)",
                border: `0.5px solid ${errors.length > 0 ? "var(--color-border-danger)" : "var(--color-border-warning)"}` }}>
                {errors.length > 0 ? "Incomplete" : "Ready to submit"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1rem" }}>
              {[["Patient", patient.name||"—"],["DOB", patient.dob||"—"],["MRN", patient.mrn||"—"],["Provider", patient.provider||"—"],["NPI", patient.npi||"—"],["Insurance", patient.insurance||"—"]].map(([l,v]) => (
                <div key={l} style={{ padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>{l}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{v}</p>
                </div>
              ))}
            </div>

            {plan.hpi && <div style={{ marginBottom: "1rem" }}><p style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>HPI</p><p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{plan.hpi}</p></div>}

            {wounds.map((wnd, i) => (
              <div key={wnd.id} style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px", marginBottom: 10 }}>
                <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 8 }}>Wound {i+1}{wnd.location ? ` — ${wnd.location}` : ""}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                  {[["Type",wnd.woundType||"—"],["Stage",wnd.stage||"N/A"],["L×W",`${wnd.length||"—"}×${wnd.width||"—"} cm`],
                    ["Depth",wnd.depth?`${wnd.depth} cm`:"—"],["Area",wnd.area?`${wnd.area} cm²`:"—"],["Pain",`${wnd.painScore}/10`]
                  ].map(([l,v]) => (
                    <div key={l} style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--color-text-secondary)" }}>{l}: </span>
                      <span style={{ fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {wnd.tissue.length > 0  && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Tissue: </span>{wnd.tissue.join(", ")}</p>}
                {wnd.periwound.length > 0 && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Periwound: </span>{wnd.periwound.join(", ")}</p>}
                {wnd.edges      && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Edges: </span>{wnd.edges}</p>}
                {wnd.undermining && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Undermining: </span>{wnd.undermining}</p>}
                {wnd.tunneling  && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Tunneling: </span>{wnd.tunneling}</p>}
                {wnd.exudate    && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Exudate: </span>{wnd.exudateAmount} {wnd.exudate}</p>}
                {wnd.treatment  && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Treatment: </span>{wnd.treatment}</p>}
                {wnd.dressing   && <p style={{ fontSize: 12, margin: "4px 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Dressing: </span>{wnd.dressing} — {wnd.frequency || "frequency not specified"}</p>}

                {getICD10(wnd).length > 0 && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--color-background-info)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-info)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "var(--color-text-info)" }}>ICD-10</p>
                    {getICD10(wnd).map((c,ci) => <span key={ci} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-info)", marginRight: 8 }}>{c}</span>)}
                  </div>
                )}
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  {getCPT(wnd).map((c,ci) => (
                    <div key={ci} style={{ padding: "6px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500 }}>{c.code}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
                {plan.modifier && plan.modifier !== "None" && <p style={{ fontSize: 12, margin: "6px 0 0" }}><span style={{ color: "var(--color-text-secondary)" }}>Modifier: </span>{plan.modifier}</p>}

                {wnd.photos.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {wnd.photos.map((ph, pi) => (
                      <img key={pi} src={ph.src} alt="" style={{ height: 60, width: 60, objectFit: "cover", borderRadius: 4, border: "0.5px solid var(--color-border-tertiary)" }} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {plan.assessment && <div style={{ marginBottom: "0.75rem" }}><p style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>Assessment</p><p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{plan.assessment}</p></div>}
            {plan.followUp   && <div style={{ marginBottom: "0.75rem" }}><p style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>Follow-up</p><p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>{plan.followUp}</p></div>}

            {plan.signature && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Electronically signed — attestation of medical necessity per 42 CFR Part 424</p>
                <p style={{ fontWeight: 500, margin: 0 }}>{plan.signature}</p>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{new Date().toLocaleString()}</p>
              </div>
            )}
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button onClick={() => setStep("plan")}>← Edit</button>
            <button disabled={errors.length > 0} onClick={() => setSubmitted(true)}
              style={{ background: errors.length > 0 ? "var(--color-background-secondary)" : "var(--color-background-success)",
                color:  errors.length > 0 ? "var(--color-text-tertiary)"   : "var(--color-text-success)",
                border: `0.5px solid ${errors.length > 0 ? "var(--color-border-secondary)" : "var(--color-border-success)"}`,
                cursor: errors.length > 0 ? "not-allowed" : "pointer" }}>
              {errors.length > 0 ? `Resolve ${errors.length} error${errors.length > 1 ? "s" : ""} to submit` : "Submit note + send to billing ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
