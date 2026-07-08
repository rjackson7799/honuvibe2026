# JA Translation Fix — Dashboard "The Vault" Nav + Heading

## Context

On the Japanese student dashboard (`/ja/learn`), the sidebar item for The Vault renders as **"The Vault"** in English, while every neighboring nav label (ダッシュボード, マイコース, コミュニティ, お支払い, プロフィール) is translated. Root cause: `messages/ja.json` has the `nav_vault` entry left as the English string — a missed translation, not a hardcoded string in the component.

The same problem exists for `heading_vault` (the H1 on `/ja/learn/vault`). The rest of the dashboard vault namespace (overline, filters, upsell sub, empty state) is correctly translated.

Marketing copy across `/ja/*` already uses **ヴォルト** (katakana) as the in-body translation of "Vault" — e.g. `ヴォルトに参加`, `ヴォルトの中身`, `ヴォルト — いつでも開いている学習ライブラリ`. We will align dashboard with that convention.

## Change

Edit [messages/ja.json](../../messages/ja.json) only — two single-line value updates inside the `dashboard` namespace:

- Line 1465 — `"nav_vault": "The Vault"` → `"nav_vault": "ヴォルト"`
- Line 1480 — `"heading_vault": "The Vault"` → `"heading_vault": "ヴォルト"`

Leave `vault_upsell_heading` ("The Vaultを解放") alone — it intentionally embeds the brand mark in a marketing line, which is a different register from a nav label.

No component, no English file, no other JA entries change. [components/learn/StudentNav.tsx](../../components/learn/StudentNav.tsx) is already wired correctly via `useTranslations('dashboard')` + `labelKey: 'nav_vault'` ([line 34](../../components/learn/StudentNav.tsx#L34), [line 85](../../components/learn/StudentNav.tsx#L85)).

## Files Touched

- `messages/ja.json` — 2 lines

## Verification

1. `pnpm dev`, open `http://localhost:3000/ja/learn` while signed in.
2. Confirm the sidebar item under マイコース reads **ヴォルト** (no longer "The Vault").
3. Navigate to `/ja/learn/vault`. Confirm the page H1 reads **ヴォルト**.
4. Switch language toggle to EN. Confirm `/learn` sidebar still reads "The Vault" and `/learn/vault` H1 still reads "The Vault" (English unchanged).
5. `pnpm build` — confirm no next-intl missing-key warnings introduced.
