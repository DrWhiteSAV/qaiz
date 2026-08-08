/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PROTALK_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
