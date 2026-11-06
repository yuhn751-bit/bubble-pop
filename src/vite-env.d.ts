/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to "1" only by the offline desktop/Android shell build. */
  readonly VITE_OFFLINE_SHELL?: string;
}
