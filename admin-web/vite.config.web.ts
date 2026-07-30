import { mergeConfig } from 'vite';

import base from './vite.config';

// The browser build: same app, same code, two overrides.
//
// It deliberately stays on Vite's `production` mode rather than a custom one, so
// that .env.production is the file that gets loaded — Vite only reads .env.<mode>,
// so `--mode web` would silently ignore .env.production and the deployed site would
// come up with no API URL at all.
export default mergeConfig(base, {
  // Served from a domain root, not from disk, so assets resolve absolutely.
  build: { outDir: 'dist-web', emptyOutDir: true },
  base: '/',
});
