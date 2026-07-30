# Heritage Diagnostics mobile application

React Native mobile application and a local Express API implementing the supplied rural-health prototype flow.

## Implemented flow

- Patient: OTP login → prescription camera upload → live order status → PDF report.
- PRO: patient call confirmation → tests/amount → collection-agent assignment.
- Agent: assigned pickups → sample/cash confirmation → send to lab.
- Lab: receive sample → attach report URL → mark report ready.
- Admin: overview totals, every order, and report publishing.
- Hindi/English UI, Hindi voice guidance, and React Native SweetAlert-style success/error dialogs.

## Start locally

Use three terminals from this directory.

```powershell
# Terminal 1: backend + local database
Copy-Item backend\.env.example backend\.env
npm --prefix backend install
npm run backend
```

```powershell
# Terminal 2: Metro
npm install
npm start
```

```powershell
# Terminal 3: Android emulator
npm run android
```

The API runs at `http://localhost:5000`. Android Emulator reaches it through `http://10.0.2.2:5000`. For a physical Android phone, change `API_BASE_URL` in `src/client.ts` to the computer's LAN IP and keep both devices on the same Wi-Fi.

## Demo credentials

| Role | Username / phone | Password / OTP |
| --- | --- | --- |
| Patient | `9999999999` | `1234` |
| PRO | `pro` | `pro123` |
| Agent | `agent1` | `agent123` |
| Lab | `lab` | `lab123` |
| Admin | `admin` | `admin123` |

Local development always returns OTP `1234`; connect an SMS provider before production.

## Local database and uploads

The zero-install local database is stored in `backend/data/database.json`; uploaded prescriptions are stored in `backend/uploads`. Both are git-ignored. The API/data access is isolated in `backend/src/db.js`, so a later MongoDB/Atlas cluster migration can retain the same mobile API contract.

Set production secrets and paths through `backend/.env` (see `.env.example`). Do not use the default JWT secret in production.

## Checks

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand
npm run backend:test
```
