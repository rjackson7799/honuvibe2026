-- ============================================================
-- Flagship course selling-copy rewrite — AI Foundations for Business (HV-AI101)
-- Source: Fable 5 (Brief 5), against supabase/seed_demo_courses.sql
-- Apply MANUALLY in the Supabase dashboard SQL editor (zvfwtndbxshrtpwcwynw).
-- NOT a migration — do not place under supabase/migrations/.
-- ============================================================
--
-- BEFORE YOU RUN — two checks:
-- 1. JP REVIEW: the Japanese below is a draft. Have a native reviewer approve it first.
-- 2. FACT DIFF: this copy was written against the SEED. If production has drifted, these
--    fact-adjacent lines must match prod or be corrected before running:
--      - "Eight weeks" / "8週間"            (total_weeks = 8)
--      - schedule_notes: Wed 7:00 PM HST / Thu 2:00 PM JST
--      - cancellation_policy: full refund within 7 days; 50% up to Week 3; none after
--      - completion_requirements: "6 of the 8 sessions" / "全8回のうち6回"
--    Prices, dates, counts, tools, and tags are NOT touched by this script.
--
-- Wrapped in a transaction: if any statement errors, nothing is applied.
-- Targets by slug so it works regardless of the production course id.
-- ============================================================

BEGIN;

UPDATE courses SET
  title_jp = $c$仕事で使えるAIの基礎$c$,
  description_en = $c$Eight weeks of live classes that take you from AI-curious to AI-capable — working with ChatGPT, Claude, and the tools professionals actually use, on your own real work. No code and no hype: you leave with working workflows and an AI plan built for your business.$c$,
  description_jp = $c$8週間のライブ授業で、「AIが気になる」から「仕事で使える」へ。ChatGPTやClaudeを自分の実務で使いこなし、最終週にはあなたのビジネス専用のAI活用プランを持ち帰ります。コーディングは不要です。$c$,
  learning_outcomes_en = $c$["Size up what AI can and can't do for your business — and spot where it pays off first", "Write prompts that get the same good result every time", "Automate your repetitive work with AI assistants", "Pick the right AI tool for each job — and confidently skip the rest", "Build an AI integration plan you can start running on Monday", "Set AI and data-privacy ground rules you can stand behind"]$c$::jsonb,
  learning_outcomes_jp = $c$["自分のビジネスでAIに何ができて何ができないか、見極められるようになる", "毎回同じ品質の結果が出るプロンプトを書けるようになる", "繰り返し作業をAIアシスタントに任せて自動化する", "目的に合ったAIツールを、自分の基準で選べるようになる", "週明けから動かせるAI活用プランを作り上げる", "データプライバシーとAI倫理に、自信を持って線を引けるようになる"]$c$::jsonb,
  who_is_for_en = $c$["Business owners who want AI in their daily operations, not just in their news feed", "Marketers who want to produce content faster without losing their voice", "Managers who want their team doing more without staying later", "Entrepreneurs testing AI-powered business ideas", "Anyone who's been AI-curious for months and is ready to actually start"]$c$::jsonb,
  who_is_for_jp = $c$["AIをニュースの話題ではなく、日々の業務にしたいビジネスオーナー", "自分らしい表現のまま、コンテンツ制作を速くしたいマーケター", "残業を増やさずに、チームの成果を増やしたいマネージャー", "AIを使ったビジネスアイデアを形にして試したい起業家", "ずっと「気になっていた」AIを、そろそろ始めたい方"]$c$::jsonb,
  prerequisites_en = $c$No technical background needed — if you're comfortable with email and a web browser, you're ready. We set up every tool together in class.$c$,
  prerequisites_jp = $c$技術的な予備知識は要りません。メールとブラウザが使えれば十分です。ツールの設定は、授業の中で一緒に行います。$c$,
  schedule_notes_en = $c$Live every Wednesday at 7:00 PM HST (Thursday 2:00 PM JST). Can't make one? Every session is recorded, so you can catch up anytime.$c$,
  schedule_notes_jp = $c$ライブ授業は毎週水曜19:00(ハワイ時間)/木曜14:00(日本時間)。参加できない週があっても、録画でいつでも追いつけます。$c$,
  cancellation_policy_en = $c$If the first week tells you it's not a fit, you'll get a full refund — no hoops, within 7 days of the course start. Up to Week 3, half comes back. After Week 3, refunds close.$c$,
  cancellation_policy_jp = $c$開始から7日以内なら、全額返金します。引き止めはしません。第3週までは受講料の50%を返金。それ以降の返金は承っていません。$c$,
  completion_requirements_en = $c$["Show up — live or by replay — for at least 6 of the 8 sessions", "Complete the weekly assignments (each one small, and built on your own work)", "Submit your final AI integration plan — the thing you came for"]$c$::jsonb,
  completion_requirements_jp = $c$["全8回のうち6回以上に参加(ライブまたは録画視聴でOK)", "毎週の課題を完了(どれも小さく、自分の仕事が題材です)", "最終のAI活用プランを提出 — これがこの講座の持ち帰りです"]$c$::jsonb,
  materials_summary_en = $c$[{"material": "Full session slide decks (PDF)", "language": "EN + JP", "provided_with": "Each session"}, {"material": "Ready-to-use prompt template library", "language": "EN", "provided_with": "Week 1"}, {"material": "AI tool comparison guide — which tool for which job", "language": "EN + JP", "provided_with": "Week 2"}, {"material": "Final integration-plan template", "language": "EN", "provided_with": "Week 6"}]$c$::jsonb,
  materials_summary_jp = $c$[{"material": "全セッションのスライド(PDF)", "language": "EN + JP", "provided_with": "各セッション"}, {"material": "そのまま使えるプロンプトテンプレート集", "language": "EN", "provided_with": "第1週"}, {"material": "AIツール比較ガイド — どの仕事にどのツールか", "language": "EN + JP", "provided_with": "第2週"}, {"material": "最終課題(AI活用プラン)のテンプレート", "language": "EN", "provided_with": "第6週"}]$c$::jsonb
WHERE slug = 'ai-foundations-for-business';

-- ── Weeks (course_weeks) — targeted by slug + week_number ──

UPDATE course_weeks SET
  title_en = $c$What Is AI, Really?$c$,
  subtitle_en = $c$The hype, separated from the reality$c$,
  description_en = $c$Build a working mental model of AI, machine learning, and large language models — so you can explain in plain words what they can and can't do today.$c$,
  title_jp = $c$AIとは、結局なんなのか$c$,
  subtitle_jp = $c$誇大広告と現実を切り分ける$c$,
  description_jp = $c$AI・機械学習・大規模言語モデルの仕組みを、自分の言葉で説明できるようになる週。今のAIにできること、まだできないことを見極めます。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 1;

UPDATE course_weeks SET
  title_en = $c$Your First AI Conversations$c$,
  subtitle_en = $c$Getting started with ChatGPT and Claude$c$,
  description_en = $c$Accounts set up, interfaces demystified — and your first genuinely useful AI conversations, run on your own real tasks.$c$,
  title_jp = $c$はじめてのAIとの対話$c$,
  subtitle_jp = $c$ChatGPTとClaudeを使いはじめる$c$,
  description_jp = $c$アカウント設定から画面の見方まで、授業の中で一緒にセットアップ。自分の実際の仕事を題材に、最初の「役に立つ対話」をAIと交わします。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 2;

UPDATE course_weeks SET
  title_en = $c$The Art of Prompting$c$,
  subtitle_en = $c$Writing prompts that actually work$c$,
  description_en = $c$Put the CRAFT framework to work on real business scenarios — your prompts stop being lucky guesses and start being repeatable.$c$,
  title_jp = $c$プロンプトの技術$c$,
  subtitle_jp = $c$ちゃんと機能するプロンプトの書き方$c$,
  description_jp = $c$CRAFTフレームワークを、実際のビジネスシナリオで練習。プロンプトが「たまたま当たる」から「毎回効く」に変わります。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 3;

UPDATE course_weeks SET
  title_en = $c$AI for Content & Communication$c$,
  subtitle_en = $c$Emails, reports, social media, and more$c$,
  description_en = $c$Draft emails, reports, and social posts with AI — faster, and still unmistakably in your voice.$c$,
  title_jp = $c$AIで書く、伝える$c$,
  subtitle_jp = $c$メールからレポート、SNSまで$c$,
  description_jp = $c$メール、レポート、SNS投稿をAIと一緒に下書き。速くなっても、あなたの声はそのままです。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 4;

UPDATE course_weeks SET
  title_en = $c$AI for Research & Analysis$c$,
  subtitle_en = $c$Making better decisions with AI$c$,
  description_en = $c$Run deep research with Perplexity and NotebookLM, fact-check what AI tells you, and build a research workflow you'll reuse for years.$c$,
  title_jp = $c$AIで調べ、AIで決める$c$,
  subtitle_jp = $c$意思決定の質を上げる$c$,
  description_jp = $c$PerplexityとNotebookLMで深いリサーチを実践。AIの答えを鵜呑みにせず確かめる習慣と、長く使えるリサーチの型を身につけます。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 5;

UPDATE course_weeks SET
  title_en = $c$Visual AI & Design$c$,
  subtitle_en = $c$Creating visuals without a designer$c$,
  description_en = $c$Make professional visuals with Canva AI, image generation, and presentation tools — no designer on payroll required.$c$,
  title_jp = $c$AIでつくるビジュアル$c$,
  subtitle_jp = $c$デザイナーがいなくても、ここまでできる$c$,
  description_jp = $c$Canva AIや画像生成、プレゼンツールを使って、プロ品質のビジュアルを自分の手で。外注に頼らず形にします。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 6;

UPDATE course_weeks SET
  title_en = $c$AI Ethics & Data Privacy$c$,
  subtitle_en = $c$Responsible AI for your organization$c$,
  description_en = $c$Get clear on privacy, bias, intellectual property, and compliance — and leave with a working AI usage policy for your team.$c$,
  title_jp = $c$AI倫理とデータプライバシー$c$,
  subtitle_jp = $c$組織で安心して使うために$c$,
  description_jp = $c$プライバシー、バイアス、知的財産、コンプライアンスを一つずつ整理。チームでそのまま使えるAI利用ポリシーを作って持ち帰ります。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 7;

UPDATE course_weeks SET
  title_en = $c$Your AI Integration Plan$c$,
  subtitle_en = $c$Bringing it all together$c$,
  description_en = $c$Turn eight weeks of practice into a personalized AI roadmap for your business — present it, get feedback from your cohort and instructor, and finish knowing exactly what to do next.$c$,
  title_jp = $c$あなたのAI活用プラン$c$,
  subtitle_jp = $c$8週間の総仕上げ$c$,
  description_jp = $c$8週間の実践を、あなたのビジネス専用のAIロードマップに。仲間と講師のフィードバックを受けて発表し、「次にやること」が明確な状態で修了します。$c$
WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') AND week_number = 8;

COMMIT;

-- Sanity check (run after COMMIT):
-- SELECT title_en, title_jp, left(description_en, 60) FROM courses WHERE slug = 'ai-foundations-for-business';
-- SELECT week_number, title_en, title_jp FROM course_weeks
--   WHERE course_id = (SELECT id FROM courses WHERE slug = 'ai-foundations-for-business') ORDER BY week_number;
