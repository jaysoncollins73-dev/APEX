# Wound Care Visit Note App — Developer Handoff

## Overview
A mobile-friendly wound care documentation app built in React.
Allows clinicians to document wound care visits, capture photos,
and measure wounds from images.

---

## Tech Stack
- **Framework**: React 18 (functional components + hooks)
- **Styling**: CSS variables (light/dark mode auto-adapts)
- **No external dependencies** beyond React itself

---

## Quickstart (local development)

```bash
npx create-react-app wound-care-app
cd wound-care-app
# Replace src/App.js with the provided App.jsx source code
npm start
```

---

## Deployment options

### Option A — Free static hosting (fastest, ~1 hour)
Recommended for internal/pilot use with no backend needed.

```bash
npm run build
# Then deploy the /build folder to any of:
# - https://netlify.com  (drag & drop the build folder)
# - https://vercel.com   (connect GitHub repo)
# - https://pages.github.com
```

Users open the URL in Safari (iOS) or Chrome (Android) and tap
"Add to Home Screen" to use it like a native app.

---

### Option B — Progressive Web App / offline support (~1 day)

Add a service worker so the app works without internet access.
Use Create React App's built-in PWA template:

```bash
npx create-react-app wound-care-app --template cra-template-pwa
```

This enables:
- Offline use after first load
- "Install" prompt on Android
- Home screen icon on iOS via "Add to Home Screen"

---

### Option C — Native mobile app via Capacitor (~1–2 weeks)

Wrap the React app for App Store / Google Play distribution.
Gives access to native camera API, local encrypted storage, etc.

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/camera @capacitor/filesystem
npx cap init
npx cap add ios
npx cap add android
npm run build && npx cap sync
# Open in Xcode (iOS) or Android Studio (Android) to publish
```

---

## Recommended next features (priority order)

### 1. Persistent storage (required for real use)
Right now data lives only in React state — it disappears on refresh.

**Quick option** — IndexedDB (no backend, stays on device):
```js
import { openDB } from 'idb';
const db = await openDB('wound-care', 1, {
  upgrade(db) { db.createObjectStore('notes', { keyPath: 'id' }); }
});
await db.put('notes', noteObject);
```

**Production option** — HIPAA-compliant backend:
- AWS (with HIPAA BAA): DynamoDB + S3 for photos + Cognito for auth
- Azure Health Data Services
- Google Cloud Healthcare API

### 2. Authentication
```bash
npm install @aws-amplify/auth
# or
npm install firebase
```
- Provider login (email/password or SSO)
- Role-based access (provider vs. admin)
- Session timeout for HIPAA compliance

### 3. Photo measurement accuracy
The current tool estimates pixel distance. For clinical accuracy:
- Prompt user to place a **1cm reference sticker** in the photo
- Auto-detect the sticker using a lightweight ML model (TensorFlow.js)
- Or integrate with a **wound measurement ruler overlay** product

### 4. PDF export
```bash
npm install jspdf html2canvas
```
Generate a signed, printable PDF of the completed note.

### 5. EHR integration (Epic / Cerner)
Use SMART on FHIR for standards-based integration:
- Patient context pulled from EHR automatically
- Notes written back as FHIR `Wound` observations
- Reference: https://docs.smarthealthit.org

---

## HIPAA checklist for production

- [ ] HIPAA Business Associate Agreement (BAA) signed with cloud host
- [ ] Data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- [ ] Audit logging (who accessed/modified each record)
- [ ] Automatic session timeout after inactivity
- [ ] No PHI stored in browser localStorage (use encrypted IndexedDB or server)
- [ ] Penetration testing before go-live
- [ ] Documented incident response plan

---

## File structure (suggested)

```
wound-care-app/
├── public/
│   ├── manifest.json        # PWA config (icon, name, theme color)
│   └── service-worker.js    # Offline support
├── src/
│   ├── App.jsx              # ← Main app (provided)
│   ├── components/
│   │   ├── PatientForm.jsx
│   │   ├── WoundAssessment.jsx
│   │   ├── PhotoCapture.jsx
│   │   ├── PlanForm.jsx
│   │   └── ReviewNote.jsx
│   ├── hooks/
│   │   └── useWoundNote.js  # Shared state logic
│   ├── services/
│   │   ├── storage.js       # IndexedDB or API calls
│   │   └── auth.js          # Login/session handling
│   └── index.js
└── package.json
```

---

## Estimated development effort

| Milestone                        | Effort     |
|----------------------------------|------------|
| Hosted web app (static)          | 2–4 hours  |
| PWA with offline support         | 1 day      |
| Local encrypted storage          | 1–2 days   |
| Provider authentication          | 2–3 days   |
| PDF export                       | 1 day      |
| HIPAA-compliant cloud backend    | 1–2 weeks  |
| Native iOS/Android app           | 1–2 weeks  |
| Epic/Cerner FHIR integration     | 3–6 weeks  |

---

## Source code
The complete React source is in the companion artifact: `wound_care_note`
(the interactive prototype in this conversation).

Copy the contents of that artifact into `src/App.jsx` to get started.
