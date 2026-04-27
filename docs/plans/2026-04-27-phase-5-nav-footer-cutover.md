# Phase 5 — Marketing Nav + Footer Cutover

> Sub-plan under `docs/plans/2026-04-26-marketing-rebuild.md` (Phase 5 row).

## Context

Phase 4 just landed (`7562f2c` + `b0f5e4b` + `c226fcd` + `ae6e485` + `88b9f4a`). The umbrella plan's Phase 5 row reads "Nav + Footer cutover (UserMenu integration polish, mobile menu polish)." On entry, it looked like Phase 5 still needed: build `<MarketingMobileMenu>`, wire auth-aware `<UserMenu>` into `<MarketingNav>`, drop Honuhub from primary nav, reconcile footer to live routes, thread `variant="marketing"` into legacy `<UserMenu>` + `<LangToggle>`.

**Major finding from exploration:** the bulk of that work already shipped during the Phase 0/4 component commits. The legacy nav's null-route guard, the marketing nav's auth-aware UI, the mobile drawer, and the Sign In ↔ avatar dropdown are all live and functional. What remains is footer link reconciliation (real work), auth-state nav tests (real work), an explicit verification pass, plus a documentation update to record the divergence from the umbrella plan's approach.

### What's already in place (verified)

| Item | Location | Status |
|---|---|---|
| Legacy nav null-routes on marketing paths | `components/layout/nav-client.tsx:38,61` (`isMarketingShellRoute`) | ✅ live |
| Conditional footer null-routes on marketing paths | `components/layout/conditional-footer.tsx:12-14` (`isMarketingPathWithLocale`) | ✅ live |
| `<MarketingNav>` server shell | `components/marketing/nav/marketing-nav.tsx` | ✅ live (5 links: learn / explore / partnerships / about / contact — Honuhub already absent) |
| `<MarketingNavClient>` with scroll state | `components/marketing/nav/marketing-nav-client.tsx` | ✅ live, lang toggle + user menu in right cluster (lines 106–108) |
| `<MarketingMobileMenu>` drawer | `components/marketing/nav/marketing-mobile-menu.tsx` | ✅ live, body-scroll lock, Escape close, lang+user-menu footer row |
| `<MarketingUserMenu>` auth-aware | `components/marketing/nav/marketing-user-menu.tsx` | ✅ live, signed-out → teal Sign In pill, signed-in → avatar dropdown with Dashboard/Admin/Sign out |
| `<MarketingLangToggle>` | `components/marketing/nav/marketing-lang-toggle.tsx` | ✅ live |

### Decision: variant strategy

The umbrella plan called for `variant="marketing"` threaded through legacy `<UserMenu>` and `<LangToggle>`. Reality shipped parallel marketing-namespaced components (`MarketingUserMenu`, `MarketingLangToggle`) styled against `--m-*` tokens. **Accept the divergence.** Refactoring would touch the legacy nav, churn ~280 lines, and risk visual regressions across auth shell routes for negligible benefit. Record the deviation in the umbrella plan as a known duplication; defer consolidation to a future cleanup pass if it ever becomes painful.

## Scope (what Phase 5 will actually do)

1. **Footer link reconciliation** — drop dead / redirect-bound destinations now so Phase 6's redirect work doesn't land users on 404 pages from the footer in the interim.
2. **Auth-state nav tests** — new test file covering signed-out / signed-in render branches of `<MarketingUserMenu>`.
3. **Verification pass** — manual e2e (login/logout cycle, mobile drawer at 414px) + automated suite still green.
4. **Documentation** — update the umbrella plan: mark Phase 5 ✅ done, note the variant-strategy divergence in the verification log row.

Out of scope: the Phase 6 redirect map (`/build`, `/community`, `/resources`, `/newsletter`, `/become-an-instructor`), social-link URL backfill (footer stubs `href="#"`), and the `<MarketingShell>` `-mt-14 md:-mt-16` margin hack.

## Files to modify

### 1. `components/marketing/footer/marketing-footer.tsx`

Apply the "drop dead/redirect-bound now" policy. Concrete edits:

- **Navigate column (lines 56–66)** — drop `/honuhub` (line 61) and `/community` (line 62). Honuhub already absent from primary nav per umbrella decision; `/community` has no standalone route (Phase 6 redirects it to `/about#aloha`).
- **Resources column (lines 68–77)** — rewrite `/newsletter` (line 74) to `/#newsletter` (anchor on the home newsletter section, which is what Phase 6's redirect targets anyway). Keep `/learn/library`, `/glossary`, `/blog` — all are live routes.
- **Partners column (lines 79–87)** — keep `/partners/vertice-society` with `locale="ja"` pin. Vertice Society is JP-anchored per project context; the locale pin is intentional.
- **Legal column (89–97)** — no changes; all three routes (`/privacy`, `/terms`, `/cookies`) exist.
- **Social row (line 19–24)** — leave the four `href="#"` stubs untouched. URL backfill is out of scope; the Phase 4 plan never owned them either.

Also: drop or update i18n keys that become orphaned (`nav.honuhub`, `nav.community`) — leave the keys in `messages/{en,ja}.json` untouched if they're still used by `nav-client.tsx` (the legacy app nav still renders these on auth-shell routes); only remove from the marketing footer JSX.

### 2. `__tests__/marketing/marketing-user-menu.test.tsx` (NEW)

Smoke-test auth-state branches. Mock `@/lib/supabase/client`'s `createClient()` to return a stub with deterministic `auth.getSession()` resolution. Three scenarios:

- **Signed-out:** renders an anchor to `/learn/auth` with the `signIn` label and a `User` icon. No avatar button.
- **Signed-in (non-admin):** renders an avatar button with the user's initial; clicking opens a menu with Dashboard + Sign Out items, no Admin link.
- **Signed-in (admin):** the menu also renders an Admin link to `/admin`.

Reference patterns: `__tests__/marketing/primitives.test.tsx` (RTL setup) and `__tests__/components/library/AccessGate.test.tsx` (Supabase client mocking pattern). Use `vi.mock('@/lib/supabase/client', ...)` at module top.

### 3. `docs/plans/2026-04-26-marketing-rebuild.md`

- Flip the Phase 5 progress row to ✅ done with verified date.
- Append a verification-log row: type-check ✓, vitest count, build ✓ (if run), commit hash(es), and a note recording the variant-strategy divergence ("parallel `MarketingUserMenu` + `MarketingLangToggle` shipped instead of `variant=marketing` on legacy components — divergence accepted, no consolidation planned").

### 4. `__tests__/marketing/marketing-routes.test.ts` — likely no changes needed

The route-detection contract is unchanged. Confirm the existing 62 tests still cover the 6 marketing paths and the negative cases (Honuhub, community, blog, etc. all return false). If anything looks stale post-edit, surface it; otherwise skip.

## Build order (two commits, direct to main)

Per `feedback_git_workflow.md`: commit directly to main, no feature branches, no PRs.

**Commit A — footer reconciliation + tests:**
- Edit `components/marketing/footer/marketing-footer.tsx`
- Add `__tests__/marketing/marketing-user-menu.test.tsx`
- Run `pnpm type-check && pnpm test:run` — expect 334 → ~337 tests (add 3, ±). Both green.
- Commit with message: `feat(marketing): footer reconciliation + nav auth-state tests (Phase 5)`

**Commit B — umbrella-plan update:**
- Edit `docs/plans/2026-04-26-marketing-rebuild.md` (flip Phase 5 row + append verification-log row)
- Commit with message: `docs(marketing-rebuild): mark Phase 5 ✅ done in umbrella plan`

Mirrors the Phase 4 split (components/tests in commit A, plan-doc bump in commit B).

## Verification

### Automated (after commit A, before commit B)

```
pnpm type-check     # expect: tsc --noEmit clean
pnpm test:run       # expect: 337-ish tests pass across 35 files
```

(`pnpm verify:fast` hangs silently in this harness per the Phase 4 verification log — bypass it; run the two commands directly.)

### Manual e2e (browser, on a `pnpm dev` server)

1. **Logged-out marketing route:** visit `/`. Confirm the right-side nav cluster reads `[EN/JP toggle] [Sign In pill] [Get Started]`. Confirm Honuhub is absent from the primary nav.
2. **Sign in:** click Sign In, complete the `/learn/auth` flow with a known account. Land back on `/`. Confirm the right cluster now reads `[EN/JP toggle] [Avatar circle] [Get Started]`. Click the avatar — dropdown opens with name/email header, Dashboard, (Admin if admin), Sign Out. Click Sign Out — UI flips back to Sign In pill within ~1s (auth listener).
3. **Locale switch:** toggle EN→JP, confirm URL gains `/ja`, dropdown labels translate, no React hydration warnings.
4. **Mobile drawer (DevTools, 414px):** open hamburger. Confirm the drawer fills the viewport, scrolls the body lock, Escape closes it, and the footer row inside the drawer shows lang toggle on the left and user menu on the right. Sign-in/out cycle inside the drawer behaves identically.
5. **Footer reconciliation walk:** scroll to the footer on `/`, `/learn`, `/explore`, `/about`, `/contact`, `/partnerships`. Verify Honuhub and Community links are gone. Click Newsletter — confirm it scrolls to the home `#newsletter` section (not to a 404). Click each remaining link, confirm 200s on the response (no broken hrefs).
6. **Legacy app routes:** visit `/learn/dashboard` (must be authed) and `/admin` (must be admin). Confirm the legacy dark `<NavClient>` still renders on those (i.e., the marketing null-route gate didn't accidentally swallow them). Confirm `<ConditionalFooter>` still renders the legacy `<Footer />` on non-marketing public routes (`/blog`, `/glossary`, `/honuhub`, `/privacy`).

### What "done" looks like

- Both commits pushed to `main`
- `pnpm type-check` and `pnpm test:run` green
- All six manual e2e checks above pass
- Umbrella plan's Phase 5 row reads ✅ done with the new verification-log entry
- Phase 6 (cleanup: redirects, retire dead routes, prune `components/sections/*`, restore `<main>` padding) is now the next phase to pick up

## Critical files referenced

- `components/marketing/footer/marketing-footer.tsx` — the only component file that changes
- `components/marketing/nav/marketing-user-menu.tsx` — the component under test (no edits)
- `lib/marketing-routes.ts` — route-detection contract (no edits, but informs the footer reconciliation)
- `__tests__/marketing/primitives.test.tsx` — RTL pattern reference for the new test file
- `__tests__/components/library/AccessGate.test.tsx` — Supabase client mock pattern reference
- `docs/plans/2026-04-26-marketing-rebuild.md` — umbrella plan, Phase 5 row + verification log
