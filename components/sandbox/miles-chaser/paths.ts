// Route helpers for the MilesChaser demo. Every internal navigation goes
// through mcHref so nothing can escape /sandbox/miles-chaser (enforced by
// the boundary scan test).
export const MC_BASE = '/sandbox/miles-chaser';
export const mcHref = (path: string) => `${MC_BASE}${path === '/dashboard' ? '' : path}`;
// dashboard lives at MC_BASE itself; /trips → /sandbox/miles-chaser/trips, etc.
