/**
 * Centralized DEMO_MODE detection.
 * Use DEMO_MODE for server-side code, DEMO_MODE_CLIENT for client components.
 * Req 11.2
 */

/** Server-side: reads DEMO_MODE env var directly */
export const DEMO_MODE = process.env.DEMO_MODE === 'true'

/** Client-side: reads NEXT_PUBLIC_DEMO_MODE (set from DEMO_MODE via next.config.ts) */
export const DEMO_MODE_CLIENT = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
