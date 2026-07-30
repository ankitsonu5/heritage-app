# Heritage Diagnostics

Heritage Diagnostics is a Hindi-first home sample-collection platform for
pathology, radiology, and blood tests in Varanasi. It provides a patient and staff
mobile application, an administration dashboard, and a shared backend API.

The order workflow covers five roles:

```text
Patient -> PRO -> Collection Agent -> Lab -> Admin oversight
```

```text
submitted -> pro_review -> confirmed -> agent_assigned
          -> sample_collected -> lab_received -> report_ready
```

## Current version

| Component | Version |
|---|---:|
| Android application | 1.2 (`versionCode` 3) |
| Backend API | 1.0.0 |
| Admin dashboard | 1.0.0 |

## Repository structure

```text
HERITAGE-APP/
|-- admin-web/             React, Vite, and Electron administration dashboard
|-- backend/               Express and MongoDB API
|-- heritagediagnostics/   React Native patient and staff application
|-- docs/                  Project and deployment documentation
|-- screenshots/           Sanitized screenshots for documentation/store listings
|-- releases/              Local ignored release artifacts and release guidance
|-- README.md
`-- render.yaml            Render deployment blueprint
```

Generated dependencies, build output, APKs, app bundles, environment files, and
IDE state are intentionally excluded from source control.

## Prerequisites

- Node.js 22 or newer
- npm
- MongoDB Atlas, local MongoDB, or the included in-memory development server
- Android Studio with the Android SDK and a compatible JDK for Android builds

## Backend setup

The backend is the source of truth for authentication, orders, status transitions,
notifications, and reports.

```bash
cd backend
npm ci
```

For a disposable local database:

```bash
npm run dev:memory
```

For MongoDB Atlas or local MongoDB:

```bash
cp .env.example .env
```

Configure at least:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/heritage_diagnostics
JWT_SECRET=replace-with-a-long-random-secret
```

Then run:

```bash
npm run seed
npm start
```

Never commit `.env`, MongoDB credentials, Firebase service accounts, or production
secrets.

### Backend verification

```bash
npm test
```

## Admin dashboard setup

```bash
cd admin-web
npm ci
npm run dev
```

The local dashboard is available at `http://localhost:5173`. The Vite development
configuration proxies API requests to the backend.

Build the hosted dashboard:

```bash
npm run build:web
```

Build the Electron desktop package when required:

```bash
npm run dist
```

## Mobile application setup

```bash
cd heritagediagnostics
npm ci
npm start
```

In another terminal:

```bash
npm run android
```

The Android emulator uses `http://10.0.2.2:5000` for the local backend. Production
builds use the API URL configured in `heritagediagnostics/src/config.ts`.

### Mobile verification

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

### Android release build

Create an ignored `android/keystore.properties` file for the private upload-key
configuration, then build an Android App Bundle:

```bash
cd heritagediagnostics/android
./gradlew bundleRelease
```

On Windows PowerShell:

```powershell
.\gradlew.bat bundleRelease
```

The bundle is generated under:

```text
heritagediagnostics/android/app/build/outputs/bundle/release/
```

Do not commit the bundle, APK, keystore, or keystore passwords.

## APK downloads

APK binaries are distributed through
[GitHub Releases](../../releases) and are not stored in the source tree.

> Download links will be added here after the next signed GitHub Release is
> published.

Each release should include:

- A semantic version tag such as `v1.2.0`
- Release notes and upgrade instructions
- The signed APK or AAB
- A SHA-256 checksum

## Deployment

Backend deployment instructions are available in
[docs/DEPLOY.md](docs/DEPLOY.md). The root `render.yaml` defines the Render
service blueprint.

Production deployments must configure secrets in the hosting provider rather
than in source files.

## Security and privacy

This application processes personal and medical information. Never use real
patient data in demo accounts, screenshots, fixtures, logs, or repository files.
Review authentication, file access, backups, retention, and applicable privacy
requirements before a production launch.

## License

No public license has been specified. All rights are reserved unless the project
owner adds a license file.
