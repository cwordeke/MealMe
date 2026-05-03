/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected via `vite.config.ts` define from `MAPBOX_API_KEY` in `.env` */
  readonly MAPBOX_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
