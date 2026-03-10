# ESL Lesson Generator — Feature Specification
**Supplemental English Learning from AI Course Content | v1.0**
*HonuVibe.AI | March 2026*

---

## Table of Contents
1. [Feature Overview](#1-feature-overview)
2. [Business Context](#2-business-context)
3. [User Flow](#3-user-flow)
4. [Data Model](#4-data-model)
5. [ESL Content Schema](#5-esl-content-schema)
6. [Content Generation Pipeline](#6-content-generation-pipeline)
7. [Audio Generation (TTS)](#7-audio-generation-tts)
8. [Student-Facing UI](#8-student-facing-ui)
9. [Course Wizard Integration](#9-course-wizard-integration)
10. [Admin & Instructor Controls](#10-admin--instructor-controls)
11. [i18n Strings](#11-i18n-strings)
12. [API Routes](#12-api-routes)
13. [Stripe Integration (Add-On)](#13-stripe-integration-add-on)
14. [File Map](#14-file-map)
15. [Build Order](#15-build-order)
16. [Open Questions](#16-open-questions)

---

## 1. Feature Overview

### What It Is

An automated ESL (English as a Second Language) lesson generator that creates supplemental English language learning content from AI course materials. When an instructor enables the feature during course creation, each lesson in the course automatically receives a companion ESL module covering vocabulary, pronunciation, grammar, and usage — all derived from the actual course content.

### Why It Matters

HonuVibe's Japanese learners are accomplished professionals improving both their AI skills AND their English fluency simultaneously. Rather than treating these as separate goals, this feature unifies them: every AI concept learned is also an English language learning opportunity. This is a genuine differentiator — no competitor in the AI education space offers this.

### Core Capabilities

- **Key Vocabulary Extraction** — AI-identified technical and professional terms from each lesson, with Japanese translations and definitions
- **Contextual Usage Sentences** — Each vocabulary word shown in natural sentences drawn from or inspired by the lesson content
- **Audio Pronunciation** — Text-to-Speech audio for individual words and full sentences, enabling learners to hear natural English pronunciation
- **Grammar Points** — Key English grammar patterns that appear in the lesson content, explained with Japanese annotations
- **Cultural & Professional Notes** — Contextual guidance on how terms are used in American professional settings vs. Japanese business contexts
- **Comprehension Check** — Light-touch exercises to reinforce vocabulary and grammar retention

### What It Is NOT

- Not a full English course — it is supplemental material tied to AI lesson content
- Not a replacement for human language instruction — it augments the learning experience
- Not mandatory — it is an optional add-on that enhances value for bilingual learners

---

## 2. Business Context

### Revenue Model

The ESL Lesson Generator is offered as an **add-on upsell** at the course level:

| Scenario | Pricing Approach |
|---|---|
| **Bundled (default for Vertice-type cohorts)** | Included in the course price when sold as a bilingual program |
| **Add-on for individual learners** | +$49–$99 USD per course (one-time), unlocked at enrollment or post-enrollment |
| **Add-on for cohort programs** | +$30–$50 per student per course (volume discount) |

> **Pricing is configurable per course.** Some courses may include ESL by default; others offer it as an upgrade. The instructor controls this in the course wizard.

### Target Users

- Japanese professionals enrolled in HonuVibe AI courses (primary)
- Any non-native English speaker enrolled in English-language AI courses
- Vertice Society members and similar partnership cohorts

### Success Metrics

| Metric | Target | Notes |
|---|---|---|
| ESL add-on attach rate | 40%+ of JP-language enrollments | Primary conversion metric |
| ESL lesson completion rate | 60%+ of available ESL content | Engagement signal |
| Audio play rate | 50%+ of vocabulary items played at least once | Feature validation |
| Student satisfaction (ESL) | 4.0+ / 5.0 rating | Post-course survey |

---

## 3. User Flow

### 3.1 Instructor Flow (Course Creation)

```
Instructor enters Course Wizard
  → Uploads/creates lesson content (markdown)
  → Sees checkbox: ☑ "Create ESL Lesson from Course Material"
  → Optionally configures ESL settings:
      - Target language: Japanese (default) / expandable to others
      - Vocabulary depth: Essential (8–12 words) / Comprehensive (15–20 words)
      - Grammar points: 2–3 per lesson (default) / 4–5 per lesson
      - Include cultural notes: Yes (default) / No
      - Audio generation: Yes (default) / No
  → Saves/publishes course
  → System queues ESL generation for each lesson via Claude API
  → Generated ESL content appears in admin review queue
  → Instructor reviews, edits if needed, publishes
```

### 3.2 Student Flow (Learning)

```
Student opens a lesson in the course player
  → Completes primary lesson content (video, reading, exercises)
  → Sees "English Study" tab/section below the lesson content
  → Opens ESL companion for this lesson:
      - Vocabulary cards with JP/EN, audio, usage sentences
      - Grammar spotlight with examples
      - Cultural/professional notes
      - Quick comprehension check
  → Can toggle audio playback for any word or sentence
  → Can mark vocabulary as "learned" (tracked in progress)
  → ESL progress is tracked separately from main lesson progress
```

### 3.3 Student Flow (Add-On Purchase)

```
Student views course page without ESL access
  → Sees "English Study Add-On" card:
      "Strengthen your English while mastering AI.
       Each lesson includes vocabulary, pronunciation,
       grammar, and professional usage notes."
  → Clicks "Add English Study — $XX"
  → Stripe checkout (or added to existing enrollment)
  → ESL content unlocked immediately for all lessons
```

---

## 4. Data Model

### New Tables

```sql
-- ESL lesson content linked 1:1 to a course lesson
create table esl_lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  target_language text default 'ja' check (target_language in ('ja')),
  vocabulary_json jsonb not null,        -- Array of VocabularyItem (see §5)
  grammar_json jsonb not null,           -- Array of GrammarPoint (see §5)
  cultural_notes_json jsonb,             -- Array of CulturalNote (see §5)
  comprehension_json jsonb,              -- Array of ComprehensionItem (see §5)
  generation_model text,                 -- e.g. 'claude-sonnet-4-20250514'
  generation_prompt_hash text,           -- For cache invalidation on prompt changes
  status text default 'draft' check (status in ('draft', 'generating', 'review', 'published', 'error')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Audio files generated for vocabulary and sentences
create table esl_audio (
  id uuid primary key default gen_random_uuid(),
  esl_lesson_id uuid references esl_lessons(id) on delete cascade,
  reference_key text not null,           -- e.g. 'vocab_0_word', 'vocab_0_sentence_1', 'grammar_1_example_0'
  audio_url text not null,               -- URL to stored audio file (Supabase Storage or S3)
  duration_ms integer,
  tts_model text,                        -- e.g. 'openai-tts-1', 'openai-tts-1-hd'
  tts_voice text,                        -- e.g. 'alloy', 'nova', 'shimmer'
  created_at timestamptz default now()
);

-- Student progress on ESL content
create table esl_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  esl_lesson_id uuid references esl_lessons(id) on delete cascade,
  vocabulary_completed jsonb default '[]',   -- Array of vocab item IDs marked "learned"
  comprehension_score integer,               -- Percentage (0–100)
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, esl_lesson_id)
);

-- ESL add-on purchase (when sold separately from course enrollment)
create table esl_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  stripe_session_id text,
  amount_paid integer,                   -- cents or yen
  currency text default 'usd',
  purchased_at timestamptz default now(),
  unique(user_id, course_id)
);
```

### Modifications to Existing Tables

```sql
-- Add to courses table
alter table courses add column esl_enabled boolean default false;
alter table courses add column esl_included boolean default false;  -- true = bundled free; false = add-on purchase
alter table courses add column esl_price integer;                   -- add-on price in cents/yen (null if included)
alter table courses add column esl_currency text default 'usd';
alter table courses add column esl_settings_json jsonb;             -- VocabDepth, grammar count, etc.
```

### RLS Policies

```sql
-- ESL lessons: public read if parent lesson's course is published and ESL is enabled
create policy "esl_lessons_public" on esl_lessons for select
  using (
    status = 'published'
    and exists (
      select 1 from lessons l
      join modules m on m.id = l.module_id
      join courses c on c.id = m.course_id
      where l.id = esl_lessons.lesson_id
      and c.is_published = true
      and c.esl_enabled = true
    )
  );

-- ESL progress: users see only their own
create policy "esl_progress_own" on esl_progress for all
  using (auth.uid() = user_id);

-- ESL purchases: users see only their own
create policy "esl_purchases_own" on esl_purchases for select
  using (auth.uid() = user_id);

-- ESL audio: public read (audio files are served via URL, but metadata follows esl_lessons visibility)
create policy "esl_audio_public" on esl_audio for select
  using (
    exists (
      select 1 from esl_lessons el
      where el.id = esl_audio.esl_lesson_id
      and el.status = 'published'
    )
  );
```

### Access Logic (Middleware/API)

A student can access ESL content for a course if ANY of these conditions are true:
1. `course.esl_included = true` AND student has an active enrollment in the course
2. Student has an `esl_purchases` record for the course
3. Student has an admin or instructor role

---

## 5. ESL Content Schema

### VocabularyItem

```typescript
interface VocabularyItem {
  id: string;                        // Stable ID, e.g. "vocab_0"
  term_en: string;                   // English term, e.g. "prompt engineering"
  reading_en: string;                // Phonetic reading, e.g. "prɒmpt ˌɛndʒɪˈnɪərɪŋ"
  definition_en: string;             // English definition
  definition_jp: string;             // Japanese definition/translation
  term_jp: string;                   // Japanese equivalent term (if standard), e.g. "プロンプトエンジニアリング"
  part_of_speech: string;            // e.g. "noun", "verb", "adjective", "phrase"
  difficulty: 'essential' | 'intermediate' | 'advanced';
  usage_sentences: UsageSentence[];  // 2–3 example sentences
  notes_jp?: string;                 // Optional Japanese annotation on nuance/usage
  audio_keys: {
    word: string;                    // Reference key for word audio, e.g. "vocab_0_word"
    sentences: string[];             // Reference keys for sentence audio
  };
}

interface UsageSentence {
  sentence_en: string;               // Full English sentence using the term
  sentence_jp: string;               // Japanese translation of the sentence
  highlight_indices: [number, number]; // Start/end char indices of the term in sentence_en
}
```

### GrammarPoint

```typescript
interface GrammarPoint {
  id: string;                        // e.g. "grammar_0"
  title_en: string;                  // e.g. "Conditional Sentences (If...then)"
  title_jp: string;                  // e.g. "条件文（もし〜なら）"
  explanation_en: string;            // English explanation of the grammar point
  explanation_jp: string;            // Japanese explanation
  pattern: string;                   // e.g. "If + [subject] + [verb], [subject] + will + [verb]"
  examples: GrammarExample[];        // 2–3 examples from or inspired by the lesson
  common_mistakes_jp?: string;       // Common mistakes Japanese speakers make with this pattern
  audio_keys: {
    examples: string[];              // Reference keys for example audio
  };
}

interface GrammarExample {
  sentence_en: string;
  sentence_jp: string;
  annotation_jp?: string;            // Brief annotation pointing out the grammar in action
}
```

### CulturalNote

```typescript
interface CulturalNote {
  id: string;                        // e.g. "culture_0"
  title_en: string;                  // e.g. "How Americans Discuss AI at Work"
  title_jp: string;                  // e.g. "アメリカ人のAIに関するビジネス会話の特徴"
  content_en: string;                // English explanation
  content_jp: string;                // Japanese explanation
  category: 'professional' | 'cultural' | 'linguistic';
  tip_jp?: string;                   // Practical tip for Japanese professionals
}
```

### ComprehensionItem

```typescript
interface ComprehensionItem {
  id: string;                        // e.g. "check_0"
  type: 'vocabulary_match' | 'fill_in_blank' | 'sentence_order' | 'translation';
  question_en: string;
  question_jp: string;
  options?: string[];                // For multiple choice
  correct_answer: string | number;   // Answer or index
  explanation_jp: string;            // Why the answer is correct (in Japanese)
}
```

---

## 6. Content Generation Pipeline

### 6.1 Overview

ESL content is generated by sending the lesson's markdown content to the Claude API with a specialized system prompt. The generation runs server-side as a background job, not during the course wizard save (to avoid blocking the UI).

### 6.2 Generation Flow

```
1. Instructor saves course with esl_enabled = true
2. For each lesson in the course:
   a. Create esl_lessons row with status = 'generating'
   b. Dispatch background job (Vercel serverless function or Supabase Edge Function)
   c. Job calls Claude API with lesson markdown + ESL system prompt
   d. Claude returns structured JSON matching the ESL content schemas
   e. Validate JSON schema
   f. Store in esl_lessons.vocabulary_json, grammar_json, etc.
   g. Update status to 'review'
   h. Queue TTS audio generation for all vocabulary and example sentences
3. Instructor is notified (email or dashboard indicator) that ESL content is ready for review
4. Instructor reviews, optionally edits, and publishes
```

### 6.3 Claude API Call Specification

```typescript
// API call for ESL content generation
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: ESL_GENERATION_SYSTEM_PROMPT,   // See §6.4
    messages: [
      {
        role: 'user',
        content: `Generate ESL learning content from the following AI course lesson material.\n\nLesson Title: ${lesson.title_en}\n\nLesson Content:\n${lesson.markdown_content}\n\nSettings:\n- Target language: Japanese\n- Vocabulary depth: ${settings.vocab_depth}\n- Grammar points: ${settings.grammar_count}\n- Include cultural notes: ${settings.include_cultural}\n\nRespond ONLY with valid JSON matching the specified schema. No markdown, no preamble.`
      }
    ]
  })
});
```

### 6.4 System Prompt (ESL Generation)

```
You are an expert ESL (English as a Second Language) curriculum designer specializing in creating English learning materials for Japanese-speaking professionals. You have deep expertise in both English linguistics and Japanese language, and you understand the specific challenges Japanese speakers face when learning English.

Your task is to analyze AI course lesson content and extract/generate supplemental English learning materials.

REQUIREMENTS:

1. VOCABULARY (${vocab_count} items):
   - Extract key technical terms, professional vocabulary, and high-value English words/phrases from the lesson
   - Prioritize words that are: (a) essential for understanding the AI content, (b) useful in professional English contexts, (c) commonly challenging for Japanese speakers
   - For each term, provide:
     - Accurate IPA phonetic transcription
     - Clear English definition in the context of the lesson
     - Natural Japanese translation (use katakana for loanwords where standard, kanji/hiragana for native equivalents)
     - Part of speech
     - 2–3 natural usage sentences that connect to the lesson topic
     - Japanese translation of each usage sentence
     - Optional notes on nuance, common misuse, or register for Japanese speakers

2. GRAMMAR POINTS (${grammar_count} items):
   - Identify English grammar patterns that appear in the lesson content
   - Focus on patterns that: (a) are commonly difficult for Japanese speakers, (b) are important for professional English communication, (c) appear naturally in AI/tech discussion
   - For each point, provide:
     - Clear structural pattern
     - Plain English + Japanese explanation
     - 2–3 example sentences from or inspired by the lesson
     - Common mistakes Japanese speakers make with this pattern

3. CULTURAL/PROFESSIONAL NOTES (2–3 items):
   - Notes on how the English used in this lesson reflects American professional culture
   - Differences between how these concepts are discussed in American vs. Japanese professional contexts
   - Practical tips for Japanese professionals communicating about AI in English

4. COMPREHENSION CHECK (4–6 items):
   - Mix of vocabulary matching, fill-in-the-blank, and translation exercises
   - All exercises must be based on vocabulary and grammar from THIS lesson
   - Provide Japanese explanations for correct answers

OUTPUT FORMAT:
Respond with a single JSON object matching this exact structure:
{
  "vocabulary": [VocabularyItem, ...],
  "grammar": [GrammarPoint, ...],
  "cultural_notes": [CulturalNote, ...],
  "comprehension": [ComprehensionItem, ...]
}

All IDs must be sequential: vocab_0, vocab_1, ...; grammar_0, grammar_1, ...; etc.

QUALITY STANDARDS:
- Japanese translations must be natural and accurate — not machine-translation quality
- Phonetic transcriptions must use IPA notation
- Usage sentences must sound natural and professional, not constructed for language learning
- Grammar explanations should acknowledge and address Japanese L1 interference patterns
- Cultural notes should be respectful and genuinely useful, not stereotyping
```

### 6.5 Regeneration & Cache Invalidation

- The system prompt is versioned. A hash of the prompt is stored in `esl_lessons.generation_prompt_hash`
- If the system prompt is updated, admin can trigger regeneration for all ESL lessons or selectively
- If a lesson's markdown content is updated, the ESL content is flagged for regeneration (status → 'draft')
- Regeneration preserves any manual edits if the instructor chooses "merge" over "replace"

---

## 7. Audio Generation (TTS)

### 7.1 Service

**OpenAI Text-to-Speech API** (`tts-1` or `tts-1-hd` model)

> **Note:** Whisper AI is speech-to-text (transcription). For generating listenable pronunciation audio, we use OpenAI's TTS API, which produces natural-sounding English audio.

### 7.2 Voice Selection

| Context | Recommended Voice | Rationale |
|---|---|---|
| Vocabulary words (isolated) | `nova` | Clear, neutral, slightly slower articulation |
| Usage sentences | `nova` | Consistency with vocabulary audio |
| Grammar examples | `nova` | Same voice throughout for familiarity |

> Voice is configurable per course in ESL settings. Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`.

### 7.3 Audio Generation Flow

```
1. ESL content generated and saved (status = 'review')
2. For each vocabulary item:
   a. Generate audio for the isolated English term
   b. Generate audio for each usage sentence (English only)
3. For each grammar example:
   a. Generate audio for the example sentence (English only)
4. Store audio files in Supabase Storage bucket: `esl-audio/{course_id}/{lesson_id}/`
5. Create esl_audio records linking reference_keys to audio URLs
6. Audio files served via Supabase Storage CDN (or Vercel edge if preferred)
```

### 7.4 API Call

```typescript
const audioResponse = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'tts-1',          // or 'tts-1-hd' for higher quality
    voice: 'nova',
    input: text,
    response_format: 'mp3',
    speed: 0.9,              // Slightly slower for language learners
  })
});

const audioBuffer = await audioResponse.arrayBuffer();
// Upload to Supabase Storage
```

### 7.5 Audio Budget

| Item | Estimated Count per Lesson | Audio Duration |
|---|---|---|
| Vocabulary words | 10–15 | ~1–3 sec each |
| Usage sentences | 20–45 (2–3 per word) | ~3–8 sec each |
| Grammar examples | 6–15 (2–3 per point) | ~3–8 sec each |
| **Total per lesson** | **36–75 audio clips** | **~3–6 minutes total** |

At OpenAI TTS pricing (~$15 / 1M characters), a typical lesson's ESL audio costs approximately $0.02–$0.05 to generate. Negligible.

### 7.6 Playback UI

- Inline play button (▶) next to each vocabulary word and sentence
- Single-tap plays audio; tap again to replay
- Optional "Auto-play all" mode that walks through the vocabulary list
- Playback speed control: 0.75x (slow) / 1.0x (normal) — useful for learners
- Audio preloaded on lesson open for instant playback (lazy-load for below-fold items)

---

## 8. Student-Facing UI

### 8.1 ESL Section Placement

The ESL content appears as a dedicated tab or expandable section within the course player, positioned after the primary lesson content.

```
┌─────────────────────────────────────────────┐
│  Course Player                               │
│  ┌─────────────────────────────────────────┐ │
│  │  [Lesson Video / Content]                │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌──────────┬──────────────┐                 │
│  │  Lesson  │ English Study │  ← Tab nav     │
│  └──────────┴──────────────┘                 │
│                                               │
│  (When "English Study" tab is active:)       │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  📚 Key Vocabulary                       │ │
│  │  ┌─────────────────────────────────┐    │ │
│  │  │ prompt engineering          ▶   │    │ │
│  │  │ プロンプトエンジニアリング        │    │ │
│  │  │ /prɒmpt ˌɛndʒɪˈnɪərɪŋ/        │    │ │
│  │  │ noun · essential                │    │ │
│  │  │                                 │    │ │
│  │  │ The practice of crafting input  │    │ │
│  │  │ instructions to guide AI model  │    │ │
│  │  │ behavior and output quality.    │    │ │
│  │  │                                 │    │ │
│  │  │ AIモデルの動作と出力品質を導く     │    │ │
│  │  │ ための入力指示を作成する技術      │    │ │
│  │  │                                 │    │ │
│  │  │ Usage:                          │    │ │
│  │  │ "Effective prompt engineering    │    │ │
│  │  │  can dramatically improve AI    │    │ │
│  │  │  output quality."           ▶   │    │ │
│  │  │ 「効果的なプロンプトエンジニア     │    │ │
│  │  │  リングはAIの出力品質を劇的に     │    │ │
│  │  │  向上させることができる」         │    │ │
│  │  │                         [✓ 覚えた] │  │ │
│  │  └─────────────────────────────────┘    │ │
│  │                                          │ │
│  │  📝 Grammar Spotlight                    │ │
│  │  ┌─────────────────────────────────┐    │ │
│  │  │ Conditional: "If + present,     │    │ │
│  │  │              will + base verb"  │    │ │
│  │  │ ...                             │    │ │
│  │  └─────────────────────────────────┘    │ │
│  │                                          │ │
│  │  🌏 Cultural Notes                       │ │
│  │  💡 Comprehension Check                  │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 8.2 Component Breakdown

| Component | Description |
|---|---|
| `ESLTab` | Tab navigation within course player — toggles between lesson content and ESL content |
| `ESLLessonView` | Container for all ESL sections for a single lesson |
| `VocabularyCard` | Expandable card for a single vocabulary item — shows term, translation, audio, usage sentences |
| `VocabularyList` | Scrollable list of VocabularyCards with progress indicators |
| `AudioPlayButton` | Inline play button with loading/playing states, speed control |
| `GrammarSpotlight` | Card showing grammar pattern, explanation (EN/JP), examples with audio |
| `CulturalNoteCard` | Collapsible card for cultural/professional notes |
| `ComprehensionCheck` | Interactive quiz component — multiple choice, fill-in-blank, matching |
| `ESLProgressBar` | Visual indicator of vocabulary learned + comprehension score for this lesson |
| `ESLPurchaseCard` | CTA card shown to students who haven't purchased the ESL add-on |

### 8.3 Mobile Behavior

| Element | Mobile | Desktop |
|---|---|---|
| ESL section | Full-width below lesson content (no tabs — single scroll) | Tab within player sidebar or below video |
| Vocabulary cards | Full-width, vertically stacked | 2-column grid option |
| Audio buttons | 48px touch target, prominent placement | 36px, inline |
| Comprehension check | Full-width cards, large touch targets | Inline quiz |
| "Learned" toggle | Swipe-to-mark or tap button | Checkbox or button |

### 8.4 Locked State (No ESL Access)

When a student is enrolled in a course but has NOT purchased the ESL add-on (and `esl_included = false`):

- The "English Study" tab is visible but shows a soft lock overlay
- First vocabulary item is shown as a preview (blurred after that)
- Purchase CTA card is prominent:

```
┌─────────────────────────────────────────┐
│  🔒 English Study — Add-On              │
│                                          │
│  Strengthen your English while           │
│  mastering AI. Each lesson includes      │
│  vocabulary, pronunciation, grammar,     │
│  and professional usage notes.           │
│                                          │
│  AIを学びながら英語力も強化。各レッスンに  │
│  語彙、発音、文法、ビジネス英語の          │
│  ノートが含まれています。                  │
│                                          │
│  [Add English Study — $XX]               │
└─────────────────────────────────────────┘
```

---

## 9. Course Wizard Integration

### 9.1 Checkbox Placement

The ESL toggle appears in the course wizard's "Settings" or "Options" step, after lesson content has been defined:

```
Course Wizard — Step 3: Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Language:          [English ▾]
Level:             [Intermediate ▾]
Format:            [Self-paced ▾]
Price:             [$___]

━━━ Supplemental Content ━━━━━━━

☑ Create ESL Lesson from Course Material
  │
  ├─ Target language:    [Japanese ▾]
  ├─ Vocabulary depth:   ○ Essential (8–12 words)
  │                      ● Comprehensive (15–20 words)
  ├─ Grammar points:     [3 per lesson ▾]
  ├─ Include cultural notes: ☑
  ├─ Generate audio:     ☑
  │
  ├─ Pricing:
  │   ○ Included with course (no extra charge)
  │   ● Add-on purchase:  [$79 ▾]
  │
  └─ TTS Voice:          [Nova ▾]
```

### 9.2 Generation Trigger

ESL content generation is triggered AFTER the course is saved (not during save):

1. Course save completes normally
2. If `esl_enabled = true` and lessons exist without ESL content:
   - Dispatch async generation job
   - Show toast: "ESL content is being generated. You'll be notified when it's ready for review."
3. Generation runs in background (Vercel serverless function with 5-minute timeout per lesson, or Supabase Edge Function)
4. On completion, instructor sees "ESL content ready for review" badge in dashboard

### 9.3 Editing Generated Content

Instructors can review and edit ESL content before publishing:

- Each vocabulary item, grammar point, and cultural note is individually editable
- Japanese translations can be corrected by the instructor or a reviewer
- Audio can be regenerated for individual items after text edits
- "Regenerate All" button re-runs the Claude API for the entire lesson
- "Publish ESL" button moves status from 'review' → 'published'

---

## 10. Admin & Instructor Controls

### 10.1 ESL Dashboard (Instructor View)

```
ESL Content Status — [Course Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lesson 1: Understanding AI Today     ● Published    [Edit] [Regenerate]
Lesson 2: AI in Daily Life           ● Published    [Edit] [Regenerate]
Lesson 3: Practical Applications     ○ In Review    [Edit] [Publish]
Lesson 4: Collaboration              ◌ Generating   [—]
Lesson 5: Workflow Building          ◌ Queued       [—]

[Regenerate All] [Publish All Reviewed]

━━━ ESL Analytics ━━━━━━━━━━━━━━━━

Add-on purchases:       12 / 28 enrolled (43%)
Avg. vocabulary learned: 67%
Avg. comprehension score: 78%
Most played audio:       "prompt engineering" (45 plays)
```

### 10.2 Bulk Operations

- **Regenerate All** — Re-runs Claude API generation for all lessons in the course
- **Publish All Reviewed** — Moves all 'review' status items to 'published'
- **Export ESL Content** — Downloads all ESL content as JSON (for backup or external use)
- **Import ESL Edits** — Upload edited JSON to overwrite specific vocabulary/grammar items

---

## 11. i18n Strings

### English (`messages/en.json`)

```json
{
  "esl": {
    "tab_label": "English Study",
    "vocabulary_heading": "Key Vocabulary",
    "grammar_heading": "Grammar Spotlight",
    "cultural_heading": "Cultural & Professional Notes",
    "comprehension_heading": "Comprehension Check",
    "audio_play": "Play pronunciation",
    "audio_slow": "Play slowly",
    "mark_learned": "Mark as learned",
    "mark_unlearned": "Mark as not learned",
    "learned_count": "{count} of {total} words learned",
    "comprehension_score": "Score: {score}%",
    "check_answer": "Check Answer",
    "show_explanation": "Show Explanation",
    "next_question": "Next Question",
    "usage_label": "Usage",
    "notes_label": "Notes",
    "difficulty_essential": "Essential",
    "difficulty_intermediate": "Intermediate",
    "difficulty_advanced": "Advanced",
    "purchase_title": "English Study — Add-On",
    "purchase_description": "Strengthen your English while mastering AI. Each lesson includes vocabulary, pronunciation, grammar, and professional usage notes.",
    "purchase_cta": "Add English Study — ${price}",
    "wizard_checkbox": "Create ESL Lesson from Course Material",
    "wizard_target_lang": "Target language",
    "wizard_vocab_depth": "Vocabulary depth",
    "wizard_vocab_essential": "Essential (8–12 words)",
    "wizard_vocab_comprehensive": "Comprehensive (15–20 words)",
    "wizard_grammar_count": "Grammar points per lesson",
    "wizard_cultural": "Include cultural notes",
    "wizard_audio": "Generate pronunciation audio",
    "wizard_pricing_included": "Included with course",
    "wizard_pricing_addon": "Add-on purchase",
    "wizard_tts_voice": "TTS voice",
    "status_generating": "Generating ESL content...",
    "status_ready": "ESL content ready for review",
    "status_published": "Published"
  }
}
```

### Japanese (`messages/ja.json`)

```json
{
  "esl": {
    "tab_label": "英語学習",
    "vocabulary_heading": "重要語彙",
    "grammar_heading": "文法ポイント",
    "cultural_heading": "文化・ビジネスノート",
    "comprehension_heading": "理解度チェック",
    "audio_play": "発音を再生",
    "audio_slow": "ゆっくり再生",
    "mark_learned": "覚えた",
    "mark_unlearned": "未習得に戻す",
    "learned_count": "{total}語中{count}語習得",
    "comprehension_score": "スコア: {score}%",
    "check_answer": "答えを確認",
    "show_explanation": "解説を見る",
    "next_question": "次の問題",
    "usage_label": "使用例",
    "notes_label": "メモ",
    "difficulty_essential": "必須",
    "difficulty_intermediate": "中級",
    "difficulty_advanced": "上級",
    "purchase_title": "英語学習 — アドオン",
    "purchase_description": "AIを学びながら英語力も強化。各レッスンに語彙、発音、文法、ビジネス英語のノートが含まれています。",
    "purchase_cta": "英語学習を追加 — {price}",
    "wizard_checkbox": "コース教材からESLレッスンを作成",
    "wizard_target_lang": "対象言語",
    "wizard_vocab_depth": "語彙の深さ",
    "wizard_vocab_essential": "基本（8〜12語）",
    "wizard_vocab_comprehensive": "包括的（15〜20語）",
    "wizard_grammar_count": "レッスンあたりの文法ポイント数",
    "wizard_cultural": "文化ノートを含める",
    "wizard_audio": "発音音声を生成",
    "wizard_pricing_included": "コースに含まれる",
    "wizard_pricing_addon": "追加購入",
    "wizard_tts_voice": "TTS音声",
    "status_generating": "ESLコンテンツを生成中...",
    "status_ready": "ESLコンテンツのレビュー準備完了",
    "status_published": "公開済み"
  }
}
```

---

## 12. API Routes

### New Routes

```
app/api/
├── esl/
│   ├── generate/
│   │   └── route.ts              # POST — Trigger ESL generation for a course/lesson
│   ├── [lessonId]/
│   │   ├── route.ts              # GET — Fetch ESL content for a lesson
│   │   └── publish/
│   │       └── route.ts          # POST — Publish ESL content (instructor)
│   ├── audio/
│   │   └── generate/
│   │       └── route.ts          # POST — Trigger TTS generation for ESL content
│   ├── progress/
│   │   └── route.ts              # POST — Update student ESL progress
│   └── purchase/
│       └── route.ts              # POST — Create Stripe checkout for ESL add-on
```

### Route Details

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/esl/generate` | POST | Instructor | Accepts `{ course_id }` or `{ lesson_id }`. Queues ESL generation. |
| `/api/esl/[lessonId]` | GET | Enrolled student or instructor | Returns ESL content JSON. Checks enrollment + ESL access. |
| `/api/esl/[lessonId]/publish` | POST | Instructor | Updates esl_lessons status to 'published'. |
| `/api/esl/audio/generate` | POST | Instructor | Accepts `{ esl_lesson_id }`. Generates TTS audio for all items. |
| `/api/esl/progress` | POST | Authenticated | Accepts `{ esl_lesson_id, vocabulary_completed, comprehension_score }`. |
| `/api/esl/purchase` | POST | Authenticated | Creates Stripe Checkout Session for ESL add-on. |

### Webhook Addition

Add to existing `/api/stripe/webhook/route.ts`:

```typescript
// Handle ESL add-on purchase
case 'checkout.session.completed': {
  const session = event.data.object;
  if (session.metadata?.type === 'esl_addon') {
    await supabase.from('esl_purchases').insert({
      user_id: session.metadata.user_id,
      course_id: session.metadata.course_id,
      stripe_session_id: session.id,
      amount_paid: session.amount_total,
      currency: session.currency,
    });
  }
  break;
}
```

---

## 13. Stripe Integration (Add-On)

### Product Setup

Each course with ESL as an add-on gets a corresponding Stripe Product:

```
Product: "English Study Add-On — [Course Name]"
Price (USD): $79.00 (configurable per course)
Price (JPY): ¥11,800 (configurable per course)
Metadata: { type: 'esl_addon', course_id: '...' }
```

### Checkout Flow

1. Student clicks "Add English Study" on course player or course page
2. POST to `/api/esl/purchase` with `{ course_id }`
3. API creates Stripe Checkout Session with ESL product
4. Student completes payment on Stripe-hosted checkout
5. Webhook creates `esl_purchases` record
6. Student redirected back to course player — ESL content now unlocked

---

## 14. File Map

### New Files

```
app/
├── [locale]/learn/dashboard/[course-slug]/
│   └── esl/                             # ESL sub-route within course player (if separate page)
│       └── page.tsx
├── api/esl/
│   ├── generate/route.ts
│   ├── [lessonId]/
│   │   ├── route.ts
│   │   └── publish/route.ts
│   ├── audio/generate/route.ts
│   ├── progress/route.ts
│   └── purchase/route.ts

components/
├── esl/
│   ├── ESLTab.tsx                       # Tab toggle in course player
│   ├── ESLLessonView.tsx                # Container for all ESL sections
│   ├── VocabularyCard.tsx               # Single vocabulary item with audio
│   ├── VocabularyList.tsx               # Scrollable list with progress
│   ├── AudioPlayButton.tsx              # Inline audio player
│   ├── GrammarSpotlight.tsx             # Grammar point card
│   ├── CulturalNoteCard.tsx             # Cultural/professional note
│   ├── ComprehensionCheck.tsx           # Interactive quiz
│   ├── ESLProgressBar.tsx               # Lesson-level ESL progress
│   ├── ESLPurchaseCard.tsx              # Upsell CTA for locked state
│   └── ESLAdminDashboard.tsx            # Instructor view for ESL management

lib/
├── esl/
│   ├── generate.ts                      # Claude API call + JSON validation
│   ├── tts.ts                           # OpenAI TTS generation + storage
│   ├── schemas.ts                       # Zod schemas for ESL content validation
│   └── access.ts                        # ESL access check logic

messages/
├── en.json                              # Add "esl" namespace (see §11)
└── ja.json                              # Add "esl" namespace (see §11)
```

### Modified Files

```
components/learn/CoursePlayer.tsx         # Add ESL tab
components/learn/CourseWizard.tsx         # Add ESL settings section
app/api/stripe/webhook/route.ts          # Add ESL purchase handler
lib/supabase/types.ts                    # Add ESL table types
```

---

## 15. Build Order

### Phase 2A-ESL: Data + Generation (Aligned with LMS Phase 2)

1. **Database migrations** — Create `esl_lessons`, `esl_audio`, `esl_progress`, `esl_purchases` tables + RLS policies
2. **Alter courses table** — Add ESL columns
3. **ESL schemas** — Zod validation schemas for all content types (`lib/esl/schemas.ts`)
4. **Generation pipeline** — Claude API integration + JSON parsing + validation (`lib/esl/generate.ts`)
5. **API route: generate** — `/api/esl/generate`
6. **API route: fetch** — `/api/esl/[lessonId]`
7. **Test generation** — Run against sample lesson markdown, validate output quality

### Phase 2B-ESL: Audio + Student UI

8. **TTS pipeline** — OpenAI TTS integration + Supabase Storage upload (`lib/esl/tts.ts`)
9. **API route: audio generate** — `/api/esl/audio/generate`
10. **Student components** — `VocabularyCard`, `AudioPlayButton`, `GrammarSpotlight`, `CulturalNoteCard`, `ComprehensionCheck`
11. **ESL lesson view** — `ESLLessonView` container assembling all components
12. **Course player integration** — Add ESL tab to `CoursePlayer`
13. **Progress tracking** — `ESLProgressBar` + API route
14. **Test student flow** — End-to-end: lesson → ESL tab → audio playback → progress tracking

### Phase 2C-ESL: Monetization + Admin

15. **Stripe ESL product setup** — Create products/prices for add-on
16. **Purchase flow** — `ESLPurchaseCard` + API route + webhook handler
17. **Access control** — Locked state UI + access check middleware (`lib/esl/access.ts`)
18. **Course wizard integration** — ESL checkbox + settings in wizard
19. **Admin dashboard** — `ESLAdminDashboard` for instructor review + publish
20. **i18n** — Complete EN + JP strings for all ESL UI

---

## 16. Open Questions

| Question | Context | Priority | Owner |
|---|---|---|---|
| ESL add-on price point? | $49 / $79 / $99 — needs market testing. Vertice cohort may include it bundled. | 🟡 High | Ryan |
| OpenAI API key provisioning? | TTS requires OpenAI API access. Separate from Claude API key. Budget ~$5/course for audio generation. | 🔴 Blocking (before audio build) | Ryan / Dev |
| Manual JP review workflow? | Who reviews generated Japanese translations before publish? Ryan? External reviewer? | 🟡 High | Ryan |
| Vocabulary word limit per lesson? | 8–12 (essential) vs 15–20 (comprehensive) — is this per lesson or should it adapt to lesson length? | 🟠 Medium | Ryan |
| Expand beyond Japanese? | Architecture supports other target languages. Korean? Chinese? When? | 🟢 Future | Ryan |
| SRS (Spaced Repetition) integration? | Should vocabulary "learned" status feed into a spaced repetition system for long-term retention? Phase 3 feature? | 🟢 Future | Ryan |
| Audio caching strategy? | Audio files are static once generated. CDN cache headers? Supabase Storage is fine for V1 but may need optimization at scale. | 🟠 Medium | Dev |
| Offline access? | Should ESL content (including audio) be downloadable for offline study? Progressive Web App consideration. | 🟢 Future | Ryan |

---

## Appendix: Sample Generated ESL Content

Below is an example of what the Claude API would generate for a lesson on "Prompt Engineering" from the AI Mastery course. This illustrates the expected output quality and structure.

### Sample Vocabulary Item

```json
{
  "id": "vocab_0",
  "term_en": "prompt engineering",
  "reading_en": "/prɒmpt ˌɛndʒɪˈnɪərɪŋ/",
  "definition_en": "The practice of designing and refining input instructions to guide AI model behavior, output quality, and task completion.",
  "definition_jp": "AIモデルの動作、出力品質、タスク実行を導くための入力指示を設計・改善する技術。",
  "term_jp": "プロンプトエンジニアリング",
  "part_of_speech": "noun",
  "difficulty": "essential",
  "usage_sentences": [
    {
      "sentence_en": "Effective prompt engineering can dramatically improve the quality of AI-generated content.",
      "sentence_jp": "効果的なプロンプトエンジニアリングは、AI生成コンテンツの品質を劇的に向上させることができます。",
      "highlight_indices": [10, 30]
    },
    {
      "sentence_en": "Our team invested two weeks in prompt engineering before deploying the customer service chatbot.",
      "sentence_jp": "チームはカスタマーサービスチャットボットの導入前に、2週間をプロンプトエンジニアリングに投資しました。",
      "highlight_indices": [33, 53]
    }
  ],
  "notes_jp": "日本語では「プロンプト設計」とも言いますが、英語圏のビジネスでは「prompt engineering」が標準的な表現です。履歴書やLinkedInプロフィールにも使える専門用語です。",
  "audio_keys": {
    "word": "vocab_0_word",
    "sentences": ["vocab_0_sentence_0", "vocab_0_sentence_1"]
  }
}
```

### Sample Grammar Point

```json
{
  "id": "grammar_0",
  "title_en": "Modal Verbs for Possibility: 'can' vs 'could' vs 'may'",
  "title_jp": "可能性を表す助動詞：can / could / may の使い分け",
  "explanation_en": "In professional English, choosing between 'can', 'could', and 'may' signals different levels of certainty and formality.",
  "explanation_jp": "ビジネス英語では、can / could / may の選択により、確信度とフォーマルさが変わります。日本語の「できる」「かもしれない」とは異なるニュアンスがあります。",
  "pattern": "Subject + can/could/may + base verb",
  "examples": [
    {
      "sentence_en": "AI can analyze thousands of documents in minutes.",
      "sentence_jp": "AIは数分で何千もの文書を分析できます。",
      "annotation_jp": "can = 能力・事実（確信度が高い）"
    },
    {
      "sentence_en": "This approach could reduce processing time by 40%.",
      "sentence_jp": "このアプローチにより、処理時間が40%短縮される可能性があります。",
      "annotation_jp": "could = 可能性（canより控えめ・丁寧）"
    },
    {
      "sentence_en": "The new model may outperform the current system.",
      "sentence_jp": "新しいモデルは現在のシステムを上回る可能性があります。",
      "annotation_jp": "may = 不確実な可能性（フォーマルな表現）"
    }
  ],
  "common_mistakes_jp": "日本語話者は「できる」をすべてcanで表現しがちですが、ビジネスではcouldやmayを使うことで、より丁寧で控えめな印象を与えます。特に提案や予測の場面ではcouldが好まれます。",
  "audio_keys": {
    "examples": ["grammar_0_example_0", "grammar_0_example_1", "grammar_0_example_2"]
  }
}
```

---

*ESL Lesson Generator — Feature Specification v1.0 | HonuVibe.AI | March 2026*

*Made in Hawaii with Aloha 🐢*
