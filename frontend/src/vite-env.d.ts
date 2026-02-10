/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsIdApi {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
  prompt(): void;
}

interface Window {
  google?: {
    accounts?: {
      id?: GoogleAccountsIdApi;
    };
  };
}
