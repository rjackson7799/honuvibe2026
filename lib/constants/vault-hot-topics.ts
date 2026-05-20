/**
 * Curated "hot topics" shown as filter chips on the Learn page Vault preview.
 * Each chip links to /learn/vault?tag=<encoded>. For the link to land on real
 * content, the corresponding tag string must exist on at least one published
 * Vault item (admin tagging task).
 */
export const VAULT_HOT_TOPICS = [
  'Claude',
  'Obsidian',
  'NotebookLM',
  'Hermes',
  'AI Agents',
  'Workflows',
] as const;
