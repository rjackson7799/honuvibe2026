═══════════════════════════════════════════════════════════════════════════════
BRIEF 3 of 5 — Vault membership copy  ·  paste into Fable 5 AFTER Brief 1
═══════════════════════════════════════════════════════════════════════════════

You are writing conversion copy for HonuVibe's **Vault** — a recurring membership ($99/mo)
to an always-on, bilingual AI content library. **Apply the Voice Guide you wrote in Brief 1**
(Profile A — Education). If it isn't in this session, paste it above this brief first.

Two surfaces: (1) the marketing sell block where a visitor decides to subscribe, and (2) the
in-app paywall a member hits when they reach locked content. Writing task only; current strings
are below. Rewrite the ENGLISH sharper and consistent, and write NATIVE Japanese for each. Use
ACTION voice for CTAs and paywall moments, EDITORIAL voice for the narrative headings.

────────────────────────────────────────────────────────────────────────────────
HARD CONSTRAINTS
────────────────────────────────────────────────────────────────────────────────
- PRICES ARE FIXED — do NOT change them: Vault **$99/month**, Honu Community **$29/month**.
  Don't touch any price or price_unit value. Your job is to make the surrounding copy *justify*
  $99 (anchor it against the $1,250+ courses, lead with "Community included," and the depth of
  a {count}-lesson bilingual library that grows monthly).
- Preserve interpolation tokens EXACTLY: {count} {minutes} {number}. Keep them in EN and JP.
- STANDARDIZE the Japanese name of "The Vault." It's currently inconsistent — ヴォルト on the
  marketing cards vs ヴォールト in the paywall. Pick ONE rendering (or keep the English "Vault")
  and use it in every JP string you write. State your choice in a one-line note at the top.
- NO fabricated social proof. Do not invent member counts, ratings, or testimonials. Where a
  social-proof line is requested, write it around something verifiable (library size via {count},
  or bilingual scale) and note what real number must fill it.
- Button/label copy stays short. Plain text only — no markdown, HTML, or emoji.
- Every item needs EN and JP, JP written natively (not translated).

────────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT — one block per string, grouped A / B / C
────────────────────────────────────────────────────────────────────────────────
key: <the key path>
EN: <english>
JP: <japanese>
note: <one line: what you changed and why>

════════════════════════════════════════════════════════════════════════════════
A. THE SELL CARDS — the pricing block where visitors subscribe (messages → learn.chapter_vault.*)
   Rewrite EN + write JP. Prices stay fixed; sharpen everything around them.
════════════════════════════════════════════════════════════════════════════════
key: learn.chapter_vault.intro            CURRENT EN: "An always-on AI library you keep coming back to."
key: learn.chapter_vault.includes_label   CURRENT EN: "Honu Community included"   (badge on the Vault card)

The VAULT card ($99/mo — the star):
key: learn.chapter_vault.vault.tagline    CURRENT EN: "Master AI at your own pace."
key: learn.chapter_vault.vault.price_note CURRENT EN: "Cancel anytime · all future Vault content included"
key: learn.chapter_vault.vault.bullet_1   CURRENT EN: "{count} lessons — videos, articles, guides, templates, tools, recordings"   (keep {count})
key: learn.chapter_vault.vault.bullet_2   CURRENT EN: "Bilingual EN / 日本語 toggle"
key: learn.chapter_vault.vault.bullet_3   CURRENT EN: "New content drops every month"
key: learn.chapter_vault.vault.bullet_4   CURRENT EN: "Searchable & bookmark-able"
key: learn.chapter_vault.vault.cta        CURRENT EN: "Join the Vault"
key: learn.chapter_vault.vault.social_proof   NEW — one honest credibility line for the Vault card (NO invented
                                              numbers). Frame it on the verifiable: the bilingual EN/JP library
                                              scale, or a {count} token we wire to a real figure. Note what data fills it.

The HONU COMMUNITY card ($29/mo — the anchor; sharpen, keep it clearly the lighter option):
key: learn.chapter_vault.community.tagline    CURRENT EN: "The place to keep learning."
key: learn.chapter_vault.community.price_note CURRENT EN: "14-day free trial · cancel anytime"
key: learn.chapter_vault.community.bullet_1   CURRENT EN: "Get answers direct from pros every month"
key: learn.chapter_vault.community.bullet_2   CURRENT EN: "New ready-to-use prompts and tools every week"
key: learn.chapter_vault.community.bullet_3   CURRENT EN: "Build EN + JP AI fluency at your pace"
key: learn.chapter_vault.community.bullet_4   CURRENT EN: "Members-only resources, always up to date"
key: learn.chapter_vault.community.cta        CURRENT EN: "Join the Community"

════════════════════════════════════════════════════════════════════════════════
B. THE PAYWALL — the blocked moment a member hits locked content. These are hardcoded in
   components today (English-only in places); we're moving them to i18n. Write EN + JP for all.
════════════════════════════════════════════════════════════════════════════════
Upsell banner (atop the browse grid for non-members):
key: vault.banner.title         CURRENT EN: "Unlock The Vault — $99/month"
key: vault.banner.desc          CURRENT EN: "The only AI learning platform with full English & Japanese content — 200+ tutorials, guides, and templates."
                                (prefer a {count} token or evergreen phrasing over a hardcoded "200+")
key: vault.banner.browse        CURRENT EN: "Browse courses →"

Unlock modal (opens when a locked card is clicked):
key: vault.modal.heading        CURRENT EN: "Unlock The Vault"
key: vault.modal.sub            CURRENT EN: "Get instant access to 200+ English & Japanese AI tutorials, guides, and templates."   (same note re: 200+)
key: vault.modal.divider        CURRENT EN: "or"
key: vault.modal.enroll_note    CURRENT EN: "Enroll in a course and get Vault access included for the duration of your enrollment."
key: vault.modal.browse         CURRENT EN: "Browse courses →"

Premium gate (full-page, on a locked premium item — messages → dashboard.*):
key: dashboard.vault_upsell_heading       CURRENT EN: "Unlock The Vault"
key: dashboard.vault_upsell_sub           CURRENT EN: "Get unlimited access to premium self-study videos, walkthroughs, and build-alongs."
key: dashboard.vault_upsell_or_enroll     CURRENT EN: "Or enroll in a course to get access included"
key: dashboard.vault_upsell_browse_courses CURRENT EN: "Browse Courses"

Gate feature chips — THESE 4 KEYS ARE MISSING and render as raw text today. Write short EN + JP
labels (each sits beside an icon; keep to ~2–3 words):
key: dashboard.vault_gate_videos     (icon: video)     — e.g. "Video walkthroughs"
key: dashboard.vault_gate_guides     (icon: book)      — e.g. "Step-by-step guides"
key: dashboard.vault_gate_downloads  (icon: download)  — e.g. "Templates & downloads"
key: dashboard.vault_gate_series     (icon: sparkles)  — e.g. "Multi-part series"

════════════════════════════════════════════════════════════════════════════════
C. SUPPORTING VAULT COPY — sharpen the decision moments (messages → learn.*). Rewrite EN + JP.
════════════════════════════════════════════════════════════════════════════════
Vault-decision FAQ answers:
key: learn.faq.a_2   CURRENT EN: "It's monthly. Cancel any time. The first 14 days are refundable if it's not for you."   (Q: how long does membership last?)
key: learn.faq.a_3   CURRENT EN: "Yes. The Vault library counts as foundational prep — many cohort students join the Vault first."   (Q: can I switch to a cohort later?)
key: learn.faq.a_6   CURRENT EN: "Start with the Vault's AI Foundations library. Three lessons in and you'll know what to do next."   (Q: what if I'm new to AI?)

The final Vault CTA band:
key: learn.start_tonight.body        CURRENT EN: "Start solo with the Vault, join a cohort, or bring HonuVibe to your community. The Vault is open 24/7 — even if it's 11:48 pm where you are."
key: learn.start_tonight.refund_line CURRENT EN: "14-day refund if the Vault isn't right for you."
key: learn.start_tonight.card_vault_cta  CURRENT EN: "Join"   (short — ≤ ~10 chars)

Risk-reversal on the path chooser:
key: learn.path_chooser.reassure     CURRENT EN: "Every path is cancel-anytime, with a 14-day refund on the Vault. Not sure? Start free with the open Vault content."

────────────────────────────────────────────────────────────────────────────────
CHECKPOINT GATE — read before you finish
────────────────────────────────────────────────────────────────────────────────
Output groups A–C in the block format above (with your JP-name choice noted at the top), then
STOP. Do not start Brief 4. End with: (1) one line on how you made $99 feel worth it, and
(2) verbatim to Ryan: "Run /usage to check spend, then switch to Sonnet to wire these into
messages/*.json + move the Vault banner/modal into i18n + add the missing gate keys, and run
pnpm verify:fast."
