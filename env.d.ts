/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly VITE_MEMBER_ORIGIN: string
  readonly VITE_MCS_ORIGIN: string
  readonly VITE_JOB_ORIGIN: string
  readonly VITE_OPEN_WEBVIEW_DEVTOOLS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
