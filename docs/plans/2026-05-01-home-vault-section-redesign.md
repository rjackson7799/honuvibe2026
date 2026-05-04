# Home — "Why We Built This" Vault Section Redesign

## Context

The "Why We Built This" section on the homepage is the primary subscription anchor for the Vault, but the current implementation undersells it: a flat dashboard mockup with mostly-empty lesson cards, a small text link as the only CTA, and no visual cue for the value props.

This redesign:
1. Adds an italic seafoam emphasis word ("*grows*") to the headline.
2. Inserts a 4-icon pill chip row that names the Vault's distinguishing features.
3. Adds a real primary CTA button (`Explore the Vault →`) and removes the redundant text link.
4. Replaces the dashboard mockup with a rich single-lesson view ("Building a Customer Research Agent with Claude") that demonstrates what subscribers actually get — header, metadata, "What you'll build" checklist, workflow diagram, system prompt code block, example output, and footer tags + actions.

Reference design (visual source of truth): `C:\Users\HCI\Downloads\vault-lesson-mockup_2.html` (file is in user's Downloads, not the repo).

Per resolved decisions:
- Use existing **DM Serif Display** (not Fraunces) — keeps the homepage typographically consistent with the rest of the site.
- Add new **`--m-seafoam-*` and `--m-code-bg*` tokens** to `styles/globals.css` so the mockup palette matches the reference exactly without disturbing the existing teal accent.
- Primary CTA links to `/learn` (same target as the existing text link).
- New component lives at `components/marketing/home/vault-lesson-mockup.tsx`.

---

## Files to modify

| File | Change |
|---|---|
| `styles/globals.css` | Add seafoam + code-bg + teal-deep tokens to the marketing token block |
| `messages/en.json` | Restructure `home.vault_section` keys for the new shape (rich heading, chips, CTA, full lesson copy) |
| `messages/ja.json` | Mirror the new EN structure with JP copy (flagged for Mizuho review) |
| `components/marketing/home/vault-section.tsx` | Rewrite: rich heading, chips, button CTA, lesson mockup; delete old `VaultPanel` and footer text link |
| `components/marketing/home/vault-lesson-mockup.tsx` | **New** — port of reference HTML to React + Tailwind |
| `__tests__/marketing/home/home-sections.test.tsx` | Update the `VaultSection` test (existing assertions on "Tool Use Basics" / "API Integration" no longer apply) |

No changes to `tailwind.config.*`, font config, routing, or `lib/marketing-routes.ts`.

---

## Reusable building blocks (already in the repo)

- `Section` (`variant="sand"`), `Container`, `Overline` (`tone="coral"`), `SectionHeading` — `components/marketing/primitives/`
- `Button` (variant `primary-teal`, size `md`, `withArrow`, `href`) — `components/marketing/primitives/button.tsx`
- `BrowserFrame` (props `url`, `secure`, `height="auto"`, `className`) — `components/marketing/primitives/browser-frame.tsx` — already wraps the existing mockup; reuse for the new lesson view with `url="vault.honuvibe.ai/library/real-world/customer-research-agent"`.
- `lucide-react` icons — already installed (`v0.575.0`). Use named imports:
  - Chips: `Infinity`, `Sparkles`, `Workflow`, `Globe`
  - Lesson: `Lock`, `Clock`, `Star`, `Globe`, `Bookmark`, `FileText`, `Search`, `Tag`, `FileOutput`, `Copy`, `ArrowRight`, `CheckCircle`, `ChevronRight`
- `next-intl` `t.rich(...)` for embedding the `<em>` tag inside the heading translation. The existing test mock at `__tests__/marketing/home/home-sections.test.tsx:37` already supports `t.rich`, so no test plumbing changes are needed.

---

## Implementation details

### 1. New design tokens (`styles/globals.css`)

Add inside the existing `:root` marketing block (alongside the other `--m-*` tokens):

```css
/* Vault lesson palette (reference-exact) */
--m-seafoam: #4FA89C;
--m-seafoam-light: #A8D5C9;
--m-seafoam-pale: #E8F2EE;
--m-seafoam-faint: #F4F9F6;
--m-teal-deep: #0A2929;
--m-teal-dark-2: #0F3D3D; /* avoid clobbering existing --m-accent-teal-dark */
--m-coral-pale: #FBE8E0;  /* if not already present — verify before adding */
--m-code-bg: #0E2828;
--m-code-bg-light: #143434;
--m-code-text: #D4E0D8;
--m-code-accent: #82C7B7;
--m-code-string: #F4C28A;
--m-code-comment: #5A6A6A;
--m-code-keyword: #94B8AD;
```

Verify before adding any token whose name might collide with existing ones (`--m-coral-pale` in particular). Use `var(--m-...)` directly via Tailwind arbitrary values throughout the new component — do **not** extend `tailwind.config`.

### 2. i18n message restructure (`messages/en.json` → `home.vault_section`)

Replace the entire `home.vault_section` block. Keep `overline` as-is. Convert `heading` to a rich-tag string. Add chip + CTA + lesson keys. Drop topic/lesson/library_label/chapter_title/lessons_count/completed_label/duration_label/caption_lead/caption_cta.

```json
"vault_section": {
  "overline": "Why We Built This",
  "heading": "A learning library that <em>grows</em> with you.",
  "body": "Most AI courses leave you with a certificate and nothing else. The Vault is different — it's an always-on library of lessons, frameworks, prompt libraries, and real-world workflows that evolves alongside AI itself. Access it on your timeline, revisit it whenever you need a refresh.",
  "chip_always_on": "Always-on access",
  "chip_prompts": "Prompt libraries",
  "chip_workflows": "Real-world workflows",
  "chip_bilingual": "EN / JP",
  "cta_explore": "Explore the Vault",

  "lesson": {
    "browser_url_path": "/library/real-world/customer-research-agent",
    "breadcrumb_root": "Library",
    "breadcrumb_section": "Real-World Projects",
    "breadcrumb_current": "Customer Research Agent",
    "eyebrow_pill": "Real-World Project",
    "eyebrow_meta": "Updated 3 days ago · by Mizuho H.",
    "title": "Building a <em>Customer Research</em> Agent with Claude",
    "subtitle": "A reusable workflow for synthesizing interview transcripts into actionable insights — runnable in Claude in under five minutes, with examples in English and 日本語.",
    "meta_duration": "12 min lesson",
    "meta_difficulty": "Intermediate",
    "meta_locale": "EN / 日本語",
    "save_button": "Saved",

    "build_title": "What you'll build",
    "build_1": "A multi-step Claude workflow that processes raw interview transcripts",
    "build_2": "Auto-tagging that surfaces themes, pain points, and implicit needs",
    "build_3": "A one-page synthesis brief, ready to share with your team",
    "build_4": "Export to Notion, Google Docs, or your team wiki",

    "workflow_title": "The workflow",
    "step_1_label": "Input", "step_1_desc": "Raw interview transcripts",
    "step_2_label": "Extract", "step_2_desc": "Themes, quotes, signals",
    "step_3_label": "Tag", "step_3_desc": "Pain points & needs",
    "step_4_label": "Synthesize", "step_4_desc": "One-page insights brief",

    "prompt_title": "The prompt",
    "prompt_lang_label": "Claude · System Prompt",
    "prompt_copy": "Copy",

    "output_title": "Example output",
    "output_tag": "Claude's response",
    "output_pain_title": "Top pain points",
    "output_pain_1_title": "Tool switching breaks morning workflow",
    "output_pain_1_quote": "I lose 20 minutes every morning just opening the same six tabs across two browsers.",
    "output_pain_2_title": "Onboarding new team members takes too long",
    "output_pain_2_quote": "We've documented things three times and people still ask the same questions in week one.",
    "output_pain_3_title": "Friday status reports are entirely manual",
    "output_pain_3_quote": "Every week I rebuild the same dashboard by hand. There has to be a better way.",
    "output_themes_title": "Recurring themes",
    "output_theme_1": "Time lost to context-switching",
    "output_theme_1_count": "7 mentions",
    "output_theme_2": "Documentation that doesn't get used",
    "output_theme_2_count": "4 mentions",
    "output_theme_3": "Manual reporting overhead",
    "output_theme_3_count": "3 mentions",

    "tag_research": "Customer Research",
    "tag_claude": "Claude",
    "tag_workflow": "Workflow",
    "tag_real": "Real Project",
    "footer_copy_prompt": "Copy Prompt",
    "footer_open_in_claude": "Open in Claude"
  }
}
```

The system-prompt code body (~20 lines of formatted markdown with `# Role / # Task / # Format / # Transcript`) should be hard-coded as a structured JSX block inside the component (not in messages.json) — it's a code sample, not localizable copy.

### 3. JP messages (`messages/ja.json`)

Mirror the same key structure. Use the suggested chip translations from the task brief:
- `chip_always_on`: "いつでもアクセス"
- `chip_prompts`: "プロンプトライブラリ"
- `chip_workflows`: "実践的ワークフロー"
- `chip_bilingual`: "EN / JP"
- `cta_explore`: "Vaultを見る"

For the heading emphasis: JP heading does not translate well with mid-sentence italics. Apply the seafoam color via the `<em>` tag but render `<em>` with **no italic** when the locale is JP — handled in the component's `t.rich` call by switching style based on `useLocale()`. Concretely: pass `em: (chunks) => <span className={cn('text-[var(--m-seafoam)]', locale === 'en' && 'italic')}>{chunks}</span>`.

Mark the JP block with a `// confirm with Mizuho` comment in the PR description (the file format is JSON, so the note lives in the commit message rather than the file).

### 4. New component: `components/marketing/home/vault-lesson-mockup.tsx`

Server component (no `'use client'`). One default-exported function `VaultLessonMockup()`. Internal layout:

```
<div className="bg-white px-6 py-9 md:px-14 md:py-9">
  <span className="block w-8 h-0.5 bg-[var(--m-seafoam)] opacity-60 rounded mb-3.5" />
  <Breadcrumb />
  <Header />          {/* eyebrow row, title (rich, with <em>), subtitle, meta row + Save button */}
  <BuildSection />    {/* h2 + 2-col checklist of CheckCircle items */}
  <WorkflowSection /> {/* h2 + 4-step horizontal grid with seafoam-faint→cream gradient bg */}
  <PromptSection />   {/* h2 + dark code block with header bar + <pre> tokenized prompt */}
  <OutputSection />   {/* h2 + soft-cream card with absolutely-positioned tag, pain points, themes */}
  <Footer />          {/* tags row left, two buttons right; border-top */}
</div>
```

Render each subsection as inline JSX inside the same file (do not split into 8 files). Pull all copy from `t = useTranslations('home.vault_section.lesson')`. Use `t.rich('title', { em: ... })` for the seafoam italic word.

The whole component is wrapped by `BrowserFrame` from the parent section, not from inside — keep `VaultLessonMockup` framework-free so it can be reused or storybook'd.

Tailwind class strategy: use `var(--m-seafoam)` etc. via `bg-[var(--m-seafoam)]`, `text-[var(--m-teal-deep)]`, `border-[var(--m-seafoam-light)]`, etc. Use `font-[var(--font-dm-serif)]` for the lesson title and section titles (inline style or Tailwind arbitrary). Use `font-[var(--font-jetbrains-mono)]` on the `<pre>` and `code-lang` label.

Code block syntax tokens: render the prompt as JSX with hand-marked `<span>` color classes mirroring `tk-comment / tk-string / tk-keyword / tk-accent / tk-var`:

```tsx
<pre className="px-6 py-5 overflow-x-auto text-[13.5px] leading-[1.65] text-[var(--m-code-text)] font-[var(--font-jetbrains-mono)]">
  <span className="italic text-[var(--m-code-comment)]"># Role</span>{'\n'}
  You are a <span className="font-medium text-[var(--m-code-keyword)]">senior product researcher</span> ...
  ...
</pre>
```

The `<em>` element in lesson title rendering uses the same locale-aware approach as the section heading (italic in EN, color-only in JP).

### 5. Rewrite `components/marketing/home/vault-section.tsx`

```tsx
import { useLocale, useTranslations } from 'next-intl';
import { Globe, Infinity, Sparkles, Workflow } from 'lucide-react';
import {
  BrowserFrame,
  Button,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { VaultLessonMockup } from './vault-lesson-mockup';
import { cn } from '@/lib/utils';

export function HomeVaultSection() {
  const t = useTranslations('home.vault_section');
  const locale = useLocale();

  const chips = [
    { icon: Infinity, label: t('chip_always_on') },
    { icon: Sparkles, label: t('chip_prompts') },
    { icon: Workflow, label: t('chip_workflows') },
    { icon: Globe, label: t('chip_bilingual') },
  ];

  return (
    <Section variant="sand">
      <Container>
        {/* Centered text block */}
        <div className="mx-auto max-w-[720px] text-center">
          <Overline tone="coral" className="mb-3.5">{t('overline')}</Overline>
          <SectionHeading className="mb-5">
            {t.rich('heading', {
              em: (chunks) => (
                <span className={cn('text-[var(--m-seafoam)]', locale === 'en' && 'italic')}>
                  {chunks}
                </span>
              ),
            })}
          </SectionHeading>
          <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('body')}
          </p>

          {/* Chip row */}
          <ul className="mt-12 flex flex-wrap justify-center gap-3" role="list">
            {chips.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--m-seafoam)]/30 bg-white px-4 py-2 text-[14px] font-medium text-[var(--m-ink-secondary)]"
              >
                <Icon size={16} className="text-[var(--m-seafoam)]" strokeWidth={2} />
                {label}
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <div className="mt-6">
            <Button href="/learn" variant="primary-teal" size="md" withArrow>
              {t('cta_explore')}
            </Button>
          </div>
        </div>

        {/* Lesson mockup */}
        <div className="mx-auto mt-20 max-w-[1080px]">
          <BrowserFrame
            url={`vault.honuvibe.ai${t('lesson.browser_url_path')}`}
            secure
            height="auto"
            className="rounded-[14px] shadow-[0_24px_60px_-12px_rgba(15,61,61,0.12),0_8px_24px_-8px_rgba(15,61,61,0.08)]"
          >
            <VaultLessonMockup />
          </BrowserFrame>
        </div>
      </Container>
    </Section>
  );
}
```

The old `VaultPanel` function and the footer caption link are deleted entirely — no shim, no fallback.

### 6. Test update (`__tests__/marketing/home/home-sections.test.tsx`)

Replace the `VaultSection` test (lines 122–129) with assertions that match the new copy:

```tsx
it('VaultSection shows headline, all four chips, primary CTA, and lesson mockup', () => {
  render(<HomeVaultSection />);
  expect(
    screen.getByRole('heading', { name: /A learning library that grows with you\./ }),
  ).toBeInTheDocument();
  expect(screen.getByText('Always-on access')).toBeInTheDocument();
  expect(screen.getByText('Prompt libraries')).toBeInTheDocument();
  expect(screen.getByText('Real-world workflows')).toBeInTheDocument();
  const cta = screen.getByRole('link', { name: /Explore the Vault/i });
  expect(cta).toHaveAttribute('href', '/learn');
  expect(
    screen.getByRole('heading', { name: /Building a Customer Research Agent with Claude/ }),
  ).toBeInTheDocument();
  expect(screen.getByText("What you'll build")).toBeInTheDocument();
  expect(screen.getByText('Synthesize')).toBeInTheDocument();
});
```

The "renders every section without console.error" test at line 177 is unchanged but will exercise the new component.

---

## Verification

1. `pnpm test home-sections` — confirm the updated test and the no-console-error suite pass.
2. `pnpm typecheck` — no `any`, strict mode clean.
3. `pnpm dev` and visit `/` — visually verify:
   - Headline shows "grows" in seafoam italic.
   - Four pill chips render in a centered wrapping row with seafoam icons.
   - "Explore the Vault →" button is the seafoam/teal primary; click goes to `/learn`.
   - Lesson mockup matches the reference at desktop width (1080px container, 14px corners, soft drop shadow).
   - Code block prompt is dark teal with monospace; "Copy" button visible top-right of code header.
   - Output card "CLAUDE'S RESPONSE" pill overlaps the top-left border of the card.
   - Footer row: 4 tags left, "Copy Prompt" + "Open in Claude →" buttons right.
4. Visit `/ja/` and verify:
   - JP heading emphasis word renders in seafoam **without italic**.
   - All four chips show JP labels.
   - CTA shows "Vaultを見る →".
5. Resize to ~375px and confirm chips wrap, lesson mockup remains readable (workflow grid may need to collapse to vertical at small widths — handle with `md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] grid-cols-1` on the workflow container).
6. Lighthouse mobile run — confirm LCP < 2.5s and total JS bundle stays under budget; the lesson mockup is server-rendered with no extra JS.

---

## Out of scope

- No A/B test instrumentation or Plausible event for the new CTA in this pass (the user can add `vault_cta_click` later if desired).
- No real "Saved" / "Copy Prompt" / "Open in Claude" interactivity — these are visual buttons only inside the marketing mockup. Mark them as `<button type="button" aria-disabled>` or use `<span role="button">` with no handler. The `<button>` form is fine since it's wrapped in a static landing-page section.
- No dark-mode override of the new tokens. The marketing site uses the cream/sand light palette consistently; CLAUDE.md's "dark mode default" applies to the app shell, not marketing pages.
- No JP translation review — Mizuho confirmation tracked in PR/commit description.
