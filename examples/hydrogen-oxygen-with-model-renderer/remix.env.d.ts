/// <reference types="@remix-run/dev" />
/// <reference types="@shopify/remix-oxygen" />
/// <reference types="@shopify/oxygen-workers-types" />

import type {WithCache} from '@shopify/hydrogen';
import type {Storefront} from '~/lib/type';
import type {HydrogenSession} from '~/lib/session.server';

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
  }
}

/**
 * Declare local additions to `AppLoadContext` to include the session utilities we injected in `server.ts`.
 */
declare module '@shopify/remix-oxygen' {
  export interface AppLoadContext {
    waitUntil: ExecutionContext['waitUntil'];
    session: HydrogenSession;
    storefront: Storefront;
    env: Env;
  }
}

// Needed to make this file a module.
export {};
