# Vertice Landing Page Enhancements — Design Doc

**Date:** 2026-03-01
**Status:** Approved
**Author:** Claude + Ryan Jackson

---

## Context

The Vertice Society landing page (`/partners/vertice-society`) is built and functional with a split-panel layout, 6-field gated form, dual PDF downloads, and bilingual support. However, the page goes directly from heading to form with no persuasion content. The primary audience is Japanese Vertice Society members, and their main hesitation is "Is this worth my time?"

## Enhancements

### 1. Value Content Injection (Left Panel)

Add three content blocks between the heading block and form:

**A. 5-Week Overview Card**
- Compact card with `bg-bg-secondary` border, showing week numbers and topic names
- Icons per week using lucide-react (Brain, MessageSquare, Image, Zap, Bot)
- Fully bilingual via i18n

**B. 3 Benefit Bullets**
- Horizontal row on desktop, vertical stack on mobile
- Checkmark icons with concise text:
  - Small group workshops / 少人数制ワークショップ
  - Bilingual EN-JP support / バイリンガルサポート
  - Certificate of completion / 修了証書発行

**C. Endorsement Line**
- Italic text: "Vertice Societyが推薦するAI教育プログラム"
- Uses `text-fg-tertiary` for understated credibility
- Subtle separator above

### 2. Right Panel: Animated Ocean Gradient

- Slow-shifting gradient using `background-size: 200% 200%` with 30s keyframe cycle
- Colors: light teal/blue tones from existing ocean tokens
- Static fallback for `prefers-reduced-motion: reduce`

### 3. JP Default Locale

- Middleware redirect: `/partners/vertice-society` → `/ja/partners/vertice-society` when no locale cookie
- Footer link updated to point to `/ja/partners/vertice-society` directly

### 4. No Breaking Changes

The split-panel layout, form fields, API route, email system, and confirmation screen remain unchanged. All enhancements are additive.

## Files to Modify

- `components/partners/vertice-page-content.tsx` — Add value content blocks, animated gradient
- `styles/globals.css` — Add ocean gradient keyframe animation
- `messages/en.json` — Add overview, benefits, endorsement translations
- `messages/ja.json` — Add overview, benefits, endorsement translations
- `middleware.ts` — Add JP redirect rule for Vertice path
- `components/layout/footer.tsx` — Update link to `/ja/partners/vertice-society`
