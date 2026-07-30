# Heritage Diagnostics

Home sample-collection service for pathology / radiology / blood tests in Varanasi.
Hindi-first, built for low-literacy and elderly rural users.

One order moves through five roles:

```
patient → PRO → collection agent → lab → (admin oversees)
submitted → pro_review → confirmed → agent_assigned → sample_collected → lab_received → report_ready
```

## Repository layout

| Path | What it is |
|---|---|
| `backend/` | Express + MongoDB (Mongoose) API. **The single source of truth.** |
| `heritagediagnostics/` | React Native app (patient, PRO, agent, lab) |
| `admin-web/` | React + Vite admin dashboard (wide tables, server-side pagination) |
| `reference-app/` | The original clickable HTML prototype. Reference only — not wired to anything. |

## Quick start (no database install needed)

```bash
# 1. API with an in-memory MongoDB, pre-seeded with demo data at every stage
cd backend && npm install && npm run dev:memory

# 2. Mobile app (new terminal)
cd heritagediagnostics && npm install && npm start
npm run android          # in another terminal

# 3. Admin dashboard (new terminal)
cd admin-web && npm install && npm run dev     # http://localhost:5173
```

`dev:memory` boots a real MongoDB in a temp directory and throws it away on exit —
same models, same state machine, same code paths as production. Nothing persists.

### Running against a persistent database (MongoDB Atlas or local mongod)

```bash
cd backend
cp .env.example .env      # set JWT_SECRET (16+ chars) and MONGODB_URI
npm run seed              # demo data; add -- --reset to wipe orders first
npm start                 # or: npm run dev  (auto-restart)
```

Two things bite people with Atlas:

- **Put the database name in the URI.** `…mongodb.net/heritage_diagnostics?retryWrites=true&w=majority`.
  Without it Mongo quietly writes into a database called `test`, and you spend an
  hour wondering where your data went.
- **`querySrv ECONNREFUSED` does not mean Atlas is down.** `mongodb+srv://` needs a
  DNS SRV lookup, and some ISP/corporate resolvers refuse them. Set
  `DNS_SERVERS=8.8.8.8,1.1.1.1` in `.env` and the driver will resolve through those
  instead. Leave it unset anywhere DNS behaves.

`.env` is gitignored — never commit the connection string.

## There is no demo data

The system starts empty. `npm run seed` creates **one admin account** (from
`ADMIN_USERNAME` / `ADMIN_PASSWORD` in `backend/.env`) and nothing else:

- **PRO / Agent / Lab accounts** — created by the admin in the dashboard
  (*PRO team* / *Agents* / *Lab team* → “+ New … account”). The lab needs an
  account before anyone can upload a report.
- **Patients** — register themselves in the app.
- **Orders** — appear when a patient sends a prescription.

`npm run seed -- --reset` wipes everything and recreates only the admin.

## Signing in

| Who | How |
|---|---|
| Admin | username + password (dashboard, and the app) |
| PRO / Agent / Lab | username + password given to them by the admin |
| Patient | phone + password, set when they register |

There is no role picker and no staff sign-up in the app. The role comes from the
account, and the app routes on what the backend returns. If the app let anyone
register as a PRO, anyone who installed the APK could read every patient's name,
phone, address and report.

Patients can be switched to SMS OTP by setting `AUTH_MODE = 'otp'` in
`heritagediagnostics/src/config.ts` — the OTP screens and the server's
send-otp / verify-otp endpoints are both still live and still tested.

## Verifying it works

```bash
cd backend
npm test                  # 21 tests: state machine + all five roles + authorization
node smoke.js             # drives a real running server end to end
```

`smoke.js` needs the server up (`npm run dev:memory` in another terminal). It pushes
one order through the entire pipeline and asserts every illegal shortcut is refused.

## The order state machine

`backend/src/status.js` is the only place the lifecycle is defined. Route guards, the
patient step tracker, chip colours, and queue filters all derive from it.

Status is never assigned directly — every change goes through `moveTo()` in
`backend/src/lifecycle.js`, which validates the transition, writes an
`OrderStatusHistory` row, and fires notifications. An illegal transition (for example
`submitted → report_ready`) returns **409** and is impossible to express in a route.

The client mirrors this file in `heritagediagnostics/src/constants/status.ts`, and
`__tests__/status.test.ts` reads the real backend file to prove the two cannot drift.

## Configuration

All optional. With none of it set, the app is fully functional — OTPs and
notifications are written to the server console instead of being sent.

| Variable | Effect when unset |
|---|---|
| `JWT_SECRET` | **Required.** Server refuses to boot (min 16 chars). |
| `MONGODB_URI` | Required for `npm run dev` / `start`; unused by `dev:memory`. |
| `DEV_OTP` | Unset → real random OTPs. Set → every OTP is that code. **Leave unset in production.** |
| `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_TEMPLATE_ID` | SMS is logged to console instead of sent (MSG91). |
| `EXPO_ACCESS_TOKEN` | Push is logged instead of sent. |
| `SMTP_URL`, `SMTP_FROM` | Report emails are logged instead of sent. |
| `UPLOAD_DIR` | Defaults to `backend/uploads`. |
| `ALLOWED_ORIGINS` | Defaults to `*`. Set to the dashboard origin in production. |

## Pointing the app at a real device or server

The Android emulator reaches the host at `10.0.2.2`. For a physical phone or a
deployment, edit `API_BASE_URL` in `heritagediagnostics/src/config.ts` and rebuild.

## Known gaps

- **Prescriptions and reports are served from `/uploads` without authentication.**
  The filename is an unguessable UUID, but the URL is the only thing protecting
  medical data. Put these behind a signed-URL or auth check before going live.
- Payments are cash-only end to end. `paymentMode: 'online'` exists in the model and
  the agent's cash checkbox already respects it, but no gateway is wired up.
- Notifications are best-effort and fire-and-forget; there is no delivery retry queue.
