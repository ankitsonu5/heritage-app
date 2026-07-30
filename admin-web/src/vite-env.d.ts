/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute origin of the backend, e.g. https://heritage-hospital-1.onrender.com —
   * no trailing /api, and no trailing slash. Set in .env.production so the hosted
   * web build knows where the API is; left unset in dev, where Vite proxies
   * instead. Ignored by the .exe, which gets its URL from Electron at runtime.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
