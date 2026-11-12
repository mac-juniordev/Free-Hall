/**
 * Re-exported alias so route files can import from a dedicated module
 * without pulling in the whole auth middleware barrel.
 */
export { requireRole } from './auth';