/**
 * Contrast guard for partner-supplied brand colors.
 *
 * Partner `primary_color` is arbitrary hex typed into the admin editor. The
 * join card renders it as an accent on BOTH themes (dark is default, light is
 * secondary), so a color that reads fine on a partner's own white site can be
 * invisible on ours. Anything that fails the bar falls back to the HonuVibe
 * teal token rather than shipping unreadable branding.
 *
 * Bar: WCAG 2.1 AA non-text contrast, 3:1, against the darkest and lightest
 * card surfaces we actually paint (`--bg-secondary` in each theme).
 */

const DARK_SURFACE = '#0d1220';
const LIGHT_SURFACE = '#ffffff';

/** WCAG AA for non-text UI components and graphical objects. */
const MIN_ACCENT_CONTRAST = 3;

export function parseHexColor(value: string | null | undefined): [number, number, number] | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colors, or null if either is unparseable. */
export function contrastRatio(a: string, b: string): number | null {
  const rgbA = parseHexColor(a);
  const rgbB = parseHexColor(b);
  if (!rgbA || !rgbB) return null;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The partner color if it is safe to paint on both themes, otherwise null.
 * Callers substitute `var(--accent-teal)` for null.
 */
export function safeAccentColor(value: string | null | undefined): string | null {
  const rgb = parseHexColor(value);
  if (!rgb) return null;
  const hex = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

  const onDark = contrastRatio(hex, DARK_SURFACE);
  const onLight = contrastRatio(hex, LIGHT_SURFACE);
  if (onDark === null || onLight === null) return null;

  return onDark >= MIN_ACCENT_CONTRAST && onLight >= MIN_ACCENT_CONTRAST ? hex : null;
}
