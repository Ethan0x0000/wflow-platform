interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_BASE_API: string;
  readonly VITE_PROXY: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
