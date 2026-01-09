/**
 * Web Adapter for WordPlay Game Engine
 *
 * This module is now a thin compatibility layer that re-exports the
 * BrowserAdapter implementation. The browser adapter is the single
 * source of truth for all web environments.
 *
 * Existing imports of `WebAdapter` / `createWebAdapter` continue to work,
 * but new web code is encouraged to import from `browserAdapter.ts`
 * directly to avoid confusion.
 */

export {
  BrowserAdapter as WebAdapter,
  createBrowserAdapter as createWebAdapter,
  getBrowserGameDependencies as getWebGameDependencies,
  validateWordBrowser as validateWordWeb,
  scoreMovesBrowser as scoreMovesWeb
} from './browserAdapter';