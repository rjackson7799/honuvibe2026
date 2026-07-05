═══════════════════════════════════════════════════════════════════════════════
BRIEF 2 of 5 — Course money-path copy  ·  paste into Fable 5 AFTER Brief 1
═══════════════════════════════════════════════════════════════════════════════

You are writing conversion copy for HonuVibe. **Apply the Voice Guide you wrote in Brief 1**
(Profile A — Education). If it isn't in this session, paste it above this brief first.

This is the highest-leverage surface: the path a buyer walks from a course page to a completed
purchase — detail page → checkout → confirmation. Writing task only; every current string is
below. Rewrite the ENGLISH to be sharper and consistent, and write NATIVE Japanese (not a
translation) for each. Use ACTION voice for transactional strings (CTAs, checkout, urgency)
and keep EDITORIAL voice for narrative section headings.

────────────────────────────────────────────────────────────────────────────────
HARD CONSTRAINTS
────────────────────────────────────────────────────────────────────────────────
- Preserve interpolation tokens EXACTLY, unchanged: {count} {date} {months} {name} {percent}.
  They are replaced with real values at runtime — keep them in both EN and JP.
- Button labels stay short. `enroll_now` also renders in a pinned mobile bar — keep it ≤ ~14
  characters. Section headings render in a serif display face — keep them short noun phrases.
- Plain text only inside values — no markdown, no HTML, no emoji unless noted.
- Every item needs EN and JP. JP must read as if written by a native marketer.

────────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT — return exactly this, one block per string
────────────────────────────────────────────────────────────────────────────────
key: <the key path>
EN: <english>
JP: <japanese>
note: <one line: what you changed and why>

Group your output under the headers A / B / C / D below so wiring is mechanical.

════════════════════════════════════════════════════════════════════════════════
A. DETAIL PAGE — rewrite these existing keys (messages/*.json → learn.*)
════════════════════════════════════════════════════════════════════════════════
CURRENT values (rewrite EN, add native JP):

key: learn.final_cta_heading      CURRENT EN: "Ready to start?"
key: learn.final_cta_sub          CURRENT EN: "Join the next cohort and start applying AI to your work this week."
key: learn.enroll_now             CURRENT EN: "Enroll Now"           (≤14 chars; used on every CTA + mobile bar)
key: learn.spots_left             CURRENT EN: "{count} spots left"   (urgency — keep {count})
key: learn.cohort_full            CURRENT EN: "Cohort Full — Join Waitlist"
key: learn.what_youll_master      CURRENT EN: "What You'll Master"   (serif heading — short)
key: learn.tools_youll_learn      CURRENT EN: "Tools You'll Learn"   (serif heading — short)

"How It Works" value-framing steps (live-format course):
key: learn.how_step_1             CURRENT EN: "Live on Zoom twice a week"
key: learn.how_step_2             CURRENT EN: "Replays + transcripts available next day"
key: learn.how_step_3             CURRENT EN: "Mini-assignments to apply what you learned"
key: learn.how_step_4             CURRENT EN: "Private community for {months} months"   (keep {months})
"How It Works" steps (self-paced/recorded course):
key: learn.how_step_1_recorded    CURRENT EN: "Pre-recorded lessons, watch on your schedule"
key: learn.how_step_2_recorded    CURRENT EN: "Full transcripts included with every lesson"

════════════════════════════════════════════════════════════════════════════════
B. CHECKOUT — these are hardcoded English today; we are moving them to i18n (learn.checkout.*)
   Rewrite EN + write JP. The buyer currently sees ENGLISH even on the Japanese site — the JP
   you write here fixes the most decisive drop-off point.
════════════════════════════════════════════════════════════════════════════════
key: learn.checkout.title            CURRENT EN: "Complete Your Enrollment"   (page/section title)
key: learn.checkout.back_to_course   CURRENT EN: "Back to course"
key: learn.checkout.summary_heading  CURRENT EN: "What you'll master"          (small uppercase label)
key: learn.checkout.starts           CURRENT EN: "Starts {date}"               (keep {date})
key: learn.checkout.spots_remaining  CURRENT EN: "{count} spots remaining"     (keep {count})
key: learn.checkout.secure           CURRENT EN: "Secure Checkout"             (card header)
key: learn.checkout.powered_by       CURRENT EN: "Powered by Stripe"           (trust mark — may stay as-is; give JP)
key: learn.checkout.trust_strip      CURRENT EN: "Secure checkout · 14-day refund policy"
key: learn.checkout.card_statement   CURRENT EN: "This charge will appear as “808eventures” on your card statement."

NET-NEW checkout strings — write EN + JP (these don't exist yet; they close real gaps):
key: learn.checkout.reassurance      NEW — a short risk-reversal line before payment (the guarantee, said
                                     warmly: 14-day refund, cancel simply). One sentence.
key: learn.checkout.whats_next       NEW — one line telling the buyer what happens right after they pay
                                     (instant access to the course hub; a confirmation email; cohort start).
key: learn.checkout.error_retry      NEW — reassurance shown if a card is declined: calm, no blame, "your
                                     card wasn't charged — try again or use another method." One–two sentences.

════════════════════════════════════════════════════════════════════════════════
C. STRIPE PAYMENT FORM — one line Stripe itself renders next to the price (none exists today)
════════════════════════════════════════════════════════════════════════════════
key: stripe.product_description      NEW — a single compelling line describing the course, shown inside the
                                     Stripe payment form beside the course title + price. EN + JP. ≤ ~120 chars.
                                     (It will be generated per course; write it as a reusable TEMPLATE using
                                     {course} for the title, e.g. "Live, cohort-based: {course}. …")

════════════════════════════════════════════════════════════════════════════════
D. POST-PURCHASE CONFIRMATION — the "success moment" (there is NONE today; the buyer lands on the
   course hub with zero acknowledgment). Write a warm, brief confirmation block. EN + JP.
════════════════════════════════════════════════════════════════════════════════
key: learn.enrolled.heading          NEW — celebratory but grounded heading, e.g. "You're in."
key: learn.enrolled.body             NEW — 1–2 sentences: welcome, what they now have access to, when the
                                     cohort starts. Warm, Hawaiian-brand, not corporate.
key: learn.enrolled.next_cta         NEW — the primary next-step button label (into the course hub). ≤16 chars.
key: learn.enrolled.email_note       NEW — one line: "A confirmation and receipt are on the way to your inbox."

────────────────────────────────────────────────────────────────────────────────
CHECKPOINT GATE — read before you finish
────────────────────────────────────────────────────────────────────────────────
Output all four groups (A–D) in the block format above, then STOP. Do not start Brief 3.
End with: (1) one line on the biggest copy shift you made, and (2) verbatim to Ryan:
"Run /usage to check spend, then switch to Sonnet to wire these into messages/*.json + the
checkout/Stripe/CourseHub code and run pnpm verify:fast."
