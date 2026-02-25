import type { Locale } from './types';

// ─── Brand Constants ────────────────────────────────────────
const BRAND = {
  teal: '#5eaaa8',
  gold: '#b68d40',
  bgLight: '#ffffff',
  bgGray: '#f8f9fa',
  bgFooter: '#1a1f2e',
  textPrimary: '#1a1a2e',
  textSecondary: '#4a4a6a',
  textWhite: '#ffffff',
  borderLight: '#e8e8ef',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai',
} as const;

// ─── Base layout wrapper ────────────────────────────────────
export function baseLayout(options: {
  locale: Locale;
  preheader?: string;
  body: string;
}): string {
  const { locale, preheader, body } = options;
  const isJP = locale === 'ja';
  const fontFamily = isJP
    ? "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif"
    : "'DM Sans', Helvetica, Arial, sans-serif";
  const bodyLineHeight = isJP ? '1.75' : '1.6';

  return `<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>HonuVibe.AI</title>
  <!--[if mso]>
  <style>body, table, td { font-family: Helvetica, Arial, sans-serif !important; }</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgGray};font-family:${fontFamily};line-height:${bodyLineHeight};color:${BRAND.textPrimary};-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgGray};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Inner card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${BRAND.bgLight};border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:3px solid ${BRAND.teal};text-align:center;">
              <span style="font-family:Georgia,'DM Serif Display',serif;font-size:24px;font-weight:400;color:${BRAND.textPrimary};letter-spacing:-0.01em;">HonuVibe</span><span style="font-family:Georgia,'DM Serif Display',serif;font-size:24px;font-weight:400;color:${BRAND.teal};">.AI</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND.bgFooter};padding:24px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textWhite};opacity:0.7;">
                ${isJP ? 'ハワイからアロハの心を込めて' : 'Made in Hawaii with Aloha'}
              </p>
              <p style="margin:0 0 12px;font-size:12px;color:${BRAND.textWhite};opacity:0.45;">
                &copy; ${new Date().getFullYear()} HonuVibe.AI
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${BRAND.siteUrl}" style="color:${BRAND.teal};text-decoration:none;">honuvibe.ai</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${BRAND.siteUrl}/${isJP ? 'ja/' : ''}learn" style="color:${BRAND.teal};text-decoration:none;">${isJP ? 'コース' : 'Courses'}</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${BRAND.siteUrl}/${isJP ? 'ja/' : ''}contact" style="color:${BRAND.teal};text-decoration:none;">${isJP ? 'お問い合わせ' : 'Contact'}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Reusable content primitives ────────────────────────────

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'DM Serif Display',serif;font-size:22px;font-weight:400;color:${BRAND.textPrimary};line-height:1.3;">${text}</h1>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:${BRAND.textSecondary};line-height:1.6;">${text}</p>`;
}

export function ctaButton(options: { href: string; label: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${BRAND.teal};border-radius:8px;">
      <a href="${options.href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${BRAND.textWhite};text-decoration:none;font-family:Helvetica,Arial,sans-serif;">${options.label}</a>
    </td>
  </tr>
</table>`;
}

export function divider(): string {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid ${BRAND.borderLight};" />`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 12px 6px 0;font-size:13px;font-weight:600;color:${BRAND.textPrimary};white-space:nowrap;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:13px;color:${BRAND.textSecondary};vertical-align:top;">${value}</td>
</tr>`;
}

export function detailsTable(rows: Array<{ label: string; value: string }>): string {
  const filteredRows = rows.filter((r) => r.value && r.value !== '—');
  if (filteredRows.length === 0) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border:1px solid ${BRAND.borderLight};border-radius:8px;overflow:hidden;">
  <tbody style="background-color:${BRAND.bgGray};">
    ${filteredRows.map((r) => detailRow(r.label, r.value)).join('')}
  </tbody>
</table>`;
}

export function accentBanner(text: string): string {
  return `<div style="background-color:${BRAND.teal};color:${BRAND.textWhite};padding:16px 24px;border-radius:8px;text-align:center;margin:0 0 24px;">
  <p style="margin:0;font-size:15px;font-weight:600;">${text}</p>
</div>`;
}
