# Preview Feedback — Screenshot Attachments Plan

**Status:** APPROVED rev 2 by Ryan, 2026-10-23, with the three decisions below answered. Not built. Rev 1 was externally reviewed ("revise before building"); every finding was checked and folded in (see "Review log" at the end). Builds on the shipped preview feedback feature (`docs/plans/2026-10-22-preview-feedback.md`, commits 8321582..582a952).

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or executing-plans), task by task, with TDD as each task specifies. Pause for Ryan's explicit approval of this plan, including the three decisions at the end, before building.

**Goal:** A reviewer can attach **one screenshot** to a feedback note. They take it themselves with their own OS tool, capturing only the part of the screen they mean. Ryan sees it as a thumbnail on the note in `/admin/studio/previews`.

**Spec (Ryan, 2026-10-23):**
- "A simple upload bucket where they can take a screenshot of the section of the screen they want to highlight."
- This deliberately reverses the original spec's "no screenshots".
- Still out of scope: automatic page capture, annotation or drawing, email alerts.

## How a reviewer uses it

| Device | Steps |
|---|---|
| **Windows** | **Win+Shift+S**, drag around the section, then **Ctrl+V** in the open feedback panel. A thumbnail appears. |
| **Mac** | **Cmd+Ctrl+Shift+4** (copies to the clipboard), then **Cmd+V** in the panel. |
| **Any desktop** | Click **Attach image** and pick a saved file, or drag a file onto the panel. |
| **Phone** | Take a normal screenshot, crop it in the phone's editor, then tap **Attach image** and choose it from Photos. |

The thumbnail has a **Remove** button. The screenshot is optional; a note still sends without one.

## Global constraints

- Migration **090** (`supabase/migrations/090_preview_feedback_images.sql`). 088 stays reserved for the unbuilt B4 plan; 089 is taken. Re-check `ls supabase/migrations` before building. Never touch, stage or replay the untracked `084_auth_email_security.sql`.
- pnpm only. Build and type-check need `NODE_OPTIONS=--max-old-space-size=8192`; tests don't.
- A large unrelated WIP sits in the working tree: stage only this plan's files.
- Destructive tests run on the **hosted test project only**. Prod is `zvfwtndbxshrtpwcwynw`.
- The widget stays one inline ES2019 script: ASCII-only, no `</script`/`<!--`, Shadow DOM, keystroke isolation, counter-zoom, right-edge tab. Expect it to grow by about 8–10 KB.
- Admin UI: tokens only, touch targets ≥ 44px.

## Locked decisions

| # | Decision | Why |
|---|---|---|
| S1 | **One image per note**, optional. | Keeps the UI, schema and limits simple. A second issue goes in a second note. |
| S2 | **The client compresses to keep uploads small.** It decodes with `createImageBitmap` or `<img>`, draws to `<canvas>`, and caps the long edge at 1600 px. It encodes JPEG at quality 0.82, then retries once at 0.6 if the result is over 1.5 MB. If it is still too big, it rejects with a clear message. This is an **optimisation only**; S5 is the guarantee. | Raw Retina and 4K PNG screenshots run 2–12 MB. |
| S3 | **The image travels with the note in one `multipart/form-data` request** to the existing feedback route: `payload` is today's JSON plus `submissionId`, and `image` is the file. There is no signed upload URL. This is **not atomic**: Storage and Postgres are separate systems, so S7 defines compensating cleanup plus reconciliation. | Reuses the cookie-gated route, and keeps "never read the body before the cookie is verified". |
| S4 | **The body cap depends on the content type.** JSON keeps 16 KB. Multipart gets **2 MB** and is read with a byte-capped reader before parsing; `request.formData()` is never called on an uncapped stream. Malformed multipart returns 400. So do duplicate `payload` or `image` fields, a `payload` that isn't a string, an `image` that isn't a File, and an empty image. | Unauthenticated or oversized bodies still can't be buffered, and parser errors never become 500s. |
| S5 | **The server decodes and re-encodes every image with `sharp`** (already a runtime dependency, used in 3 API routes). The pipeline is `sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error' })`. Metadata must show width and height ≤ 8000. Then `.rotate()` (applies EXIF orientation), resize to fit inside 1600×1600 without enlarging, and encode JPEG at quality 82. sharp drops all metadata unless asked to keep it. The output is **always JPEG**; anything sharp can't decode, or that breaks the limits, returns 400 `Unsupported image`. A 240 px **thumbnail** is generated in the same pass. | Magic bytes alone don't prove a file is a valid, bounded image: `FF D8 FF` can be followed by garbage. Re-encoding on the server makes "decodable, bounded, metadata-free" true even for a caller who bypasses the widget. |
| S6 | **Private bucket `preview-feedback-images`.** The file size limit is 2 MB, the only allowed type is `image/jpeg`, and there are **no storage policies** (service role only). Objects live at `<preview_id>/<submission_id>.jpg` and `<preview_id>/<submission_id>.thumb.jpg`. | Admin reads go only through S8. The prefix makes per-preview cleanup a list-and-delete (S11), **not** an automatic cascade. |
| S7 | **Idempotent submission plus compensating cleanup.** The widget creates a **`submissionId`** (`crypto.randomUUID()`, with a Math.random fallback) when a draft starts. It is stored in the draft, reused on every retry, and becomes the row's `id`. The route then runs: (1) if a row with that id already exists for this preview, return **201** (replay; covers "insert committed, response lost"); if it exists for another preview, return **409**; (2) upload both objects with `upsert: true` (a retry overwrites its own files); (3) insert the row; (4) on a unique violation, re-select and return 201 if it belongs to this preview; on any other **definite** insert error, re-check that no row exists and only then remove both objects, logging `[preview-feedback] cleanup_failed <path>` if removal fails; on an **ambiguous** failure such as a timeout or network error, **do not delete**, return 500 and leave the objects to reconciliation. | A lost response never deletes a saved note's image. Retries after the widget's 20 s timeout create no duplicate notes or images. Orphans can still happen (crash mid-request, failed cleanup), and S11 reconciliation removes them. |
| S8 | **All image reads go through one admin route,** `/api/admin/preview-feedback/[id]/image?v=thumb\|full`. It runs `requireAdmin()` (non-admin → 404, and the signer is never called), validates the uuid, then reads `image_path` with the **service-role** client. It signs a 5-minute URL with the service-role client and returns a 302 with `Cache-Control: private, no-store`. Thumbnails in the admin page use this route as their `src`. `getPreviewWithFeedback` keeps the **session** client and only adds `image_path`; it signs nothing. | The session client can't sign (no SELECT policy on the bucket, by design). One route means one auth check and one signer. Because each page load gets a fresh URL, an expired thumbnail is never shown. |
| S9 | **"Copy as markdown"** appends ` · [screenshot](https://www.honuvibe.ai/api/admin/preview-feedback/<id>/image?v=full)` to items that have an image. | The link is stable and admin-only, so the exported fix plan links straight to the evidence. *(Decision 3 below.)* |
| S10 | **Draft coordination (extends D13).** The text draft becomes `{ id: submissionId, name, page, kind, message, hasImage }`; the image draft is `hv_pv_fb_draft_img:<slug>` = `{ id, dataUrl }`. Rules: (a) a draft exists while the message is non-empty **or** an image is attached, and attaching an image first starts a draft and captures the page; (b) before writing a new image, **remove the old image key first**, so a failed write can never leave the previous screenshot to be restored; (c) emptying the message keeps the draft if an image is attached; (d) **Remove** deletes the image key and sets `hasImage = false`; (e) a 201 clears both keys; (f) on reload, restore the image only if the ids match, `hasImage` is true and the value starts with `data:image/jpeg;base64,` and is under 2.2 MB, otherwise discard it and keep the text; (g) if the image write throws, show "Your note is saved, but the screenshot isn't — attach it again after you sign back in". | Image A can never come back after B replaced it. Text and image always belong to the same draft. |
| S11 | **Deletion and reconciliation.** A new ops script, `scripts/preview-images.mjs`, runs with the service key and has two commands. `purge <slug\|preview_id>` lists the preview's prefix with pagination (100 per page) and removes objects in batches of 100; it is idempotent, so rerun it on failure. `reconcile [--grace-hours 24]` pages through the whole bucket and removes objects older than the grace period whose `submission_id` has no matching `preview_feedback` row. **When it runs:** purge **before** deleting a preview row, a step added to the studio-client-preview skill and to Recovery; reconcile by hand, after any 500s or `cleanup_failed` log lines, and at the end of each review round. | Supabase only removes files through the Storage API, and the 089 row cascade leaves objects behind. *(Decision 2 below sets retention.)* |
| S12 | **Upload rate is dampened, not bounded.** A note with an image counts as one note against the existing D10 buckets. Those buckets are per instance, and retention is indefinite, so total storage has no hard cap; S11 is the control. | Honest framing: with 4 reviewers this is a few MB per round. |
| S13 | **A platform-aware hint:** one line in the panel. Windows says "Win+Shift+S, then Ctrl+V". Mac says "Cmd+Ctrl+Shift+4, then Cmd+V". Phones get no hint, since the Attach button is enough. Detected from `navigator.userAgent` and `maxTouchPoints`. | The snip-to-clipboard shortcut is what makes this effortless, and most people don't know it. |

## Widget state machine (S2/S10 races)

**State:**
- `attachGen`: an integer that increments on every new selection (paste, drop, file pick) and on Remove;
- `processing`: true while compression runs;
- `image`: `{ blob, objectUrl } | null`.

**Rules:**
- **Stale results:** a compression result is applied only if its captured `attachGen` still equals the current one. Stale results are dropped and their resources released (`URL.revokeObjectURL` and `ImageBitmap.close()`).
- **Newest selection wins:** picking B while A is still compressing makes A stale.
- **Remove during compression:** increments `attachGen`, so the pending result is dropped. A removed screenshot never comes back.
- **Send during compression:** Send is disabled while `processing`, with the label "Processing screenshot…", and the submit handler also re-checks `processing`.
- **While sending:** the paste, drop and file-change handlers each return early when `sending` is true. Disabling buttons doesn't stop events, so every input source carries its own guard.
- **After send:** a 201 revokes the object URL and clears `image`.

## File map

| File | Change |
|---|---|
| `supabase/migrations/090_preview_feedback_images.sql` (new) | `preview_feedback.image_path`, plus the bucket created or **corrected** on rerun |
| `supabase/tests/preview_feedback_images_rls.test.ts` (new) | Bucket privacy, column constraint, and bucket settings |
| `lib/previews/feedback.ts` | `submissionId` in `parseFeedbackInput`; limits; `hasImage` on `PreviewFeedbackItem` |
| `lib/previews/image-process.ts` (new, server-only) | `processScreenshot(buf) → { full, thumb } \| { error }` (sharp) |
| `lib/previews/read-body.ts` | `readBodyCappedBytes` |
| `lib/previews/multipart.ts` (new) | Strict multipart parse: one `payload` string, at most one non-empty `image` File |
| `app/api/preview/[slug]/feedback/route.ts` | Multipart path plus idempotent insert (S7) |
| `lib/previews/feedback-widget.ts` | Attach, paste and drop; state machine; FormData send; draft coordination; hint |
| `lib/previews/admin-queries.ts` | Select `image_path` → `hasImage` (session client, no signing) |
| `app/api/admin/preview-feedback/[id]/image/route.ts` (new) | Admin-only signer (S8) |
| `components/admin/AdminPreviewFeedback.tsx` | Thumbnail (stable route), a "Screenshot unavailable" fallback, the markdown link |
| `scripts/preview-images.mjs` (new) | `purge` / `reconcile` (S11) |
| `~/.claude/skills/studio-client-preview/SKILL.md` (outside the repo) | Purge-before-delete step; the verify note includes a screenshot |

## Tasks

### Task 1: Migration 090 and storage tests

**Column.** `ADD COLUMN IF NOT EXISTS image_path text CHECK (image_path IS NULL OR image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$')`. The thumbnail path is derived from it, not stored.

**Bucket.** Insert it with `ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg']`, so a rerun **corrects** a misconfigured bucket instead of preserving it. Add no storage policies.

**Header.** In the 089 style: apply BEFORE the push, point to Recovery, list the verification queries. Those queries check the column, then check that `public`, `file_size_limit` and `allowed_mime_types` match exactly, then check that `storage.objects` has no policies for the bucket.

**RLS test (test project).**
- anon and a member can't upload, download or `createSignedUrl` on an object the service role put there;
- the service role can;
- the bucket row's settings are exactly as above;
- a bad `image_path` (`../x.jpg`, `a/b.png`, `abc`) is rejected with `23514`.

TDD: red before 090 is applied to the test project, green after. Commit.

### Task 2: Server helpers (validation, processing, multipart)

**`processScreenshot`, tested with fixtures in `__tests__/fixtures/screenshots/`.** Valid inputs:
- a normal PNG screenshot and a normal JPEG both produce JPEG output (full ≤ 1600 px on the long edge, thumb ≤ 240 px), and the output decodes;
- a JPEG with EXIF orientation 6 comes out upright with no EXIF;
- a JPEG carrying GPS EXIF comes out with **no** metadata (checked via `sharp(out).metadata()`);
- WebP input is accepted.

Every invalid input returns an error and never throws:
- a valid `FF D8 FF` signature followed by random bytes;
- a truncated PNG;
- an HTML file renamed `.jpg`;
- a GIF;
- an 8001×10 image (dimension limit);
- an image over the pixel limit;
- zero bytes.

**`readBodyCappedBytes`:** mirrors the text version; test a stream with no Content-Length that goes over the cap.

**`parseMultipart(bytes, contentType)`:** rejects
- malformed bodies (a broken boundary);
- duplicate `payload`, and duplicate `image`;
- a `payload` sent as a file;
- an `image` sent as a string;
- an empty `image`;
- a missing `payload`.

Each is a 400-type result; none throws.

**`parseFeedbackInput`:** accepts an optional `submissionId` (a uuid) and rejects a malformed one.

Commit.

### Task 3: Route, multipart and idempotency

The existing steps 1–10 are unchanged:
- step 4 accepts `application/json` or `multipart/form-data`;
- step 6's early Content-Length reject uses the cap for that type.

| Step | Multipart condition | Response |
|---|---|---|
| 11m | Capped byte read (2 MB): too large → 413; read error → 400 | 413 / 400 |
| 12m | `parseMultipart`, then `parseFeedbackInput` (JSON `submissionId` required on this path) | 400 |
| 12i | `processScreenshot`: error → 400 `Unsupported image` | 400 |
| 13 | Post-auth limits, unchanged | 429 |
| 14r | **Replay check** (S7.1): a row with this id for this preview → 201; for another preview → 409 | 201 / 409 |
| 14u | Upload full and thumb (`upsert: true`, `image/jpeg`): failure → 500, no row | 500 |
| 14i | Insert the row with `id = submissionId`, `image_path`. On a unique violation, re-select: same preview → 201. On a definite error, verify the row is absent, then remove both objects (log `cleanup_failed` on failure), then 500. On an ambiguous error, return 500 and **keep** the objects. | 201 / 500 |
| 15 | Success | 201 |

The JSON path also accepts an optional `submissionId`: with one, it gets the same replay semantics; without one, it behaves exactly as today.

**Tests:** one per row, plus the scenarios below.

| Test | Expected |
|---|---|
| Body not read before the cookie (bad cookie + throwing multipart stream) | 401 |
| Multipart over 2 MB, no Content-Length | 413 |
| Valid signature followed by garbage | 400, no upload |
| **Insert committed, response lost:** first call, insert mock resolves after the "timeout"; replay with the same `submissionId` | 201, and `remove` is never called |
| **Cleanup failure:** definite insert error and `remove` rejects | 500, `cleanup_failed` logged, no throw |
| **Ambiguous insert error:** a timeout | 500, `remove` not called |
| Replay with a `submissionId` that belongs to another preview | 409 |
| Retry after a 500 at the upload step | Overwrites the same paths, inserts once |
| JSON path | Every existing route test still green |

Then run `NODE_OPTIONS=… pnpm build`. Commit.

### Task 4: Widget

**UI.** Between Message and the buttons:
- the label "Screenshot (optional)";
- a dashed drop area with **Attach image** (≥ 44 px, hidden `<input type="file" accept="image/*">`) and the S13 hint line;
- once an image is attached, a 72 px thumbnail with its size and a **Remove** button;
- a processing state.

**Sources.** `paste` on the shadow root (the first image item; pasting text into Message still works), drop on the panel, and the file input. Every source goes through the state machine above.

**Send.**
- With an image: `FormData` (`payload` = JSON including `submissionId`, `image` = blob). The `submissionId` comes from the draft, so a retry reuses it.
- Without an image: the JSON request, also carrying `submissionId`.

**Drafts.** S10 rules (a)–(g).

**Tests (jsdom).** jsdom has no canvas, so `compress` is injectable and returns deferred promises.

State-machine interleavings:
- A then B, with B resolving first and A last: B is shown, A is dropped and its URL revoked;
- Remove during compression: nothing comes back;
- Send pressed during compression: it is disabled and the submit handler refuses;
- paste, drop and file change while sending: all ignored.

Drafts and resume:
- attach before typing starts a draft and captures the page;
- emptying the message while an image is attached keeps the draft;
- the image write throws while replacing A with B: the old key is already removed, so a reload restores no image and shows the S10(g) message;
- reload with mismatched ids: the image is discarded and the text kept;
- reload with a corrupt image draft: discarded;
- a 201 clears both keys;
- a retry after a timeout sends the same `submissionId`.

Also covered:
- FormData versus JSON send;
- the platform hint for Windows, Mac and phone user agents;
- the emitted script is still ES2019 and ASCII (acorn).

**Real Chromium (both Hawaii Palms exports; 375, 1280×590 @1.5, 1440).**
- The panel fits with a thumbnail and Send stays reachable.
- Paste works through a dispatched `ClipboardEvent` carrying a real PNG.
- The real compress path, given the **fixed 4 MB fixture** `__tests__/fixtures/screenshots/retina-4mb.png`, comes in at **≤ 400 KB** (the target for that fixture).
- General acceptance is the actual S2/S4 limits (≤ 1.5 MB client output, ≤ 2 MB request), not 400 KB.

Commit.

### Task 5: Admin, signer and cleanup script

**`getPreviewWithFeedback`.** Selects `image_path` and returns `hasImage`. It keeps the session client and does **no signing** (S8).

**`/api/admin/preview-feedback/[id]/image`.** Implements S8. Tests:
- a non-admin gets 404 and **the service-role signer mock is never called**;
- a bad uuid gets 404;
- a row with no image gets 404;
- a missing object (sign error) gets 404 `{ error: 'Screenshot unavailable' }`;
- an admin gets 302 with no-store, using thumb and full variants.

**`AdminPreviewFeedback`.**
- **Thumbnails:** `<img src="/api/admin/preview-feedback/<id>/image?v=thumb" width=120 height=…>`, a plain `<img>` with an explicit size. This is a deliberate exception to the "next/image" rule: the image is private, so no optimizer cache. Note the exception in a code comment.
- **Missing images:** on `onError` the thumbnail shows "Screenshot unavailable" and the rest of the note renders normally.
- **Link:** the thumbnail links to `?v=full` in a new tab.
- **Markdown:** includes the S9 link.

Tests: a thumbnail is rendered only when `hasImage` is true; the onError fallback shows; the markdown carries the link.

**`scripts/preview-images.mjs`.**
- **`purge`** pages through a prefix with more than 100 objects and removes them in batches. It is idempotent: a second run removes 0.
- **`reconcile`** removes only orphans older than the grace period. It keeps objects that still have a row, and keeps fresh orphans.

Test against the **test project**, then `pnpm verify:fast`. Commit.

### Task 6: Skill and verification

**Skill.**
- Before deleting a preview row, run `node --env-file=.env.local scripts/preview-images.mjs purge <slug>`.
- The verify step's test note includes a pasted screenshot.

**Automated.**
- `NODE_OPTIONS=… pnpm verify` green.
- `pnpm test:rls preview_feedback preview_feedback_images client_previews` green.

**Integration** (test project, local server, real export, real route):
- one note with a pasted screenshot and one without;
- the objects exist (full + thumb, both JPEG, no EXIF);
- `image_path` matches;
- the admin thumbnail renders and the full link works for an admin and returns 404 signed out;
- a forged-cookie multipart request returns 401;
- a disguised HTML "image" returns 400 and stores nothing;
- a **replayed submission** (same `submissionId` sent twice) creates one row and one image;
- `reconcile` with `--grace-hours 0` removes a planted orphan and keeps the real image;
- `purge` empties the prefix;
- cleanup: delete the test rows, then purge.

**Manual, on real devices** (Ryan, or me on this machine where possible):
- **Windows:** Win+Shift+S, then Ctrl+V into the panel; the thumbnail appears and the note sends.
- **macOS:** Cmd+Ctrl+Shift+4, then Cmd+V (Ryan, if he has a Mac at hand).
- **Phone:** the Attach image file picker on iPhone and Android; pick a screenshot and send.
- **HEIC:** pick a HEIC photo on iPhone and record what happens. It is a **check, not a promise** (see Risks).

**Review.** An independent adversarial review (requesting-code-review), with the findings triaged.

## Ship (order matters, same as 089)

1. **Apply 090 to prod before pushing** (new code selects `image_path`). Verify by querying prod:
   - the column exists and every value is `NULL`;
   - the bucket's `public`, `file_size_limit` and `allowed_mime_types` match exactly;
   - there are no storage policies for the bucket;
   - anon `createSignedUrl` fails.
2. Push and wait until Vercel shows Ready. Confirm the existing preview still serves and a JSON-only note still sends.
3. **Prod smoke** on `hawaiipalms-site-5240f55d85`:
   - a note with a pasted screenshot from desktop;
   - a note from a phone using the file picker;
   - the thumbnails show in admin.
   - **Cleanup by retention:** mark both test notes Won't do and **keep their attachments**, so no row points at a deleted object. A test note is only removed by deleting the row and then running `reconcile`, never by deleting the object alone.

## Recovery

- **Widget misbehaving:** turn off the per-preview toggle, as today.
- **Route or admin bug:** roll back the app only and leave 090 in place. The old code ignores `image_path` and the bucket.
- **Deleting a preview:** `purge <slug>` first, then delete the row (the row cascade removes its feedback). If the row was already deleted, `reconcile` removes the leftover objects once the grace period has passed.
- **Removing the feature for good:** do this only after code without `image_path` is live. Export the images, run `purge` for every preview, then drop the column, and finally empty and delete the bucket.

## Out of scope

- automatic capture (no `html2canvas` or `getDisplayMedia`);
- annotation or drawing;
- more than one image per note;
- video;
- an admin "remove screenshot but keep the note" button (if ever needed, it must clear `image_path` too);
- scheduled auto-expiry (unless Decision 2 asks for it).

## Risks

- **Screenshots can capture more than the preview**, for example a full-screen snip showing other tabs. The bucket is private and only admins can see it. The copy nudges people to capture "the part of the page you mean". Metadata (EXIF, including GPS) is stripped **server-side** (S5).
- **Orphan objects** are possible after crashes, failed cleanup or ambiguous timeouts. S11 reconcile removes them; they are never deleted while a row might still reference them.
- **HEIC:** Safari on iPhone usually hands the page a JPEG from the file picker, and sharp may or may not decode a raw HEIC. Either the image gets through or the reviewer sees the "try a PNG or JPG" message. Task 6 verifies this on a real device.
- **Storage growth:** upload rate is dampened (S12), but total storage is unbounded under indefinite retention. The controls are S11 and Decision 2.
- **sessionStorage quota:** image drafts can fail to save. S10(g) says so honestly, and S10(b) prevents restoring the wrong screenshot.
- **Real phones and iOS Safari** have not yet been verified, for this feature or the existing widget. Task 6 and Ship step 3 cover them.

## Decisions (answered by Ryan, 2026-10-23)

1. **Screenshots per note: ONE** (S1 as written).
2. **Retention: (a).** Keep a screenshot while its note exists, and purge the files when the preview is deleted (S11 `purge`, run before the row delete; `reconcile` as the safety net). There is no scheduled auto-expiry job.
3. **Markdown export: INCLUDE** the admin-only screenshot link (S9 as written).

## Review log

**Rev 2 (2026-10-23), after an external review of rev 1** (verdict: "revise before building"). Each finding was checked against the code before being accepted:

- **[P2] "One request" isn't atomic; a lost response could delete a saved note's image.** Accepted. S3 is reframed as compensating cleanup. S7 adds an idempotent `submissionId` that becomes the row id, a replay check, deletion only on a *definite* error after re-checking that the row is absent, `cleanup_failed` logging, and a test for "insert committed, response lost". S11 adds reconcile with a grace period.
- **[P2] Deleting a preview doesn't delete its screenshots.** Accepted and verified: no preview-delete path exists, and the 089 cascade only covers rows. S11 adds a `purge` script (paginated list, batched remove, idempotent), a skill step and Recovery steps.
- **[P2] The signing client was unspecified, and the session client can't sign.** Accepted and verified: `admin-queries.ts` uses `createClient` (session), and the bucket has no SELECT policy. S8 routes all signing through one admin route: `requireAdmin()`, then a service-role client. The test asserts the signer is never called for non-admins. Using that same route as the thumbnail `src` also removes expired-URL thumbnails.
- **[P2] Magic numbers don't prove a valid, bounded image, and metadata stripping was client-only.** Accepted and verified: `sharp` 0.34.5 is a runtime dependency already used in three API routes. S5 decodes and re-encodes on the server with pixel and dimension limits, output is always JPEG and metadata-free, and Task 2 has fixtures for every case listed. The privacy claim now rests on the server.
- **[P2] Async compression races.** Accepted. A widget state machine adds a generation token, a processing state, per-source guards and resource release, tested with deferred promises.
- **[P2] The image draft could restore the wrong screenshot.** Accepted. S10 shares a draft id, removes the old key before a replacement write, validates on restore, and defines every case: attach-first, empty message, Remove, 201 and reload.
- **[P2] The prod smoke left a broken attachment reference.** Accepted. Ship step 3 now keeps the attachments and marks the notes Won't do. Removing only an object is documented as never done.
- **[P2] Verification gates didn't match the limits, and synthetic paste isn't the real workflow.** Accepted. The 400 KB target applies to a fixed fixture, and general acceptance uses the actual limits. Manual Windows, macOS and phone checks are added. HEIC is a verification item, not a guarantee.
- **Smaller items, all accepted:**
  - strict multipart parsing (S4, Task 2);
  - a "Screenshot unavailable" fallback (Task 5);
  - expiring thumbnails, solved by S8;
  - a migration rerun that corrects bucket settings, with exact-settings verification (Task 1, Ship);
  - "dampened, not bounded" wording (S12, Risks).

## Execution record (2026-10-23)

Built with subagent-driven development: one implementer and one task review per task, a fix round where a review asked for one, then an independent adversarial whole-branch review and one fix wave. Migration number 090 was still free.

**Commits** (local on main, pushed together after 090 reached prod): `b620354` 090 + storage tests · `9372572` helpers (sharp re-encode, capped multipart, submissionId) · `1a1132f` + `e7b682e` route · `ff6defd` + `7a16ae5` widget · `dbbb08f` + `de85c20` admin, signer, purge/reconcile · `b6b1c77` final-review fixes.

**Gates**
- Main tree at `b6b1c77`: type-check green; tests 234 files / 2785 green; build green (498/498 pages).
- Clean worktree at `b6b1c77`: type-check and build green; tests 2666 green, 217/218 files. The one red is the pre-existing `server-only` resolve in `__tests__/discovery-launch-gate.test.tsx` (not in package.json). The build also logs pre-existing `MISSING_MESSAGE partnerships.comade…` lines; no commit here touches those files.
- `pnpm test:rls preview_feedback preview_feedback_images client_previews`: 25/25 on the hosted test project. The 090 rerun was proven to *correct* a corrupted bucket.
- Real Chromium at HEAD, both Hawaii Palms exports (site + dashboard) at 375×812, 1280×590 @1.5 and 1440×900: 6/6 runs pass.
  - With a thumbnail, Send's bottom is 540.5 px at 1280×590, and 541 px with a status line (limit 542, Ryan's taskbar).
  - `retina-4mb.png` (4.17 MB) compresses to 181.8 KB, a 1600×1000 JPEG.
  - Paste, draft restore, right-edge tab, counter-zoom and keystroke isolation all still work.

**Task 6 integration** (local server on the test project, real 12-page export, real routes): 12/12 checks pass.
- Forged-cookie multipart → 401. Disguised HTML image → 400 `Unsupported image`, with nothing stored.
- Pasted-screenshot note and text-only note: rows and `image_path` are correct. Both objects are JPEG with no EXIF, full ≤ 1600 px and thumb ≤ 240 px.
- Replayed `submissionId` → one row, one image pair.
- Admin: the thumbnail loads, and the full link 302s to a signed JPEG; signed out, the link is 404. The markdown carries the S9 link.
- `reconcile --grace-hours 0` removed only a planted orphan; `purge` emptied the prefix, and a rerun removed 0. Cleanup is done.

**Deviations from the plan**
- **R5 refined:** objects are removed only after a *permanent* insert error (SQLSTATE 22/23/42/0A, PGRST1xx/2xx). Transient errors (57014, 40xxx, 53xxx, 08xxx, PGRST000–003) keep the objects for reconcile. The reason is a race: a slow request hits a timeout, a retry commits, and the first request would otherwise delete the committed note's image.
- Post-auth throttles run **before** decoding (an automated security review flagged CPU spend), and the replay check runs before the decode.
- **Content-aware replay (final review, Important):**
  - A replay returns 201 only when the stored row is the same note (page, name, kind, message, image presence). Otherwise it returns 409, and the widget rotates its id and resends once.
  - Before this, a duplicated tab or a note edited after a timeout showed "Thanks" and was never saved.
- Smaller deviations:
  - `parseMultipart` rejects unknown fields;
  - `processScreenshot` retries at q60 before rejecting (R8);
  - `image-process.ts` has no `server-only` import (R1).
- Widget additions:
  - a text paste that also carries a bitmap (Excel/PowerPoint) stays text in Name/Message;
  - the send timeout is 45 s with an image;
  - focus returns to Attach after a failed compress;
  - a 400 with an image attached shows a hint;
  - the short-viewport cap is `vh − 72`.
- Reconcile:
  - ages objects by max(`created_at`, `updated_at`);
  - counts an object live only if a row's `image_path` points at it;
  - fails closed on any lookup error.
- The skill `studio-client-preview` now has a "Deleting a preview" section (purge, then delete the row), and its verify note includes a screenshot.

**Known, deferred:**
- Two duplicated tabs sending image notes at the same instant can leave one row showing the other's screenshot; nothing is deleted.
- `reconcile --grace-hours 0` has a race, so keep it to test projects.
- At 1280×590 with a status line, the thumbnail row scrolls under it.
- Not yet tested: the `<img>` decode fallback, the q0.6 retry in a real browser, iOS Safari and HEIC.

**Prod (Ship step 1), 2026-10-23:**
- Before 090, a read-only baseline: `image_path` → 42703, and no bucket.
- Ryan applied 090. Verified by querying prod with the service key over REST:
  - `image_path` is selectable, with 1 row and 0 non-NULL;
  - the bucket is `public:false`, `file_size_limit:2097152`, `allowed_mime_types:["image/jpeg"]`;
  - anon `createSignedUrl` is denied, anon list returns `[]`, and an anon upload is rejected by RLS.
- Ryan pasted the storage-policies query: "Success. No rows returned".
