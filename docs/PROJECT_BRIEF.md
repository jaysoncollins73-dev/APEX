# Wound Care Visit Note App — Project Brief
## Complete Background, Requirements & Context

---

## 1. Project Origin

This application was designed and prototyped via conversation with Claude (Anthropic AI) on June 17, 2026. The full working prototype, all supporting files, and this brief were generated in that session. The conversation can be shared with developers as a reference.

---

## 2. Original Request / Problem Statement

The requesting stakeholder — a clinical professional working in wound care — needed a mobile-friendly application that allows providers (nurses, PAs, physicians, wound care specialists) to:

- Document a wound care visit using a structured medical note template
- Take photos of wounds in the field
- Measure wound dimensions directly from photos
- Generate documentation suitable for Medicare and Medicaid billing compliance

The application needed to be deployable on a **tablet or phone** and usable **in the field** (at the bedside or in clinical settings with variable connectivity).

---

## 3. Clinical Setting & Users

- **Primary users:** Wound care providers — physicians, physician assistants, nurse practitioners, wound care nurses
- **Use settings:**
  - Outpatient wound care clinics
  - Home health visits
  - Skilled nursing facilities (SNF) / long-term care (LTC)
  - Hospital bedside / inpatient wound rounds
  - VA / federal health system settings (noted as a relevant context)
- **Device targets:** iPad, Android tablet, iPhone, Android phone
- **Connectivity:** Must support offline use (providers may be in areas with poor Wi-Fi or cellular signal)

---

## 4. Core Functional Requirements

### 4.1 Patient information capture
- Patient name, date of birth, MRN
- Provider name and NPI number
- Visit date and visit type (Initial, Follow-up, Consult, Urgent)
- Primary insurance (Medicare Part A/B, Medicaid, Medicare Advantage, Commercial, Self-pay)
- Clinical indicators: HbA1c, Braden Scale score

### 4.2 Wound assessment documentation
- Support for **multiple wounds per visit** (tabbed interface)
- For each wound:
  - Anatomical location (free text)
  - Wound type (Pressure injury, Diabetic foot ulcer, Venous leg ulcer, Arterial ulcer, Surgical wound, Traumatic wound, Burn, Skin tear, Other)
  - Pressure injury stage (Stage 1–4, Unstageable, Deep tissue injury)
  - Measurements: length, width, depth (in cm); auto-calculated area (cm²)
  - Undermining (clock position and depth)
  - Tunneling (clock position and depth)
  - Tissue type (multi-select: Granulation, Slough, Eschar, Epithelialization, Necrotic, Hypergranulation)
  - Exudate type and amount
  - Odor
  - Wound edges
  - Periwound skin condition (multi-select)
  - Pain score (0–10 slider)
  - Treatment performed (free text)
  - Dressing applied and change frequency
  - Additional clinical notes

### 4.3 Photo capture and wound measurement
- Camera integration (native device camera via `capture="environment"`)
- Photo upload support (JPG, PNG)
- Multiple photos per wound with timestamp
- **In-app measurement tool:**
  - Provider clicks two points on a photo to measure pixel distance
  - Converts pixel distance to centimeters using a configurable scale factor (pixels per cm)
  - Measured values can be applied directly to length or width fields
  - Designed to work with a calibrated ruler or reference object in the photo frame for accuracy

### 4.4 Automatic clinical coding
- **ICD-10-CM auto-suggestion** based on wound type and anatomical location
  - Pressure injury codes mapped by stage and location (sacrum, heel, buttock, etc.)
  - Diabetic foot ulcer, venous/arterial ulcer, surgical wound, burn, skin tear mappings
  - Primary and secondary/alternate codes suggested
- **CPT auto-suggestion** based on documented clinical data:
  - 97597 — Selective debridement, first 20 sq cm (triggers when debridement documented + necrotic tissue present)
  - 97598 — Selective debridement, each additional 20 sq cm
  - 97602 — Non-selective debridement / wound care ≤20 sq cm
  - 97603 — Wound care >20 sq cm
  - 97607 — NPWT ≤50 sq cm (triggers on NPWT/wound vac dressing keywords)
  - 99213 — Office visit, established patient, moderate complexity
- **Modifier support:** 25, 59, LT, RT, TC, 26
- **MDS 3.0 item auto-population** for SNF/LTC settings (M0100, M0150, M0300A–E, M0800, M1040)

### 4.5 OASIS-E documentation (home health)
- Wound-relevant OASIS-E items surfaced for documentation:
  - M1020, M1030, M1200, M1240, M1300, M1306, M1322, M1324, M1334, M1340, M1342
- Contextual guidance on PDGM case-mix grouping impact
- Data captured for entry into iQIES/HAVEN system

### 4.6 Clinical plan documentation
- History of present illness (HPI)
- Relevant medications and allergies
- Clinical assessment / medical necessity statement
- Follow-up plan
- Provider electronic attestation with 42 CFR Part 424 language

### 4.7 Compliance checklist (real-time)
- Live error and warning counter displayed throughout the app
- **Errors (block submission):**
  - Missing wound location
  - Missing wound type
  - Missing wound measurements
  - Missing pressure injury stage (when wound type = Pressure injury)
  - Incomplete patient demographics (name, MRN, DOB)
- **Warnings (advisory):**
  - Missing tissue type
  - Missing exudate documentation
  - Missing treatment description
  - Missing dressing type
  - Missing periwound assessment
  - Missing HbA1c for diabetic foot ulcer
  - No wound photo uploaded
  - Necrotic tissue present without debridement documented
- Submit button is disabled until all errors are resolved

### 4.8 Note review and submission
- Full formatted note preview before submission
- All wounds, codes, photos, and provider signature displayed
- Submit confirmation screen with reset to new note

---

## 5. Medicare / Medicaid Compliance Requirements

The application was explicitly designed to support compliance with the following:

- **42 CFR Part 424** — Provider attestation of medical necessity (attestation language built into signature block)
- **EMTALA** — Medical screening exam documentation standards (applicable in ED settings)
- **Medicare home health PPS / PDGM** — OASIS-E documentation drives case-mix grouping and reimbursement
- **MDS 3.0** — SNF/LTC quality reporting and PDPM payment accuracy
- **ICD-10-CM** — Accurate diagnosis coding for claim submission
- **CPT coding** — Procedure code accuracy tied to documented clinical data
- **Audit defense** — Photo documentation with timestamps; clinical indication required for all imaging orders

### Billing workflow intent
The app is designed so that when the provider completes and submits a note, the generated ICD-10 and CPT codes — along with the modifier and provider NPI — are ready to be passed to a billing system or EHR via API. This is not yet implemented in the prototype but is the intended production workflow.

---

## 6. Technical Requirements

### 6.1 Technology stack
- **Framework:** React 18 (functional components with hooks)
- **Styling:** CSS custom properties (CSS variables) — light/dark mode adaptive
- **External dependencies:** None beyond React itself (no UI library, no CSS framework)
- **State management:** React useState, useCallback — no Redux or external state library needed at current scale

### 6.2 Deployment targets
| Option | Description | Effort |
|---|---|---|
| Static web app | Hosted on Netlify, Vercel, or GitHub Pages | 2–4 hours |
| PWA (Progressive Web App) | Installable, offline-capable via service worker | 1 day |
| Native iOS/Android | Wrapped via Capacitor | 1–2 weeks |
| EHR-integrated | SMART on FHIR, Epic/Cerner integration | 3–6 weeks |

### 6.3 PWA / mobile requirements
- `manifest.json` configured for home screen installation on iOS (Safari) and Android (Chrome)
- Service worker for offline caching and background sync of queued notes
- `capture="environment"` on file input for native camera access
- Responsive layout designed for 375px–768px viewport width

### 6.4 Offline support
- Static assets cached on first load via service worker
- Notes entered while offline queued in IndexedDB
- Background sync via `sync` event — notes posted to server API when connectivity restored
- App must function fully without internet after initial load

### 6.5 Storage
- **Current prototype:** React state only — data does not persist across sessions
- **Required for production:** IndexedDB for local encrypted storage (recommended: `idb` library) or HIPAA-compliant cloud backend
- **Prohibited:** `localStorage` / `sessionStorage` for PHI

### 6.6 HIPAA compliance requirements for production
- [ ] HIPAA BAA signed with cloud hosting provider
- [ ] Data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- [ ] Audit logging (access and modification records per patient)
- [ ] Automatic session timeout after inactivity
- [ ] No PHI in browser localStorage
- [ ] Penetration testing before go-live
- [ ] Documented incident response plan
- [ ] Role-based access control (provider vs. admin)

---

## 7. EHR Integration Requirements (Future Phase)

### 7.1 FHIR R4 data model
A complete FHIR R4 Bundle payload was generated mapping all wound visit data to standard FHIR resources:

| FHIR Resource | Contents |
|---|---|
| `Encounter` | Visit metadata, provider, date, type |
| `Condition` | Wound diagnosis with SNOMED CT codes |
| `Observation` | Wound size (LOINC 39125-0), wound bed findings, pain score |
| `Media` | Wound photos with measurement metadata |
| `CarePlan` | Dressing orders, treatment plan, follow-up |

### 7.2 Target EHR systems
- Epic (SMART on FHIR)
- Cerner (SMART on FHIR)
- VA CPRS / VistA (VA-specific integration path)

### 7.3 Key LOINC codes used
- `39125-0` — Wound size
- `39126-8` — Wound length
- `39127-6` — Wound width
- `39128-4` — Wound depth
- `39132-6` — Wound bed appearance
- `39130-0` — Wound exudate type
- `72514-3` — Pain severity numeric rating scale

### 7.4 Key SNOMED codes used
- `225358003` — Wound care management
- `399912005` — Pressure ulcer
- `385204003` — Granulation tissue
- `33638009` — Serosanguineous discharge
- `46862004` — Heel region

---

## 8. Recommended Next Development Priorities

1. **Persistent storage** — IndexedDB or HIPAA-compliant backend API
2. **Provider authentication** — Login, session management, role-based access
3. **PDF export** — Signed, printable note output (jsPDF + html2canvas)
4. **Photo measurement accuracy** — TensorFlow.js ruler auto-detection or reference sticker system
5. **FHIR API integration** — POST wound visit bundle to EHR on submission
6. **Admin dashboard** — View submitted notes, search by patient/date, export to billing
7. **Native app** — Capacitor wrapper for App Store / Google Play

---

## 9. File Inventory

All files were generated in the Claude conversation session dated June 17, 2026.

| Filename | Location | Description |
|---|---|---|
| `App.jsx` | `src/App.jsx` | Full React application source — main file |
| `manifest.json` | `public/manifest.json` | PWA manifest for home screen install |
| `service-worker.js` | `public/service-worker.js` | Offline caching and background sync |
| `fhir_bundle.json` | `reference/fhir_bundle.json` | FHIR R4 API payload — EHR integration reference |
| `DEVELOPER_HANDOFF.md` | `docs/DEVELOPER_HANDOFF.md` | Developer setup guide, deployment options, HIPAA checklist |

| `PROJECT_BRIEF.md` | `docs/PROJECT_BRIEF.md` | This file |

---

## 10. Suggested Project Folder Structure

```
wound-care-app/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/
│       ├── icon-192x192.png
│       └── icon-512x512.png
├── src/
│   ├── App.jsx                  ← Main application
│   ├── index.js
│   ├── components/              ← Future: split into sub-components
│   │   ├── PatientForm.jsx
│   │   ├── WoundAssessment.jsx
│   │   ├── PhotoCapture.jsx
│   │   ├── CodingPanel.jsx
│   │   ├── OasisForm.jsx
│   │   ├── PlanForm.jsx
│   │   └── ReviewNote.jsx
│   ├── hooks/
│   │   └── useWoundNote.js      ← Shared state logic (future refactor)
│   └── services/
│       ├── storage.js           ← IndexedDB / API calls
│       ├── auth.js              ← Authentication
│       ├── fhir.js              ← FHIR bundle builder
│       └── coding.js            ← ICD-10 / CPT logic (extracted from App.jsx)
├── docs/
│   ├── DEVELOPER_HANDOFF.md
│   ├── PROJECT_BRIEF.md         ← This file
│   

├── reference/
│   └── fhir_bundle.json
└── package.json
```

---

## 11. Contact & Ownership

- **Project initiated by:** Clinical wound care stakeholder (VA / wound care setting)
- **Prototype generated:** June 17, 2026 via Claude (Anthropic)
- **Development status:** Prototype complete — ready for production development
- **Next step:** Hand off all files to development team for hosted deployment

---

*This document should be kept with the project repository and updated as requirements evolve.*
