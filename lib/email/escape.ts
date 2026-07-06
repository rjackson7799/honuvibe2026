/**
 * HTML-escape untrusted or model-generated text before interpolating it into
 * email HTML. The template primitives in ./templates insert strings raw, and
 * presenter summaries derive from respondent free-text + model output — both
 * untrusted — so every dynamic value passing into them must be escaped.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
