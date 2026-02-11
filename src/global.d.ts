/**
 * Global type definitions for PreAlpha
 */

/**
 * Runtime environment variables injected into HTML at build time
 * These are set via window.__PREALPHA_ENV__ in the built index.html
 */
interface Window {
  __PREALPHA_ENV__?: Record<string, string | undefined>;
}

/**
 * Development environment variables (available via process.env in Bun dev server)
 */
declare namespace NodeJS {
  interface ProcessEnv {
    API_BASE_URL?: string;
    WALLETCONNECT_PROJECT_ID?: string;
    WEB_PORT?: string;
    NODE_ENV?: string;
  }
}
