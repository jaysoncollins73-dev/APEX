# 🩺 Wound Care Visit Note App

A mobile-first, Medicare/Medicaid-compliant wound care documentation application built in React. Designed for use by wound care providers — physicians, physician assistants, nurse practitioners, and wound care nurses — at the bedside, in clinics, home health settings, and skilled nursing facilities.

> **Status:** Prototype complete — ready for production development and deployment.

---

## ✨ Features

- 📋 **Structured wound assessment** — complete clinical note template covering all required documentation elements
- 📷 **Photo capture & measurement** — take wound photos and measure dimensions directly from the image
- 🔢 **Auto-coding** — automatic ICD-10-CM and CPT code suggestions based on documented clinical data
- 🏥 **Medicare/Medicaid compliance** — real-time compliance checklist, MDS 3.0 items, OASIS-E documentation
- 📡 **FHIR R4 ready** — data model maps to standard FHIR resources for EHR integration (Epic, Cerner, VA)
- 📱 **PWA / installable** — works on any tablet or phone, installs to home screen, supports offline use
- 🔒 **HIPAA-aware design** — no PHI in localStorage; designed for HIPAA-compliant backend integration

---

## 📸 App Walkthrough

| Tab | Purpose |
|---|---|
| **Patient** | Demographics, NPI, insurance, HbA1c, Braden score |
| **Wound** | Full wound assessment — multiple wounds, measurements, tissue, exudate, treatment |
| **Photos** | Camera capture with in-app pixel measurement tool |
| **Coding** | Auto-suggested ICD-10, CPT, MDS 3.0 items, compliance checklist |
| **OASIS** | OASIS-E items for home health Medicare reimbursement |
| **Plan** | HPI, medications, assessment, follow-up, provider attestation |
| **Review** | Full note preview with all codes — submit when complete |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Run locally

```bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/wound-care-app.git
cd wound-care-app

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
```

The `/build` folder is ready to deploy to any static host.

---

## 📦 Deployment

### Option A — Netlify (easiest, free)
1. Run `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag and drop the `/build` folder
4. Share the URL — works immediately on any phone or tablet

### Option B — Vercel
```bash
npm install -g vercel
vercel --prod
```

### Option C — GitHub Pages
```bash
npm install --save-dev gh-pages
# Add to package.json: "homepage": "https://YOUR-USERNAME.github.io/wound-care-app"
npm run build
npx gh-pages -d build
```

### Option D — Progressive Web App (offline support)
Use the PWA template for full offline capability:
```bash
npx create-react-app wound-care-app --template cra-template-pwa
```
Copy `public/service-worker.js` and `public/manifest.json` from this repo into your new project.

### Option E — Native iOS / Android (Capacitor)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/camera @capacitor/filesystem
npx cap init
npx cap add ios
npx cap add android
npm run build && npx cap sync
```
Open in Xcode or Android Studio to publish.

---

## 🗂 Project Structure

```
wound-care-app/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA config — install to home screen
│   ├── service-worker.js      # Offline caching + background sync
│   └── icons/                 # App icons (add your own PNG icons here)
│       ├── icon-192x192.png
│       └── icon-512x512.png
├── src/
│   ├── App.jsx                # ← Full application source
│   └── index.js
├── docs/
│   ├── DEVELOPER_HANDOFF.md   # Setup guide, deployment, HIPAA checklist
│   └── PROJECT_BRIEF.md       # Full requirements and background
├── reference/
│   └── fhir_bundle.json       # FHIR R4 payload — EHR integration reference
├── README.md                  # This file
├── package.json
└── .gitignore
```

---

## 🏥 Clinical Coding Reference

### ICD-10-CM (auto-suggested by app)
| Wound Type | Example Code |
|---|---|
| Pressure injury — right heel, Stage 2 | L89.612 |
| Pressure injury — sacrum, Stage 3 | L89.153 |
| Diabetic foot ulcer | E11.621 |
| Venous leg ulcer | I87.311 |
| Arterial ulcer | I70.231 |
| Surgical wound | T81.31XA |

### CPT (auto-suggested by app)
| Code | Description | Trigger |
|---|---|---|
| 97597 | Selective debridement ≤20 sq cm | Debridement documented + necrotic tissue |
| 97598 | Selective debridement each addl 20 sq cm | Area > 20 cm² |
| 97602 | Non-selective debridement | Pressure injury type |
| 97603 | Wound care management >20 sq cm | Area > 20 cm² |
| 97607 | NPWT ≤50 sq cm | NPWT/wound vac dressing keyword |
| 99213 | Office visit, established, moderate complexity | Always suggested |

---

## 🔌 EHR Integration (FHIR R4)

See [`reference/fhir_bundle.json`](reference/fhir_bundle.json) for the complete FHIR R4 Bundle mapping all wound visit data to standard resources.

| FHIR Resource | Contents |
|---|---|
| `Encounter` | Visit metadata, provider, date |
| `Condition` | Wound diagnosis (SNOMED CT) |
| `Observation` | Size (LOINC), wound bed, pain score |
| `Media` | Wound photos with measurement data |
| `CarePlan` | Dressing orders, follow-up plan |

Integration targets: **Epic**, **Cerner**, **VA CPRS/VistA** via SMART on FHIR.

---

## ⚠️ HIPAA & Production Checklist

This prototype stores data in React state only (cleared on refresh). Before clinical use:

- [ ] HIPAA BAA signed with cloud hosting provider
- [ ] Encrypted storage (IndexedDB locally or HIPAA-compliant backend)
- [ ] Provider authentication with session timeout
- [ ] Audit logging (access and modification per patient record)
- [ ] Data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- [ ] Penetration testing before go-live
- [ ] Incident response plan documented
- [ ] ICD-10 and CPT codes reviewed by certified coder (CPC/CCS) before billing

---

## 🗺 Roadmap

- [ ] Persistent storage (IndexedDB / HIPAA cloud backend)
- [ ] Provider authentication and role-based access
- [ ] PDF note export (printable, signed)
- [ ] Accurate photo measurement (TensorFlow.js ruler detection)
- [ ] FHIR API POST on note submission
- [ ] Admin dashboard (search, export, billing queue)
- [ ] Native iOS / Android app (Capacitor)
- [ ] Epic / Cerner SMART on FHIR integration

---

## 📄 Documentation

| Document | Description |
|---|---|
| [Developer Handoff](docs/DEVELOPER_HANDOFF.md) | Setup, deployment options, recommended next steps |
| [Project Brief](docs/PROJECT_BRIEF.md) | Full requirements, clinical context, technical specs |

| [FHIR Reference](reference/fhir_bundle.json) | FHIR R4 API payload for EHR integration |

---

## 🤝 Contributing

Contributions welcome — especially from clinicians, wound care specialists, coders (CPC/CCS), and healthcare developers. Please open an issue before submitting a PR.

---

## ⚖️ License

MIT License — free to use, modify, and distribute. See [LICENSE](LICENSE) for details.

**Clinical disclaimer:** This application is a documentation aid and is not a certified medical device. ICD-10 and CPT code suggestions must be reviewed by a certified coder before claim submission. Always consult your compliance team before using in a clinical billing workflow.

---

## 🙏 Acknowledgments

Built to support wound care providers and improve documentation quality, billing accuracy, and patient outcomes.

*"The best wound care note is the one that's complete, accurate, and done at the bedside."*
