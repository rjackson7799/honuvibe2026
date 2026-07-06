═══════════════════════════════════════════════════════════════════════════════
BRIEF 5 of 5 — Flagship course selling copy (template)  ·  paste into Fable 5 AFTER Brief 1
═══════════════════════════════════════════════════════════════════════════════

You are rewriting the selling copy for ONE flagship HonuVibe course to gold-standard quality —
this becomes the TEMPLATE every other course is rewritten against. **Apply Voice Guide Profile A**
(Education). If it isn't in this session, paste it above first. Rewrite the ENGLISH sharper and
write NATIVE Japanese for each field. The course sits on the detail page → checkout path you
already sharpened in Brief 2, so this copy must sound like it belongs there.

This copy lives in Supabase `courses` / `course_weeks` / `course_sessions` rows (not code), so
it's applied via the admin editor / SQL after review — the field names below map 1:1 to columns.

────────────────────────────────────────────────────────────────────────────────
HOW TO RUN THIS
────────────────────────────────────────────────────────────────────────────────
1. Fill the INPUT block below with the flagship course's CURRENT field values (copy them from
   the admin course editor, or Ryan/Opus pastes them in). Leave a field blank to have Fable
   propose one from scratch.
2. Paste the whole brief into Fable. It rewrites each field EN + JP and returns them labelled by
   column so the DB update is mechanical.

────────────────────────────────────────────────────────────────────────────────
HARD CONSTRAINTS
────────────────────────────────────────────────────────────────────────────────
- FACTS ARE FIXED. Do NOT change or invent: dates, prices, week counts, session counts, tool
  names, instructor names, or any number. Rewrite the *words around* the facts, not the facts.
- Keep ARRAY fields as arrays with the SAME number of items unless an item is genuinely
  redundant (say so in a note). `materials_summary` items keep their {material, language,
  provided_with} shape — rewrite only the human-readable text.
- `tools_covered` and `tags` are proper nouns / keywords — leave them unless one is mislabelled.
- Native JP, never translated EN. JP is a DRAFT pending human review before it touches production.
- Plain text (these are DB values). No markdown inside a field value.

────────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT — one block per field
────────────────────────────────────────────────────────────────────────────────
column: <db column, e.g. description_en>
value: <rewritten copy>   (for array fields, one item per line, numbered)
note: <one line: what you changed and why>

Pair each _en with its _jp. Group output under A / B / C / D below.

╔══════════════════════════════════════════════════════════════════════════════╗
║ INPUT — paste the flagship course's CURRENT values here (blank = write fresh)  ║
╚══════════════════════════════════════════════════════════════════════════════╝
COURSE (table: courses)
  title_en:                <>
  title_jp:                <>
  description_en:          <>
  description_jp:          <>
  learning_outcomes_en:    <one per line>
  learning_outcomes_jp:    <one per line>
  who_is_for_en:           <one per line>
  who_is_for_jp:           <one per line>
  prerequisites_en:        <>
  prerequisites_jp:        <>
  schedule_notes_en:       <>
  schedule_notes_jp:       <>
  cancellation_policy_en:  <>
  cancellation_policy_jp:  <>
  completion_requirements_en: <one per line>
  completion_requirements_jp: <one per line>
  materials_summary_en:    <rows of: material | language | provided_with>
  materials_summary_jp:    <rows of: material | language | provided_with>
  (facts for context — DO NOT rewrite): level, format, total_weeks, live/recorded counts,
   price_usd/jpy, start_date, tools_covered, tags

WEEKS (table: course_weeks — repeat per week)
  week N — title_en / title_jp / subtitle_en / subtitle_jp / description_en / description_jp: <>

SESSIONS (optional depth — table: course_sessions, repeat per session)
  session N — title_en/jp / description_en/jp / topics_en/jp (title + subtopics): <>

╚══════════════════════════════════════════════════════════════════════════════╝

════════════════════════════════════════════════════════════════════════════════
A. HERO & PITCH — highest leverage (this is the detail-page headline + subhead)
════════════════════════════════════════════════════════════════════════════════
- title_en / title_jp — the course name as a benefit, not a label. Short.
- description_en / description_jp — the 1–2 sentence pitch under the title. This is THE line that
  earns the scroll. Editorial voice; concrete outcome; no hype words (see the banned list).

════════════════════════════════════════════════════════════════════════════════
B. VALUE & FIT
════════════════════════════════════════════════════════════════════════════════
- learning_outcomes_en/jp — "What You'll Master." Each outcome starts with a capability verb and
  names something the learner can DO after ("Ship a…", "Automate…"), not "Understand…".
- who_is_for_en/jp — crisp audience lines a reader recognizes themselves in.
- prerequisites_en/jp — honest and reassuring (lower the fear of "am I ready?").

════════════════════════════════════════════════════════════════════════════════
C. CURRICULUM — the week-by-week narrative (course_weeks)
════════════════════════════════════════════════════════════════════════════════
- Per week: title / subtitle / description. Make each week read as a promise of what they'll be
  able to do by its end, not a topic dump. Keep the arc building across weeks.
- (Optional) session titles/descriptions/topics for deeper courses.

════════════════════════════════════════════════════════════════════════════════
D. LOGISTICS & TRUST — buyer-facing reassurance
════════════════════════════════════════════════════════════════════════════════
- schedule_notes_en/jp — clear, calm logistics.
- cancellation_policy_en/jp — risk-reversal in plain, warm language (it's a conversion lever).
- completion_requirements_en/jp — what "done" looks like, encouragingly.
- materials_summary_en/jp — the value stack; make each included item feel worth having.

────────────────────────────────────────────────────────────────────────────────
CHECKPOINT GATE — read before you finish
────────────────────────────────────────────────────────────────────────────────
Output groups A–D, labelled by DB column, then STOP (this is the last brief). End with:
(1) one line on the course's sharpest new selling angle, and (2) verbatim to Ryan: "Run /usage,
then apply these as a DRAFT — review the JP, then update the course rows in the Supabase
dashboard SQL editor (zvfwtndbxshrtpwcwynw). Do not write to production before JP review."
