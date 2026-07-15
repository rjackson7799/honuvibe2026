// Shared field styling for the stepped admin editors (Vault, Partners), so
// their inputs stay visually identical. Hoisted out of the section files to
// keep each one readable.

export const labelClass = 'block text-xs text-fg-tertiary mb-1';

export const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal';

export const selectClass =
  'w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary focus:outline-none focus:border-accent-teal';

export const textareaClass = `${inputClass} resize-none`;

export const hintClass = 'text-xs text-fg-tertiary mt-1';
