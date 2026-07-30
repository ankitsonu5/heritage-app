# Heritage Admin — web version

Same dashboard, same code, two ways to ship it:

| | command | output | how it finds the API |
|---|---|---|---|
| Windows app | `npm run dist` | `release/…Setup 1.0.0.exe` | Electron injects the URL at runtime (`window.HERITAGE.apiUrl`) |
| Website | `npm run build:web` | `dist-web/` | `VITE_API_BASE_URL`, baked in at build time from `.env.production` |

Neither build touches the other. `npm run dist` is unchanged.

## Build the website

```bash
cd admin-web
npm install
npm run build:web        # → dist-web/
npm run preview          # serve dist-web/ locally at http://localhost:4173
```

`dist-web/` is a plain static site — any static host will serve it.

## Deploy

### Vercel

`vercel.json` is already in this folder, so there is nothing to configure by hand.

1. Push the repo to GitHub.
2. On Vercel: **Add New → Project**, import the repo.
3. Set **Root Directory** to `admin-web`. Leave the build settings alone — `vercel.json` sets the build command (`npm run build:web`), the output directory (`dist-web`), and the SPA rewrite.
4. Deploy. You get a URL like `https://heritage-admin.vercel.app`.

### Netlify

`netlify.toml` covers the same ground, including `base = "admin-web"`, so import the repo at its root and deploy.

## One thing you must do on the backend, or the site will not work

The website and the API are on **different domains**, so every request from the
browser is cross-origin. The browser blocks them unless the API says the site is
allowed. Add the deployed URL to `ALLOWED_ORIGINS` on Render:

```
ALLOWED_ORIGINS=https://heritage-admin.vercel.app
```

(Comma-separate if there is more than one.) Then redeploy the backend.

Symptom if you skip it: the login page loads fine, but signing in does nothing and
the browser console shows a CORS error. That is not a bug in the dashboard.

## Changing which backend the website talks to

Edit `.env.production`:

```
VITE_API_BASE_URL=https://heritage-hospital-1.onrender.com
```

It is an **origin** — no trailing `/api`, no trailing slash. `src/api.ts` adds
`/api` for API calls and uses the bare origin for `/uploads` and the Socket.io
connection, so a `/api` suffix here would produce `/api/api/...` and 404 everything.

Rebuild after changing it — Vite bakes the value into the bundle; it is not read at
runtime. On Vercel/Netlify you can instead set `VITE_API_BASE_URL` as an environment
variable in the dashboard, which overrides the file.

## What is different in the browser vs the .exe

Nothing functional. The only Electron-specific API is `window.HERITAGE.apiUrl`, and
`src/api.ts` reads it with `?.`, so in a browser it is simply absent and the build
falls back to `VITE_API_BASE_URL`. There are no native menus, no file-system access,
and no other Electron calls to guard.

## Local development

```bash
npm run dev          # http://localhost:5173, proxies /api to localhost:5000
```

In dev neither `window.HERITAGE` nor `VITE_API_BASE_URL` is set, so `API_ORIGIN` is
empty and Vite's proxy forwards `/api`, `/uploads` and `/socket.io` to the backend —
the dashboard stays same-origin and there is no CORS to configure.
