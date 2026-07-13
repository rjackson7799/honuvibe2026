/**
 * JP fields the translate assist can machine-fill. Session-local UI state
 * only — the "machine translated" tag clears as soon as a human edits the
 * field, and nothing persists until the normal save.
 */
export type MachineField = 'title_jp' | 'description_jp' | 'body_jp';
