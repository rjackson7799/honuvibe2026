-- ============================================================
-- DEMO COURSE SEED DATA
-- ============================================================
-- Populates 3 bilingual courses with full curriculum for
-- demonstrating the student learning experience.
--
-- Usage:
--   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed_demo_courses.sql
--   OR paste into Supabase Dashboard SQL Editor
--
-- Safe to re-run: cleans up previous demo data then re-inserts
-- ============================================================

-- Clean up previous demo data (cascading deletes handle child tables)
DELETE FROM courses WHERE slug IN (
  'ai-foundations-for-business',
  'ai-powered-productivity',
  'building-ai-first-products'
);

-- Deterministic UUIDs for cross-table references
-- Course IDs
-- C1 = ai-foundations-for-business  = 'a0000000-0000-4000-8000-000000000001'
-- C2 = ai-powered-productivity      = 'a0000000-0000-4000-8000-000000000002'
-- C3 = building-ai-first-products    = 'a0000000-0000-4000-8000-000000000003'
--
-- Week IDs: 'b0000000-0000-4000-8000-0000CC00WW00'
--   where CC = course number (01-03), WW = week number (01-10)
--
-- Session IDs: 'c0000000-0000-4000-8000-00CC00WW00SS'
--   where SS = session number
--
-- Assignment IDs: 'd0000000-0000-4000-8000-00CC00WW00AA'

-- ============================================================
-- 1. COURSES
-- ============================================================

INSERT INTO courses (
  id, slug, course_id_code, course_type,
  title_en, title_jp, description_en, description_jp,
  instructor_name,
  price_usd, price_jpy,
  language, subtitle_language, level, format,
  start_date, end_date, total_weeks,
  live_sessions_count, recorded_lessons_count,
  max_enrollment, current_enrollment,
  learning_outcomes_en, learning_outcomes_jp,
  prerequisites_en, prerequisites_jp,
  who_is_for_en, who_is_for_jp,
  tools_covered,
  community_platform, community_duration_months, community_link,
  zoom_link,
  schedule_notes_en, schedule_notes_jp,
  cancellation_policy_en, cancellation_policy_jp,
  completion_requirements_en, completion_requirements_jp,
  materials_summary_en, materials_summary_jp,
  tags,
  is_featured, is_published, status
) VALUES

-- ── Course 1: AI Foundations for Business (Beginner, 8 weeks) ──
(
  'a0000000-0000-4000-8000-000000000001',
  'ai-foundations-for-business',
  'HV-AI101',
  'cohort',
  'AI Foundations for Business',
  'ビジネスのためのAI基礎',
  'Master the fundamentals of AI for real-world business applications. Learn to leverage ChatGPT, Claude, and other AI tools to save time, make better decisions, and unlock new opportunities — no coding required.',
  'ビジネスにおけるAIの基礎をマスターしましょう。ChatGPT、Claude、その他のAIツールを活用して、時間を節約し、より良い意思決定を行い、新しい機会を開拓する方法を学びます。コーディング不要です。',
  'Ryan Jackson',
  29700, 44800,
  'both', 'Japanese subtitles available',
  'beginner', 'Live Online',
  CURRENT_DATE + interval '14 days',
  CURRENT_DATE + interval '14 days' + interval '8 weeks',
  8, 8, 4, 25, 0,
  '["Understand what AI can and cannot do for your business", "Write effective prompts that get consistent results", "Automate repetitive tasks using AI assistants", "Evaluate AI tools and choose the right ones for your needs", "Build an AI integration plan for your workflow", "Navigate AI ethics and data privacy considerations"]'::jsonb,
  '["ビジネスにおけるAIの可能性と限界を理解する", "一貫した結果を得る効果的なプロンプトを書く", "AIアシスタントを使って繰り返し作業を自動化する", "AIツールを評価し、ニーズに合ったものを選ぶ", "ワークフローにAI統合計画を構築する", "AI倫理とデータプライバシーに対応する"]'::jsonb,
  'No technical background required. Basic computer skills and familiarity with web browsers.',
  '技術的な背景は不要です。基本的なパソコンスキルとウェブブラウザの操作に慣れていること。',
  '["Business owners looking to integrate AI into daily operations", "Marketing professionals who want to create content faster", "Managers seeking to improve team productivity with AI", "Entrepreneurs exploring AI-powered business ideas", "Anyone curious about practical AI applications"]'::jsonb,
  '["日常業務にAIを統合したいビジネスオーナー", "コンテンツ作成を効率化したいマーケティング担当者", "AIでチームの生産性を向上させたいマネージャー", "AI活用のビジネスアイデアを探る起業家", "実用的なAI活用に興味がある方"]'::jsonb,
  '["ChatGPT", "Claude", "Perplexity", "Canva AI", "NotebookLM"]'::jsonb,
  'Skool', 6, NULL,
  NULL,
  'Live sessions every Wednesday at 7:00 PM HST (Thursday 2:00 PM JST). Sessions are recorded for async viewing.',
  'ライブセッションは毎週水曜日ハワイ時間19:00（木曜日日本時間14:00）。録画は後日視聴可能です。',
  'Full refund within 7 days of course start. 50% refund up to Week 3. No refunds after Week 3.',
  '開始7日以内は全額返金。第3週までは50%返金。第3週以降の返金はありません。',
  '["Attend or watch at least 6 of 8 live sessions", "Complete all weekly assignments", "Submit final AI integration plan"]'::jsonb,
  '["8回中6回以上のライブセッションに参加または視聴", "毎週の課題をすべて完了", "最終AI統合プランを提出"]'::jsonb,
  '[{"material": "Session slides (PDF)", "language": "EN + JP", "provided_with": "Each session"}, {"material": "Prompt template library", "language": "EN", "provided_with": "Week 1"}, {"material": "AI tool comparison guide", "language": "EN + JP", "provided_with": "Week 2"}, {"material": "Final project template", "language": "EN", "provided_with": "Week 6"}]'::jsonb,
  '[{"material": "セッションスライド（PDF）", "language": "EN + JP", "provided_with": "各セッション"}, {"material": "プロンプトテンプレートライブラリ", "language": "EN", "provided_with": "第1週"}, {"material": "AIツール比較ガイド", "language": "EN + JP", "provided_with": "第2週"}, {"material": "最終プロジェクトテンプレート", "language": "EN", "provided_with": "第6週"}]'::jsonb,
  '["ai-fundamentals", "prompt-engineering", "business-ai", "chatgpt", "claude"]'::jsonb,
  true, true, 'published'
),

-- ── Course 2: AI-Powered Productivity Mastery (Intermediate, 6 weeks) ──
(
  'a0000000-0000-4000-8000-000000000002',
  'ai-powered-productivity',
  'HV-AI201',
  'cohort',
  'AI-Powered Productivity Mastery',
  'AI活用プロダクティビティ・マスタリー',
  'Go beyond the basics. Build automated workflows, master advanced prompting techniques, and create systems that multiply your output. This hands-on course transforms how you work with AI every day.',
  '基礎を超えましょう。自動化ワークフローの構築、高度なプロンプティング技術の習得、アウトプットを倍増させるシステムの作成。このハンズオンコースで毎日のAI活用を変革します。',
  'Ryan Jackson',
  49700, 74800,
  'both', 'Japanese subtitles available',
  'intermediate', 'Hybrid (Live + Recorded)',
  CURRENT_DATE + interval '21 days',
  CURRENT_DATE + interval '21 days' + interval '6 weeks',
  6, 6, 6, 20, 0,
  '["Design multi-step AI workflows for complex tasks", "Master chain-of-thought and few-shot prompting patterns", "Build no-code automations with Zapier + AI", "Create reusable prompt libraries for your team", "Integrate AI into project management and communication", "Measure and optimize AI ROI for your organization"]'::jsonb,
  '["複雑なタスクのためのマルチステップAIワークフローを設計する", "Chain-of-ThoughtとFew-Shotプロンプティングパターンを習得する", "Zapier + AIでノーコード自動化を構築する", "チーム用の再利用可能なプロンプトライブラリを作成する", "プロジェクト管理とコミュニケーションにAIを統合する", "組織のAI ROIを測定・最適化する"]'::jsonb,
  'Comfortable using ChatGPT or Claude for basic tasks. Completed AI Foundations or equivalent experience.',
  'ChatGPTまたはClaudeの基本操作に慣れていること。AI基礎コースまたは同等の経験。',
  '["Professionals who already use AI but want 10x more value", "Team leads building AI-powered workflows for their department", "Freelancers automating client deliverables with AI", "Operations managers streamlining processes"]'::jsonb,
  '["AIを使っているが10倍の価値を引き出したいプロフェッショナル", "部門向けAIワークフローを構築するチームリーダー", "AIでクライアント成果物を自動化するフリーランサー", "プロセスを効率化するオペレーションマネージャー"]'::jsonb,
  '["ChatGPT", "Claude", "Zapier", "Gamma", "Perplexity", "NotebookLM"]'::jsonb,
  'Skool', 6, NULL,
  NULL,
  'Live sessions every Tuesday at 6:00 PM HST (Wednesday 1:00 PM JST). Recorded lessons released each Monday.',
  'ライブセッションは毎週火曜日ハワイ時間18:00（水曜日日本時間13:00）。録画レッスンは毎週月曜日に公開。',
  'Full refund within 7 days of course start. 50% refund up to Week 2. No refunds after Week 2.',
  '開始7日以内は全額返金。第2週までは50%返金。第2週以降の返金はありません。',
  '["Attend or watch all 6 live sessions", "Complete 5 of 6 weekly action challenges", "Build and present your automation portfolio"]'::jsonb,
  '["6回すべてのライブセッションに参加または視聴", "6回中5回の週間アクションチャレンジを完了", "自動化ポートフォリオを構築し発表"]'::jsonb,
  '[{"material": "Session slides + recordings", "language": "EN + JP", "provided_with": "Each session"}, {"material": "Zapier template pack", "language": "EN", "provided_with": "Week 2"}, {"material": "Advanced prompt patterns cheat sheet", "language": "EN + JP", "provided_with": "Week 1"}, {"material": "ROI measurement spreadsheet", "language": "EN", "provided_with": "Week 5"}]'::jsonb,
  '[{"material": "セッションスライド＋録画", "language": "EN + JP", "provided_with": "各セッション"}, {"material": "Zapierテンプレートパック", "language": "EN", "provided_with": "第2週"}, {"material": "上級プロンプトパターン早見表", "language": "EN + JP", "provided_with": "第1週"}, {"material": "ROI測定スプレッドシート", "language": "EN", "provided_with": "第5週"}]'::jsonb,
  '["productivity", "automation", "prompt-engineering", "zapier", "business-ai"]'::jsonb,
  true, true, 'published'
),

-- ── Course 3: Building AI-First Products (Advanced, 10 weeks) ──
(
  'a0000000-0000-4000-8000-000000000003',
  'building-ai-first-products',
  'HV-AI301',
  'cohort',
  'Building AI-First Products',
  'AIファーストプロダクトの構築',
  'Design, build, and ship products powered by AI. From API integration to user experience, learn the full stack of AI product development. Graduate with a deployed project and a portfolio piece.',
  'AIを活用したプロダクトの設計・構築・リリースを学びます。API統合からユーザー体験まで、AIプロダクト開発のフルスタックをカバー。デプロイ済みプロジェクトとポートフォリオ作品を持って卒業。',
  'Ryan Jackson',
  79700, 119800,
  'both', 'Japanese subtitles available',
  'advanced', 'Live Online',
  CURRENT_DATE + interval '28 days',
  CURRENT_DATE + interval '28 days' + interval '10 weeks',
  10, 10, 5, 15, 0,
  '["Architect AI-powered features using Claude and OpenAI APIs", "Build full-stack prototypes with Cursor and AI-assisted coding", "Design effective AI UX patterns (chat, agents, suggestions)", "Implement RAG pipelines for knowledge-based applications", "Ship a production-ready AI product from concept to deployment", "Evaluate build-vs-buy decisions for AI capabilities"]'::jsonb,
  '["ClaudeとOpenAI APIを使ったAI機能の設計", "CursorとAI支援コーディングでフルスタックプロトタイプを構築", "効果的なAI UXパターン（チャット、エージェント、サジェスト）の設計", "知識ベースアプリのためのRAGパイプラインの実装", "コンセプトからデプロイまでの本番AIプロダクトのリリース", "AI機能のビルドvsバイの意思決定を評価"]'::jsonb,
  'Programming experience (JavaScript/TypeScript preferred). Familiarity with APIs and web development basics. Completed Productivity Mastery or equivalent.',
  'プログラミング経験（JavaScript/TypeScript推奨）。APIとWeb開発の基礎知識。プロダクティビティ・マスタリーまたは同等の経験。',
  '["Developers building AI-powered applications", "Technical founders prototyping AI products", "Product managers who want to understand AI implementation deeply", "Engineers transitioning into AI product roles"]'::jsonb,
  '["AIアプリケーションを構築する開発者", "AIプロダクトのプロトタイプを作る技術系起業家", "AI実装を深く理解したいプロダクトマネージャー", "AIプロダクト職に転身するエンジニア"]'::jsonb,
  '["Claude", "Cursor", "ChatGPT", "Zapier", "DeepL"]'::jsonb,
  'Discord', 12, NULL,
  NULL,
  'Live sessions every Thursday at 6:00 PM HST (Friday 1:00 PM JST). Office hours on Saturdays.',
  'ライブセッションは毎週木曜日ハワイ時間18:00（金曜日日本時間13:00）。土曜日にオフィスアワー。',
  'Full refund within 14 days of course start. 50% refund up to Week 4. No refunds after Week 4.',
  '開始14日以内は全額返金。第4週までは50%返金。第4週以降の返金はありません。',
  '["Attend or watch at least 8 of 10 live sessions", "Complete all weekly projects", "Deploy and present final capstone project"]'::jsonb,
  '["10回中8回以上のライブセッションに参加または視聴", "毎週のプロジェクトをすべて完了", "最終キャップストーンプロジェクトをデプロイし発表"]'::jsonb,
  '[{"material": "Session slides + code repos", "language": "EN", "provided_with": "Each session"}, {"material": "API starter templates", "language": "EN", "provided_with": "Week 1"}, {"material": "AI UX pattern library", "language": "EN + JP", "provided_with": "Week 4"}, {"material": "Deployment checklist", "language": "EN", "provided_with": "Week 9"}]'::jsonb,
  '[{"material": "セッションスライド＋コードリポジトリ", "language": "EN", "provided_with": "各セッション"}, {"material": "APIスターターテンプレート", "language": "EN", "provided_with": "第1週"}, {"material": "AI UXパターンライブラリ", "language": "EN + JP", "provided_with": "第4週"}, {"material": "デプロイチェックリスト", "language": "EN", "provided_with": "第9週"}]'::jsonb,
  '["cursor", "claude", "automation", "hands-on", "career"]'::jsonb,
  true, true, 'published'
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 2. COURSE WEEKS
-- ============================================================

INSERT INTO course_weeks (id, course_id, week_number, title_en, title_jp, subtitle_en, subtitle_jp, description_en, description_jp, phase, unlock_date, is_unlocked) VALUES

-- ── Course 1 Weeks (AI Foundations, 8 weeks) ──
('b0000000-0000-4000-8000-000001000100', 'a0000000-0000-4000-8000-000000000001', 1,
 'What Is AI, Really?', 'AIとは本当に何か？',
 'Separating hype from reality', '誇大宣伝と現実を区別する',
 'Understand the core concepts behind AI, machine learning, and large language models. Learn what AI can and cannot do today.',
 'AI、機械学習、大規模言語モデルの背後にある核心的な概念を理解します。今日AIにできることとできないことを学びます。',
 'Foundation', CURRENT_DATE + interval '14 days', true),

('b0000000-0000-4000-8000-000001000200', 'a0000000-0000-4000-8000-000000000001', 2,
 'Your First AI Conversations', '初めてのAI会話',
 'Getting started with ChatGPT and Claude', 'ChatGPTとClaudeを使い始める',
 'Set up accounts, explore interfaces, and have your first productive conversations with AI assistants.',
 'アカウントを設定し、インターフェースを探索し、AIアシスタントとの初めての生産的な会話を行います。',
 'Foundation', CURRENT_DATE + interval '14 days' + interval '1 week', true),

('b0000000-0000-4000-8000-000001000300', 'a0000000-0000-4000-8000-000000000001', 3,
 'The Art of Prompting', 'プロンプティングの技術',
 'Writing prompts that actually work', '実際に機能するプロンプトの書き方',
 'Learn the CRAFT framework for writing effective prompts. Practice with real business scenarios.',
 'CRAFTフレームワークを使って効果的なプロンプトの書き方を学びます。実際のビジネスシナリオで練習します。',
 'Core Skills', CURRENT_DATE + interval '14 days' + interval '2 weeks', false),

('b0000000-0000-4000-8000-000001000400', 'a0000000-0000-4000-8000-000000000001', 4,
 'AI for Content & Communication', 'コンテンツ＆コミュニケーションのためのAI',
 'Emails, reports, social media, and more', 'メール、レポート、SNSなど',
 'Use AI to draft emails, write reports, create social media content, and improve your professional communication.',
 'AIを使ってメールの下書き、レポート作成、SNSコンテンツの作成、プロフェッショナルなコミュニケーションの改善を行います。',
 'Core Skills', CURRENT_DATE + interval '14 days' + interval '3 weeks', false),

('b0000000-0000-4000-8000-000001000500', 'a0000000-0000-4000-8000-000000000001', 5,
 'AI for Research & Analysis', 'リサーチ＆分析のためのAI',
 'Making better decisions with AI', 'AIでより良い意思決定を',
 'Use Perplexity and NotebookLM for deep research. Learn to fact-check AI outputs and build research workflows.',
 'PerplexityとNotebookLMを使った深いリサーチ。AI出力のファクトチェックとリサーチワークフローの構築方法を学びます。',
 'Application', CURRENT_DATE + interval '14 days' + interval '4 weeks', false),

('b0000000-0000-4000-8000-000001000600', 'a0000000-0000-4000-8000-000000000001', 6,
 'Visual AI & Design', 'ビジュアルAI＆デザイン',
 'Creating visuals without a designer', 'デザイナーなしでビジュアルを作成',
 'Explore Canva AI, image generation, and presentation tools. Create professional visuals for your business.',
 'Canva AI、画像生成、プレゼンテーションツールを探索。ビジネス向けのプロフェッショナルなビジュアルを作成します。',
 'Application', CURRENT_DATE + interval '14 days' + interval '5 weeks', false),

('b0000000-0000-4000-8000-000001000700', 'a0000000-0000-4000-8000-000000000001', 7,
 'AI Ethics & Data Privacy', 'AI倫理とデータプライバシー',
 'Responsible AI for your organization', '組織のための責任あるAI',
 'Navigate data privacy, bias, intellectual property, and compliance. Build an AI usage policy for your team.',
 'データプライバシー、バイアス、知的財産、コンプライアンスに対応。チームのAI利用ポリシーを構築します。',
 'Integration', CURRENT_DATE + interval '14 days' + interval '6 weeks', false),

('b0000000-0000-4000-8000-000001000800', 'a0000000-0000-4000-8000-000000000001', 8,
 'Your AI Integration Plan', 'AI統合プランの作成',
 'Bringing it all together', 'すべてをまとめる',
 'Build a personalized AI integration roadmap for your business. Present your plan and get feedback from peers.',
 'ビジネス向けにパーソナライズされたAI統合ロードマップを構築。プランを発表しピアからフィードバックを得ます。',
 'Integration', CURRENT_DATE + interval '14 days' + interval '7 weeks', false),

-- ── Course 2 Weeks (Productivity Mastery, 6 weeks) ──
('b0000000-0000-4000-8000-000002000100', 'a0000000-0000-4000-8000-000000000002', 1,
 'Advanced Prompting Patterns', '上級プロンプティングパターン',
 'Chain-of-thought, few-shot, and system prompts', 'Chain-of-Thought、Few-Shot、システムプロンプト',
 'Go beyond basic prompts. Master chain-of-thought reasoning, few-shot examples, and custom system prompts for consistent output.',
 '基本プロンプトを超えましょう。Chain-of-Thought推論、Few-Shot例、カスタムシステムプロンプトを習得します。',
 'Foundation', CURRENT_DATE + interval '21 days', true),

('b0000000-0000-4000-8000-000002000200', 'a0000000-0000-4000-8000-000000000002', 2,
 'No-Code Automation with Zapier', 'Zapierでのノーコード自動化',
 'Connect your tools and let AI do the work', 'ツールを接続してAIに作業させる',
 'Build your first Zapier automations connecting email, CRM, and AI. Create triggers, actions, and multi-step Zaps.',
 'メール、CRM、AIを接続する最初のZapier自動化を構築。トリガー、アクション、マルチステップZapを作成します。',
 'Foundation', CURRENT_DATE + interval '21 days' + interval '1 week', true),

('b0000000-0000-4000-8000-000002000300', 'a0000000-0000-4000-8000-000000000002', 3,
 'AI-Powered Content Systems', 'AI駆動コンテンツシステム',
 'From idea to published — on autopilot', 'アイデアから公開まで — 自動パイロット',
 'Build content production pipelines: blog posts, newsletters, social media calendars. Automate repurposing across channels.',
 'コンテンツ制作パイプラインを構築：ブログ投稿、ニュースレター、SNSカレンダー。チャンネル間のリパーパシングを自動化します。',
 'Application', CURRENT_DATE + interval '21 days' + interval '2 weeks', false),

('b0000000-0000-4000-8000-000002000400', 'a0000000-0000-4000-8000-000000000002', 4,
 'Team Prompt Libraries', 'チームプロンプトライブラリ',
 'Scaling AI across your organization', '組織全体でAIをスケーリング',
 'Create, organize, and share prompt templates. Build a team playbook that ensures consistent AI quality.',
 'プロンプトテンプレートの作成、整理、共有。一貫したAI品質を保証するチームプレイブックを構築します。',
 'Application', CURRENT_DATE + interval '21 days' + interval '3 weeks', false),

('b0000000-0000-4000-8000-000002000500', 'a0000000-0000-4000-8000-000000000002', 5,
 'Measuring AI ROI', 'AI ROIの測定',
 'Proving the value of AI investments', 'AI投資の価値を証明する',
 'Track time savings, quality improvements, and cost reductions. Build dashboards and reports for stakeholders.',
 '時間削減、品質改善、コスト削減を追跡。ステークホルダー向けのダッシュボードとレポートを構築します。',
 'Optimization', CURRENT_DATE + interval '21 days' + interval '4 weeks', false),

('b0000000-0000-4000-8000-000002000600', 'a0000000-0000-4000-8000-000000000002', 6,
 'Automation Portfolio Showcase', '自動化ポートフォリオショーケース',
 'Present your workflows and get feedback', 'ワークフローを発表しフィードバックを得る',
 'Present your best automations. Peer review, instructor feedback, and next steps for continued growth.',
 '最高の自動化を発表。ピアレビュー、講師フィードバック、継続的な成長のための次のステップ。',
 'Optimization', CURRENT_DATE + interval '21 days' + interval '5 weeks', false),

-- ── Course 3 Weeks (Building AI Products, 10 weeks) ──
('b0000000-0000-4000-8000-000003000100', 'a0000000-0000-4000-8000-000000000003', 1,
 'The AI Product Landscape', 'AIプロダクトの全体像',
 'What makes a great AI product?', '優れたAIプロダクトとは？',
 'Survey the AI product landscape. Understand API pricing, model selection, and the build-vs-buy decision framework.',
 'AIプロダクトの全体像を調査。API料金、モデル選択、ビルドvsバイの意思決定フレームワークを理解します。',
 'Discovery', CURRENT_DATE + interval '28 days', true),

('b0000000-0000-4000-8000-000003000200', 'a0000000-0000-4000-8000-000000000003', 2,
 'API Fundamentals', 'APIの基礎',
 'Claude API, OpenAI, and structured outputs', 'Claude API、OpenAI、構造化出力',
 'Set up API access, make your first calls, handle streaming responses, and work with structured JSON outputs.',
 'APIアクセスを設定し、最初の呼び出しを行い、ストリーミングレスポンスを処理し、構造化JSON出力を扱います。',
 'Discovery', CURRENT_DATE + interval '28 days' + interval '1 week', true),

('b0000000-0000-4000-8000-000003000300', 'a0000000-0000-4000-8000-000000000003', 3,
 'AI-Assisted Development', 'AI支援開発',
 'Coding with Cursor and Claude Code', 'CursorとClaude Codeでのコーディング',
 'Use AI coding assistants to accelerate development. Learn effective prompting for code generation, debugging, and refactoring.',
 'AIコーディングアシスタントを使って開発を加速。コード生成、デバッグ、リファクタリングのための効果的なプロンプティングを学びます。',
 'Build', CURRENT_DATE + interval '28 days' + interval '2 weeks', false),

('b0000000-0000-4000-8000-000003000400', 'a0000000-0000-4000-8000-000000000003', 4,
 'Designing AI User Experiences', 'AI UXの設計',
 'Chat interfaces, suggestions, and agents', 'チャットインターフェース、サジェスト、エージェント',
 'Design intuitive AI-powered interfaces. Cover chat UX patterns, inline suggestions, and autonomous agent workflows.',
 '直感的なAI搭載インターフェースを設計。チャットUXパターン、インラインサジェスト、自律エージェントワークフローをカバーします。',
 'Build', CURRENT_DATE + interval '28 days' + interval '3 weeks', false),

('b0000000-0000-4000-8000-000003000500', 'a0000000-0000-4000-8000-000000000003', 5,
 'RAG: Knowledge-Based AI', 'RAG：知識ベースAI',
 'Making AI smart about your data', 'AIを自社データに精通させる',
 'Build retrieval-augmented generation pipelines. Embed documents, build vector indexes, and create Q&A systems.',
 '検索拡張生成パイプラインを構築。ドキュメントを埋め込み、ベクターインデックスを構築し、Q&Aシステムを作成します。',
 'Build', CURRENT_DATE + interval '28 days' + interval '4 weeks', false),

('b0000000-0000-4000-8000-000003000600', 'a0000000-0000-4000-8000-000000000003', 6,
 'Prompt Engineering at Scale', '大規模プロンプトエンジニアリング',
 'System prompts, guardrails, and evaluation', 'システムプロンプト、ガードレール、評価',
 'Design production-grade prompt systems. Implement safety guardrails, A/B testing, and automated evaluation.',
 'プロダクショングレードのプロンプトシステムを設計。安全ガードレール、A/Bテスト、自動評価を実装します。',
 'Scale', CURRENT_DATE + interval '28 days' + interval '5 weeks', false),

('b0000000-0000-4000-8000-000003000700', 'a0000000-0000-4000-8000-000000000003', 7,
 'Building AI Agents', 'AIエージェントの構築',
 'Multi-step reasoning and tool use', 'マルチステップ推論とツール活用',
 'Build agents that plan, reason, and use tools. Implement function calling and multi-turn conversations.',
 '計画、推論、ツール使用を行うエージェントを構築。関数呼び出しとマルチターン会話を実装します。',
 'Scale', CURRENT_DATE + interval '28 days' + interval '6 weeks', false),

('b0000000-0000-4000-8000-000003000800', 'a0000000-0000-4000-8000-000000000003', 8,
 'Testing & Reliability', 'テストと信頼性',
 'Making AI outputs predictable', 'AIの出力を予測可能にする',
 'Test AI features effectively. Cover prompt regression testing, output validation, and error handling strategies.',
 'AI機能を効果的にテスト。プロンプト回帰テスト、出力バリデーション、エラーハンドリング戦略をカバーします。',
 'Ship', CURRENT_DATE + interval '28 days' + interval '7 weeks', false),

('b0000000-0000-4000-8000-000003000900', 'a0000000-0000-4000-8000-000000000003', 9,
 'Deployment & Operations', 'デプロイとオペレーション',
 'From localhost to production', 'ローカルホストから本番環境へ',
 'Deploy AI applications to production. Cover hosting, monitoring, cost management, and scaling strategies.',
 'AIアプリケーションを本番環境にデプロイ。ホスティング、モニタリング、コスト管理、スケーリング戦略をカバーします。',
 'Ship', CURRENT_DATE + interval '28 days' + interval '8 weeks', false),

('b0000000-0000-4000-8000-000003001000', 'a0000000-0000-4000-8000-000000000003', 10,
 'Capstone Demo Day', 'キャップストーン・デモデー',
 'Ship it and show it off', 'リリースして発表しよう',
 'Present your deployed AI product. Get feedback from peers, instructors, and invited guests. Celebrate your achievement!',
 'デプロイ済みAIプロダクトを発表。ピア、講師、招待ゲストからフィードバックを得ましょう。成果を祝いましょう！',
 'Ship', CURRENT_DATE + interval '28 days' + interval '9 weeks', false)

ON CONFLICT (course_id, week_number) DO NOTHING;


-- ============================================================
-- 3. COURSE SESSIONS
-- ============================================================

INSERT INTO course_sessions (id, week_id, session_number, title_en, title_jp, format, duration_minutes, scheduled_at, topics_en, topics_jp, status) VALUES

-- ── Course 1 Sessions ──
('c0000000-0000-4000-8000-000100010001', 'b0000000-0000-4000-8000-000001000100', 1,
 'Understanding AI: Myths vs Reality', 'AIを理解する：神話と現実', 'live', 90,
 CURRENT_DATE + interval '14 days' + interval '19 hours',
 '[{"title": "What is AI?", "subtopics": ["Machine learning basics", "Large language models explained", "AI vs AGI"]}, {"title": "What AI can do today", "subtopics": ["Text generation", "Image creation", "Data analysis", "Code assistance"]}]'::jsonb,
 '[{"title": "AIとは？", "subtopics": ["機械学習の基礎", "大規模言語モデルの説明", "AI vs AGI"]}, {"title": "今日AIができること", "subtopics": ["テキスト生成", "画像作成", "データ分析", "コードアシスタンス"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100020001', 'b0000000-0000-4000-8000-000001000200', 1,
 'Hands-On: ChatGPT & Claude Setup', '実践：ChatGPTとClaudeのセットアップ', 'live', 90,
 CURRENT_DATE + interval '14 days' + interval '1 week' + interval '19 hours',
 '[{"title": "Setting up your AI toolkit", "subtopics": ["ChatGPT account and interface tour", "Claude account and interface tour", "Free vs paid tiers compared"]}, {"title": "First conversations", "subtopics": ["Asking good questions", "Iterating on responses", "When to use which tool"]}]'::jsonb,
 '[{"title": "AIツールキットのセットアップ", "subtopics": ["ChatGPTアカウントとインターフェースツアー", "Claudeアカウントとインターフェースツアー", "無料版vs有料版の比較"]}, {"title": "初めての会話", "subtopics": ["良い質問の仕方", "応答の改善", "どのツールをいつ使うか"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100030001', 'b0000000-0000-4000-8000-000001000300', 1,
 'The CRAFT Prompting Framework', 'CRAFTプロンプティングフレームワーク', 'live', 90,
 CURRENT_DATE + interval '14 days' + interval '2 weeks' + interval '19 hours',
 '[{"title": "The CRAFT framework", "subtopics": ["Context: setting the scene", "Role: defining the AI persona", "Action: specifying the task", "Format: structuring the output", "Tone: matching your voice"]}, {"title": "Practice session", "subtopics": ["Writing prompts for real scenarios", "Peer review and iteration"]}]'::jsonb,
 '[{"title": "CRAFTフレームワーク", "subtopics": ["コンテキスト：状況の設定", "ロール：AIペルソナの定義", "アクション：タスクの指定", "フォーマット：出力の構造化", "トーン：声のマッチング"]}, {"title": "練習セッション", "subtopics": ["実際のシナリオ用プロンプト作成", "ピアレビューと改善"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100040001', 'b0000000-0000-4000-8000-000001000400', 1,
 'AI Writing Workshop', 'AIライティングワークショップ', 'hybrid', 90,
 CURRENT_DATE + interval '14 days' + interval '3 weeks' + interval '19 hours',
 '[{"title": "AI for professional writing", "subtopics": ["Email drafting and refinement", "Report generation", "Social media content creation"]}, {"title": "Maintaining your voice", "subtopics": ["Custom instructions and style guides", "Editing AI output effectively"]}]'::jsonb,
 '[{"title": "プロフェッショナルライティングのためのAI", "subtopics": ["メールの下書きと改良", "レポート生成", "SNSコンテンツ作成"]}, {"title": "自分の声を維持する", "subtopics": ["カスタム指示とスタイルガイド", "AI出力の効果的な編集"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100050001', 'b0000000-0000-4000-8000-000001000500', 1,
 'Deep Research with AI', 'AIによるディープリサーチ', 'live', 90,
 CURRENT_DATE + interval '14 days' + interval '4 weeks' + interval '19 hours',
 '[{"title": "Research tools deep dive", "subtopics": ["Perplexity for web research", "NotebookLM for document analysis", "Fact-checking AI outputs"]}, {"title": "Building research workflows", "subtopics": ["Multi-source synthesis", "Creating research briefs"]}]'::jsonb,
 '[{"title": "リサーチツール詳細", "subtopics": ["Perplexityでのウェブリサーチ", "NotebookLMでの文書分析", "AI出力のファクトチェック"]}, {"title": "リサーチワークフローの構築", "subtopics": ["マルチソースの統合", "リサーチブリーフの作成"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100060001', 'b0000000-0000-4000-8000-000001000600', 1,
 'Visual Content Creation', 'ビジュアルコンテンツ作成', 'hybrid', 90,
 CURRENT_DATE + interval '14 days' + interval '5 weeks' + interval '19 hours',
 '[{"title": "AI design tools", "subtopics": ["Canva AI features walkthrough", "Gamma for presentations", "Image generation basics"]}, {"title": "Hands-on workshop", "subtopics": ["Create a social media visual set", "Build a presentation deck with AI"]}]'::jsonb,
 '[{"title": "AIデザインツール", "subtopics": ["Canva AI機能ウォークスルー", "Gammaでのプレゼンテーション", "画像生成の基礎"]}, {"title": "ハンズオンワークショップ", "subtopics": ["SNSビジュアルセットの作成", "AIでプレゼンテーションデッキを構築"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100070001', 'b0000000-0000-4000-8000-000001000700', 1,
 'Responsible AI in Practice', '実践的な責任あるAI', 'live', 90,
 CURRENT_DATE + interval '14 days' + interval '6 weeks' + interval '19 hours',
 '[{"title": "AI ethics essentials", "subtopics": ["Bias and fairness", "Data privacy regulations", "Intellectual property concerns"]}, {"title": "Building your AI policy", "subtopics": ["Team AI usage guidelines", "Compliance checklist", "Case studies"]}]'::jsonb,
 '[{"title": "AI倫理の基礎", "subtopics": ["バイアスと公平性", "データプライバシー規制", "知的財産の懸念"]}, {"title": "AIポリシーの構築", "subtopics": ["チームAI利用ガイドライン", "コンプライアンスチェックリスト", "ケーススタディ"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000100080001', 'b0000000-0000-4000-8000-000001000800', 1,
 'Integration Plan Presentations', '統合プラン発表会', 'live', 120,
 CURRENT_DATE + interval '14 days' + interval '7 weeks' + interval '19 hours',
 '[{"title": "Final presentations", "subtopics": ["Present your AI integration roadmap", "Peer feedback and Q&A"]}, {"title": "Next steps", "subtopics": ["Continuing your AI journey", "Course 2 preview", "Community resources"]}]'::jsonb,
 '[{"title": "最終プレゼンテーション", "subtopics": ["AI統合ロードマップの発表", "ピアフィードバックとQ&A"]}, {"title": "次のステップ", "subtopics": ["AI学習の継続", "コース2プレビュー", "コミュニティリソース"]}]'::jsonb,
 'upcoming'),

-- ── Course 2 Sessions ──
('c0000000-0000-4000-8000-000200010001', 'b0000000-0000-4000-8000-000002000100', 1,
 'Prompting Masterclass', 'プロンプティングマスタークラス', 'live', 90,
 CURRENT_DATE + interval '21 days' + interval '18 hours',
 '[{"title": "Advanced prompt patterns", "subtopics": ["Chain-of-thought prompting", "Few-shot learning", "System prompt design"]}, {"title": "Structured outputs", "subtopics": ["JSON mode and formatting", "Consistent output templates"]}]'::jsonb,
 '[{"title": "上級プロンプトパターン", "subtopics": ["Chain-of-Thoughtプロンプティング", "Few-Shot学習", "システムプロンプト設計"]}, {"title": "構造化出力", "subtopics": ["JSONモードとフォーマット", "一貫した出力テンプレート"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200010002', 'b0000000-0000-4000-8000-000002000100', 2,
 'Prompt Pattern Practice Lab', 'プロンプトパターン実践ラボ', 'recorded', 45,
 NULL,
 '[{"title": "Practice exercises", "subtopics": ["Chain-of-thought business analysis", "Few-shot customer response templates", "System prompt for brand voice"]}]'::jsonb,
 '[{"title": "練習問題", "subtopics": ["Chain-of-Thoughtビジネス分析", "Few-Shotカスタマー対応テンプレート", "ブランドボイスのシステムプロンプト"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200020001', 'b0000000-0000-4000-8000-000002000200', 1,
 'Zapier + AI Automation Bootcamp', 'Zapier + AI自動化ブートキャンプ', 'live', 90,
 CURRENT_DATE + interval '21 days' + interval '1 week' + interval '18 hours',
 '[{"title": "Zapier fundamentals", "subtopics": ["Triggers and actions", "Multi-step Zaps", "AI integration steps"]}, {"title": "Build your first automation", "subtopics": ["Email to AI summary pipeline", "CRM auto-enrichment", "Slack notification bot"]}]'::jsonb,
 '[{"title": "Zapierの基礎", "subtopics": ["トリガーとアクション", "マルチステップZap", "AI統合ステップ"]}, {"title": "最初の自動化を構築", "subtopics": ["メールからAI要約パイプライン", "CRM自動エンリッチメント", "Slack通知ボット"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200030001', 'b0000000-0000-4000-8000-000002000300', 1,
 'Content Production Pipelines', 'コンテンツ制作パイプライン', 'hybrid', 90,
 CURRENT_DATE + interval '21 days' + interval '2 weeks' + interval '18 hours',
 '[{"title": "Building content systems", "subtopics": ["Blog post pipeline: idea → draft → edit → publish", "Newsletter automation", "Social media calendar generation"]}, {"title": "Repurposing engine", "subtopics": ["One piece → multiple formats", "Cross-platform adaptation"]}]'::jsonb,
 '[{"title": "コンテンツシステムの構築", "subtopics": ["ブログ投稿パイプライン：アイデア→下書き→編集→公開", "ニュースレター自動化", "SNSカレンダー生成"]}, {"title": "リパーパシングエンジン", "subtopics": ["1つのコンテンツ→複数形式", "クロスプラットフォーム対応"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200040001', 'b0000000-0000-4000-8000-000002000400', 1,
 'Building a Team Prompt Playbook', 'チームプロンプトプレイブック構築', 'live', 90,
 CURRENT_DATE + interval '21 days' + interval '3 weeks' + interval '18 hours',
 '[{"title": "Prompt library design", "subtopics": ["Categorization and tagging", "Version control for prompts", "Quality assurance process"]}, {"title": "Team adoption", "subtopics": ["Training non-technical teammates", "Governance and review cycles"]}]'::jsonb,
 '[{"title": "プロンプトライブラリ設計", "subtopics": ["カテゴリ分けとタグ付け", "プロンプトのバージョン管理", "品質保証プロセス"]}, {"title": "チーム導入", "subtopics": ["非技術チームメンバーのトレーニング", "ガバナンスとレビューサイクル"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200050001', 'b0000000-0000-4000-8000-000002000500', 1,
 'AI ROI Framework', 'AI ROIフレームワーク', 'hybrid', 90,
 CURRENT_DATE + interval '21 days' + interval '4 weeks' + interval '18 hours',
 '[{"title": "Measuring AI impact", "subtopics": ["Time savings tracking", "Quality improvement metrics", "Cost reduction analysis"]}, {"title": "Reporting for stakeholders", "subtopics": ["Building an AI ROI dashboard", "Before/after case studies"]}]'::jsonb,
 '[{"title": "AIの影響測定", "subtopics": ["時間削減の追跡", "品質改善指標", "コスト削減分析"]}, {"title": "ステークホルダーへの報告", "subtopics": ["AI ROIダッシュボードの構築", "導入前後のケーススタディ"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000200060001', 'b0000000-0000-4000-8000-000002000600', 1,
 'Portfolio Showcase & Next Steps', 'ポートフォリオショーケースと次のステップ', 'live', 120,
 CURRENT_DATE + interval '21 days' + interval '5 weeks' + interval '18 hours',
 '[{"title": "Automation showcases", "subtopics": ["Present your best automation", "Peer review and feedback"]}, {"title": "Continuing your journey", "subtopics": ["Advanced course preview", "Community resources", "Maintaining momentum"]}]'::jsonb,
 '[{"title": "自動化ショーケース", "subtopics": ["最高の自動化を発表", "ピアレビューとフィードバック"]}, {"title": "学習の継続", "subtopics": ["上級コースプレビュー", "コミュニティリソース", "モメンタムの維持"]}]'::jsonb,
 'upcoming'),

-- ── Course 3 Sessions (first 5 weeks shown, remaining follow same pattern) ──
('c0000000-0000-4000-8000-000300010001', 'b0000000-0000-4000-8000-000003000100', 1,
 'AI Product Landscape Survey', 'AIプロダクト全体調査', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '18 hours',
 '[{"title": "The AI product ecosystem", "subtopics": ["Categories of AI products", "API pricing models", "Model selection: Claude vs GPT vs open-source"]}, {"title": "Build vs buy framework", "subtopics": ["When to use APIs vs fine-tuning", "Cost-benefit analysis template"]}]'::jsonb,
 '[{"title": "AIプロダクトエコシステム", "subtopics": ["AIプロダクトのカテゴリ", "API料金モデル", "モデル選択：Claude vs GPT vs オープンソース"]}, {"title": "ビルドvsバイフレームワーク", "subtopics": ["APIを使うべき時 vs ファインチューニング", "費用対効果分析テンプレート"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300020001', 'b0000000-0000-4000-8000-000003000200', 1,
 'API Deep Dive', 'APIディープダイブ', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '1 week' + interval '18 hours',
 '[{"title": "API fundamentals", "subtopics": ["Authentication and setup", "Making API calls", "Streaming responses"]}, {"title": "Structured outputs", "subtopics": ["JSON mode", "Tool use / function calling", "Error handling patterns"]}]'::jsonb,
 '[{"title": "APIの基礎", "subtopics": ["認証とセットアップ", "API呼び出し", "ストリーミングレスポンス"]}, {"title": "構造化出力", "subtopics": ["JSONモード", "ツール使用/関数呼び出し", "エラーハンドリングパターン"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300030001', 'b0000000-0000-4000-8000-000003000300', 1,
 'Cursor & AI Coding Workshop', 'Cursor＆AIコーディングワークショップ', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '2 weeks' + interval '18 hours',
 '[{"title": "AI-assisted development", "subtopics": ["Cursor setup and workflow", "Claude Code for terminal tasks", "Effective code generation prompts"]}, {"title": "Hands-on coding", "subtopics": ["Build a feature with AI assistance", "Debugging with AI", "Refactoring patterns"]}]'::jsonb,
 '[{"title": "AI支援開発", "subtopics": ["Cursorのセットアップとワークフロー", "ターミナルタスク用Claude Code", "効果的なコード生成プロンプト"]}, {"title": "ハンズオンコーディング", "subtopics": ["AI支援で機能を構築", "AIでのデバッグ", "リファクタリングパターン"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300040001', 'b0000000-0000-4000-8000-000003000400', 1,
 'AI UX Design Patterns', 'AI UXデザインパターン', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '3 weeks' + interval '18 hours',
 '[{"title": "AI interface patterns", "subtopics": ["Chat interfaces done right", "Inline AI suggestions", "Agent UX (autonomous workflows)"]}, {"title": "Design workshop", "subtopics": ["Wireframe an AI feature", "User testing considerations", "Accessibility in AI interfaces"]}]'::jsonb,
 '[{"title": "AIインターフェースパターン", "subtopics": ["正しいチャットインターフェース", "インラインAIサジェスト", "エージェントUX（自律ワークフロー）"]}, {"title": "デザインワークショップ", "subtopics": ["AI機能のワイヤーフレーム", "ユーザーテストの考慮事項", "AIインターフェースのアクセシビリティ"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300050001', 'b0000000-0000-4000-8000-000003000500', 1,
 'Building RAG Pipelines', 'RAGパイプラインの構築', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '4 weeks' + interval '18 hours',
 '[{"title": "RAG architecture", "subtopics": ["Document chunking strategies", "Embedding models", "Vector databases"]}, {"title": "Build a Q&A system", "subtopics": ["Document ingestion pipeline", "Retrieval and ranking", "Answer generation with citations"]}]'::jsonb,
 '[{"title": "RAGアーキテクチャ", "subtopics": ["ドキュメントチャンキング戦略", "埋め込みモデル", "ベクターデータベース"]}, {"title": "Q&Aシステムの構築", "subtopics": ["ドキュメント取り込みパイプライン", "検索とランキング", "引用付き回答生成"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300060001', 'b0000000-0000-4000-8000-000003000600', 1,
 'Production Prompt Systems', 'プロダクションプロンプトシステム', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '5 weeks' + interval '18 hours',
 '[{"title": "Prompt engineering at scale", "subtopics": ["System prompt architecture", "Safety guardrails and content filtering", "Prompt versioning"]}, {"title": "Evaluation", "subtopics": ["Automated testing for prompts", "A/B testing AI outputs", "Human evaluation frameworks"]}]'::jsonb,
 '[{"title": "大規模プロンプトエンジニアリング", "subtopics": ["システムプロンプトアーキテクチャ", "安全ガードレールとコンテンツフィルタリング", "プロンプトバージョニング"]}, {"title": "評価", "subtopics": ["プロンプトの自動テスト", "AI出力のA/Bテスト", "人間評価フレームワーク"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300070001', 'b0000000-0000-4000-8000-000003000700', 1,
 'AI Agent Architecture', 'AIエージェントアーキテクチャ', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '6 weeks' + interval '18 hours',
 '[{"title": "Agent fundamentals", "subtopics": ["Planning and reasoning loops", "Tool use and function calling", "Memory and context management"]}, {"title": "Build an agent", "subtopics": ["Multi-step task agent", "Error recovery patterns", "Human-in-the-loop design"]}]'::jsonb,
 '[{"title": "エージェントの基礎", "subtopics": ["計画と推論ループ", "ツール使用と関数呼び出し", "メモリとコンテキスト管理"]}, {"title": "エージェントの構築", "subtopics": ["マルチステップタスクエージェント", "エラー回復パターン", "ヒューマン・イン・ザ・ループ設計"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300080001', 'b0000000-0000-4000-8000-000003000800', 1,
 'Testing AI Features', 'AI機能のテスト', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '7 weeks' + interval '18 hours',
 '[{"title": "Testing strategies", "subtopics": ["Unit testing AI integrations", "Prompt regression testing", "Output validation"]}, {"title": "Reliability engineering", "subtopics": ["Fallback strategies", "Rate limiting and retries", "Monitoring and alerting"]}]'::jsonb,
 '[{"title": "テスト戦略", "subtopics": ["AI統合のユニットテスト", "プロンプト回帰テスト", "出力バリデーション"]}, {"title": "信頼性エンジニアリング", "subtopics": ["フォールバック戦略", "レート制限とリトライ", "モニタリングとアラート"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300090001', 'b0000000-0000-4000-8000-000003000900', 1,
 'Shipping to Production', '本番環境へのリリース', 'live', 90,
 CURRENT_DATE + interval '28 days' + interval '8 weeks' + interval '18 hours',
 '[{"title": "Deployment", "subtopics": ["Vercel / Railway / Fly.io options", "Environment management", "CI/CD for AI apps"]}, {"title": "Operations", "subtopics": ["Cost monitoring and optimization", "Usage analytics", "Scaling strategies"]}]'::jsonb,
 '[{"title": "デプロイ", "subtopics": ["Vercel / Railway / Fly.io オプション", "環境管理", "AIアプリのCI/CD"]}, {"title": "オペレーション", "subtopics": ["コスト監視と最適化", "使用状況分析", "スケーリング戦略"]}]'::jsonb,
 'upcoming'),

('c0000000-0000-4000-8000-000300100001', 'b0000000-0000-4000-8000-000003001000', 1,
 'Capstone Demo Day', 'キャップストーン・デモデー', 'live', 150,
 CURRENT_DATE + interval '28 days' + interval '9 weeks' + interval '18 hours',
 '[{"title": "Final demos", "subtopics": ["Present your deployed AI product", "Live Q&A with peers and guests"]}, {"title": "Celebration & next steps", "subtopics": ["Course retrospective", "Career paths in AI", "Staying connected"]}]'::jsonb,
 '[{"title": "最終デモ", "subtopics": ["デプロイ済みAIプロダクトの発表", "ピアとゲストとのライブQ&A"]}, {"title": "お祝いと次のステップ", "subtopics": ["コース振り返り", "AIでのキャリアパス", "つながりを維持"]}]'::jsonb,
 'upcoming')

ON CONFLICT (week_id, session_number) DO NOTHING;


-- ============================================================
-- 4. COURSE ASSIGNMENTS
-- ============================================================

INSERT INTO course_assignments (id, week_id, sort_order, title_en, title_jp, description_en, description_jp, assignment_type, due_date) VALUES

-- ── Course 1 Assignments ──
('d0000000-0000-4000-8000-000100010001', 'b0000000-0000-4000-8000-000001000100', 1,
 'AI Audit: Your Current Workflow', 'AI監査：現在のワークフロー',
 'List 10 tasks you do weekly. For each, rate how well AI could help (1-5) and identify the top 3 to automate first.',
 '毎週行う10のタスクをリストアップ。各タスクについてAIがどれだけ役立つか（1-5）を評価し、最初に自動化すべきトップ3を特定してください。',
 'homework', CURRENT_DATE + interval '14 days' + interval '1 week'),

('d0000000-0000-4000-8000-000100020001', 'b0000000-0000-4000-8000-000001000200', 1,
 'Side-by-Side Tool Comparison', 'ツール並列比較',
 'Ask the same 5 business questions to ChatGPT and Claude. Compare the responses and write a 1-page analysis of strengths and weaknesses.',
 '同じ5つのビジネス質問をChatGPTとClaudeに投げかけ、回答を比較して強みと弱みの1ページ分析を書いてください。',
 'action-challenge', CURRENT_DATE + interval '14 days' + interval '2 weeks'),

('d0000000-0000-4000-8000-000100030001', 'b0000000-0000-4000-8000-000001000300', 1,
 'CRAFT Prompt Portfolio', 'CRAFTプロンプトポートフォリオ',
 'Create 5 prompts using the CRAFT framework for your actual business tasks. Test each and document the results.',
 'CRAFTフレームワークを使って実際のビジネスタスク用に5つのプロンプトを作成。各プロンプトをテストし結果を文書化してください。',
 'project', CURRENT_DATE + interval '14 days' + interval '3 weeks'),

('d0000000-0000-4000-8000-000100040001', 'b0000000-0000-4000-8000-000001000400', 1,
 'Content Creation Sprint', 'コンテンツ作成スプリント',
 'Use AI to create a complete content package: 1 blog post, 3 social media posts, and 2 email templates for your business.',
 'AIを使って完全なコンテンツパッケージを作成：ブログ投稿1件、SNS投稿3件、ビジネス用メールテンプレート2件。',
 'action-challenge', CURRENT_DATE + interval '14 days' + interval '4 weeks'),

('d0000000-0000-4000-8000-000100050001', 'b0000000-0000-4000-8000-000001000500', 1,
 'Research Brief', 'リサーチブリーフ',
 'Pick a business decision you need to make. Use Perplexity and NotebookLM to research it and produce a 2-page decision brief.',
 'ビジネス上の意思決定を1つ選び、PerplexityとNotebookLMを使ってリサーチし、2ページの意思決定ブリーフを作成してください。',
 'homework', CURRENT_DATE + interval '14 days' + interval '5 weeks'),

('d0000000-0000-4000-8000-000100060001', 'b0000000-0000-4000-8000-000001000600', 1,
 'Visual Brand Kit', 'ビジュアルブランドキット',
 'Create a mini brand kit using Canva AI: 3 social media templates, 1 presentation template, and 1 infographic.',
 'Canva AIを使ってミニブランドキットを作成：SNSテンプレート3枚、プレゼンテーションテンプレート1枚、インフォグラフィック1枚。',
 'project', CURRENT_DATE + interval '14 days' + interval '6 weeks'),

('d0000000-0000-4000-8000-000100070001', 'b0000000-0000-4000-8000-000001000700', 1,
 'AI Usage Policy Draft', 'AI利用ポリシー草案',
 'Draft an AI usage policy for your team or organization. Include guidelines on data privacy, acceptable use, and quality assurance.',
 'チームまたは組織のAI利用ポリシーを起草してください。データプライバシー、許容される使用、品質保証に関するガイドラインを含めること。',
 'homework', CURRENT_DATE + interval '14 days' + interval '7 weeks'),

('d0000000-0000-4000-8000-000100080001', 'b0000000-0000-4000-8000-000001000800', 1,
 'Final AI Integration Plan', '最終AI統合プラン',
 'Create a comprehensive 90-day AI integration roadmap for your business. Include tools, workflows, timeline, budget, and success metrics.',
 'ビジネス向けの包括的な90日間AI統合ロードマップを作成。ツール、ワークフロー、タイムライン、予算、成功指標を含めてください。',
 'project', CURRENT_DATE + interval '14 days' + interval '8 weeks'),

-- ── Course 2 Assignments ──
('d0000000-0000-4000-8000-000200010001', 'b0000000-0000-4000-8000-000002000100', 1,
 'Advanced Prompt Pattern Showcase', '上級プロンプトパターンショーケース',
 'Create 3 advanced prompts: one using chain-of-thought, one with few-shot examples, and one with a custom system prompt. Show before/after results.',
 '3つの上級プロンプトを作成：Chain-of-Thought使用1つ、Few-Shot例1つ、カスタムシステムプロンプト1つ。変更前後の結果を示してください。',
 'action-challenge', CURRENT_DATE + interval '21 days' + interval '1 week'),

('d0000000-0000-4000-8000-000200020001', 'b0000000-0000-4000-8000-000002000200', 1,
 'Build 3 Zapier Automations', '3つのZapier自動化を構築',
 'Build and activate 3 Zapier automations that save you at least 2 hours per week. Document each with screenshots and time-saved estimates.',
 '週に2時間以上節約できる3つのZapier自動化を構築・有効化。スクリーンショットと時間削減見積もりで各自動化を文書化。',
 'action-challenge', CURRENT_DATE + interval '21 days' + interval '2 weeks'),

('d0000000-0000-4000-8000-000200030001', 'b0000000-0000-4000-8000-000002000300', 1,
 'Content Pipeline Blueprint', 'コンテンツパイプライン設計図',
 'Design and document a complete content production pipeline for your business. Include AI prompts, automation steps, and quality checkpoints.',
 'ビジネス向けの完全なコンテンツ制作パイプラインを設計・文書化。AIプロンプト、自動化ステップ、品質チェックポイントを含めること。',
 'project', CURRENT_DATE + interval '21 days' + interval '3 weeks'),

('d0000000-0000-4000-8000-000200040001', 'b0000000-0000-4000-8000-000002000400', 1,
 'Team Prompt Library', 'チームプロンプトライブラリ',
 'Create a prompt library with at least 15 categorized, tested prompts. Include usage instructions and example outputs for each.',
 '15以上のカテゴリ分けされ、テスト済みのプロンプトライブラリを作成。各プロンプトの使用方法と出力例を含めること。',
 'project', CURRENT_DATE + interval '21 days' + interval '4 weeks'),

('d0000000-0000-4000-8000-000200050001', 'b0000000-0000-4000-8000-000002000500', 1,
 'AI ROI Report', 'AI ROIレポート',
 'Calculate the ROI of your AI tools and automations from this course. Present time saved, cost impact, and quality improvements with data.',
 'このコースでのAIツールと自動化のROIを計算。時間削減、コスト影響、品質改善をデータで提示してください。',
 'homework', CURRENT_DATE + interval '21 days' + interval '5 weeks'),

('d0000000-0000-4000-8000-000200060001', 'b0000000-0000-4000-8000-000002000600', 1,
 'Automation Portfolio Presentation', '自動化ポートフォリオプレゼンテーション',
 'Prepare a 10-minute presentation showcasing your best 3 automations. Include live demos, results data, and lessons learned.',
 '最高の3つの自動化を紹介する10分間のプレゼンテーションを準備。ライブデモ、結果データ、学んだ教訓を含めること。',
 'project', CURRENT_DATE + interval '21 days' + interval '6 weeks'),

-- ── Course 3 Assignments ──
('d0000000-0000-4000-8000-000300010001', 'b0000000-0000-4000-8000-000003000100', 1,
 'AI Product Opportunity Analysis', 'AIプロダクト機会分析',
 'Identify 3 AI product opportunities in your domain. For each, analyze: target user, AI capability needed, build-vs-buy decision, and estimated effort.',
 'あなたのドメインで3つのAIプロダクト機会を特定。各機会について分析：ターゲットユーザー、必要なAI機能、ビルドvsバイの判断、見積もり工数。',
 'homework', CURRENT_DATE + interval '28 days' + interval '1 week'),

('d0000000-0000-4000-8000-000300020001', 'b0000000-0000-4000-8000-000003000200', 1,
 'API Integration Challenge', 'API統合チャレンジ',
 'Build a working script that calls the Claude API, handles streaming, and outputs structured JSON. Include error handling and retry logic.',
 'Claude APIを呼び出し、ストリーミングを処理し、構造化JSONを出力するスクリプトを構築。エラーハンドリングとリトライロジックを含めること。',
 'action-challenge', CURRENT_DATE + interval '28 days' + interval '2 weeks'),

('d0000000-0000-4000-8000-000300030001', 'b0000000-0000-4000-8000-000003000300', 1,
 'AI-Assisted Feature Build', 'AI支援機能構築',
 'Use Cursor to build a complete feature (frontend + backend) for your capstone project. Document your AI-assisted development workflow.',
 'Cursorを使ってキャップストーンプロジェクトの完全な機能（フロントエンド＋バックエンド）を構築。AI支援開発ワークフローを文書化。',
 'project', CURRENT_DATE + interval '28 days' + interval '3 weeks'),

('d0000000-0000-4000-8000-000300040001', 'b0000000-0000-4000-8000-000003000400', 1,
 'AI UX Prototype', 'AI UXプロトタイプ',
 'Design and build a working prototype of an AI-powered user interface. Test with 3 users and document feedback.',
 'AI搭載ユーザーインターフェースの動作するプロトタイプを設計・構築。3人のユーザーでテストしフィードバックを文書化。',
 'project', CURRENT_DATE + interval '28 days' + interval '4 weeks'),

('d0000000-0000-4000-8000-000300050001', 'b0000000-0000-4000-8000-000003000500', 1,
 'RAG System Implementation', 'RAGシステム実装',
 'Build a RAG pipeline that ingests at least 10 documents and answers questions with source citations. Measure retrieval accuracy.',
 '10以上のドキュメントを取り込み、ソース引用付きで質問に回答するRAGパイプラインを構築。検索精度を測定。',
 'project', CURRENT_DATE + interval '28 days' + interval '5 weeks'),

('d0000000-0000-4000-8000-000300060001', 'b0000000-0000-4000-8000-000003000600', 1,
 'Prompt System Design', 'プロンプトシステム設計',
 'Design a production prompt system with: system prompt, guardrails, 10 test cases, and an evaluation rubric. Show pass/fail rates.',
 'プロダクション用プロンプトシステムを設計：システムプロンプト、ガードレール、10のテストケース、評価ルーブリック。合格/不合格率を表示。',
 'action-challenge', CURRENT_DATE + interval '28 days' + interval '6 weeks'),

('d0000000-0000-4000-8000-000300070001', 'b0000000-0000-4000-8000-000003000700', 1,
 'Build an AI Agent', 'AIエージェントの構築',
 'Build an agent that uses at least 3 tools, implements planning, and handles error recovery. Demo it solving a multi-step task.',
 '3つ以上のツールを使用し、計画を実装し、エラー回復を処理するエージェントを構築。マルチステップタスクを解決するデモを行うこと。',
 'project', CURRENT_DATE + interval '28 days' + interval '7 weeks'),

('d0000000-0000-4000-8000-000300080001', 'b0000000-0000-4000-8000-000003000800', 1,
 'Test Suite for AI Features', 'AI機能のテストスイート',
 'Write a comprehensive test suite for your capstone AI features. Include unit tests, prompt regression tests, and output validation.',
 'キャップストーンAI機能の包括的なテストスイートを作成。ユニットテスト、プロンプト回帰テスト、出力バリデーションを含めること。',
 'action-challenge', CURRENT_DATE + interval '28 days' + interval '8 weeks'),

('d0000000-0000-4000-8000-000300090001', 'b0000000-0000-4000-8000-000003000900', 1,
 'Deploy Your AI Product', 'AIプロダクトのデプロイ',
 'Deploy your capstone project to production. Set up monitoring, configure environment variables, and document your deployment process.',
 'キャップストーンプロジェクトを本番環境にデプロイ。モニタリングの設定、環境変数の構成、デプロイプロセスの文書化。',
 'project', CURRENT_DATE + interval '28 days' + interval '9 weeks'),

('d0000000-0000-4000-8000-000300100001', 'b0000000-0000-4000-8000-000003001000', 1,
 'Capstone Presentation', 'キャップストーンプレゼンテーション',
 'Prepare and deliver a 15-minute demo of your deployed AI product. Include: problem statement, architecture, live demo, metrics, and future roadmap.',
 'デプロイ済みAIプロダクトの15分間デモを準備・実施。含める内容：問題定義、アーキテクチャ、ライブデモ、指標、将来のロードマップ。',
 'project', CURRENT_DATE + interval '28 days' + interval '10 weeks');


-- ============================================================
-- 5. COURSE VOCABULARY
-- ============================================================

INSERT INTO course_vocabulary (week_id, sort_order, term_en, term_jp) VALUES

-- ── Course 1 Week 1 ──
('b0000000-0000-4000-8000-000001000100', 1, 'Artificial Intelligence (AI)', '人工知能（AI）'),
('b0000000-0000-4000-8000-000001000100', 2, 'Machine Learning', '機械学習'),
('b0000000-0000-4000-8000-000001000100', 3, 'Large Language Model (LLM)', '大規模言語モデル（LLM）'),
('b0000000-0000-4000-8000-000001000100', 4, 'Neural Network', 'ニューラルネットワーク'),
('b0000000-0000-4000-8000-000001000100', 5, 'Training Data', '学習データ'),

-- ── Course 1 Week 2 ──
('b0000000-0000-4000-8000-000001000200', 1, 'Prompt', 'プロンプト'),
('b0000000-0000-4000-8000-000001000200', 2, 'Response / Output', '応答 / 出力'),
('b0000000-0000-4000-8000-000001000200', 3, 'Context Window', 'コンテキストウィンドウ'),
('b0000000-0000-4000-8000-000001000200', 4, 'Token', 'トークン'),

-- ── Course 1 Week 3 ──
('b0000000-0000-4000-8000-000001000300', 1, 'Prompt Engineering', 'プロンプトエンジニアリング'),
('b0000000-0000-4000-8000-000001000300', 2, 'System Prompt', 'システムプロンプト'),
('b0000000-0000-4000-8000-000001000300', 3, 'Temperature', 'テンプレチャー（温度）'),
('b0000000-0000-4000-8000-000001000300', 4, 'Hallucination', 'ハルシネーション'),

-- ── Course 1 Week 4 ──
('b0000000-0000-4000-8000-000001000400', 1, 'Content Generation', 'コンテンツ生成'),
('b0000000-0000-4000-8000-000001000400', 2, 'Tone of Voice', 'トーン・オブ・ボイス'),
('b0000000-0000-4000-8000-000001000400', 3, 'Brand Voice', 'ブランドボイス'),

-- ── Course 1 Week 5 ──
('b0000000-0000-4000-8000-000001000500', 1, 'Fact-Checking', 'ファクトチェック'),
('b0000000-0000-4000-8000-000001000500', 2, 'Source Attribution', '出典表示'),
('b0000000-0000-4000-8000-000001000500', 3, 'Research Synthesis', 'リサーチの統合'),

-- ── Course 1 Week 6 ──
('b0000000-0000-4000-8000-000001000600', 1, 'Image Generation', '画像生成'),
('b0000000-0000-4000-8000-000001000600', 2, 'Text-to-Image', 'テキストから画像'),
('b0000000-0000-4000-8000-000001000600', 3, 'Design Template', 'デザインテンプレート'),

-- ── Course 1 Week 7 ──
('b0000000-0000-4000-8000-000001000700', 1, 'AI Ethics', 'AI倫理'),
('b0000000-0000-4000-8000-000001000700', 2, 'Bias', 'バイアス（偏り）'),
('b0000000-0000-4000-8000-000001000700', 3, 'Data Privacy', 'データプライバシー'),
('b0000000-0000-4000-8000-000001000700', 4, 'Compliance', 'コンプライアンス'),

-- ── Course 1 Week 8 ──
('b0000000-0000-4000-8000-000001000800', 1, 'AI Integration', 'AI統合'),
('b0000000-0000-4000-8000-000001000800', 2, 'Workflow Automation', 'ワークフロー自動化'),
('b0000000-0000-4000-8000-000001000800', 3, 'ROI (Return on Investment)', 'ROI（投資対効果）'),

-- ── Course 2 Week 1 ──
('b0000000-0000-4000-8000-000002000100', 1, 'Chain-of-Thought Prompting', 'チェーン・オブ・ソート・プロンプティング'),
('b0000000-0000-4000-8000-000002000100', 2, 'Few-Shot Learning', 'フューショット学習'),
('b0000000-0000-4000-8000-000002000100', 3, 'Zero-Shot Learning', 'ゼロショット学習'),
('b0000000-0000-4000-8000-000002000100', 4, 'System Prompt', 'システムプロンプト'),

-- ── Course 2 Week 2 ──
('b0000000-0000-4000-8000-000002000200', 1, 'Trigger', 'トリガー'),
('b0000000-0000-4000-8000-000002000200', 2, 'Action', 'アクション'),
('b0000000-0000-4000-8000-000002000200', 3, 'Zap (Automation)', 'Zap（自動化）'),
('b0000000-0000-4000-8000-000002000200', 4, 'Webhook', 'ウェブフック'),

-- ── Course 2 Week 3 ──
('b0000000-0000-4000-8000-000002000300', 1, 'Content Pipeline', 'コンテンツパイプライン'),
('b0000000-0000-4000-8000-000002000300', 2, 'Repurposing', 'リパーパシング'),
('b0000000-0000-4000-8000-000002000300', 3, 'Editorial Calendar', 'エディトリアルカレンダー'),

-- ── Course 2 Week 4 ──
('b0000000-0000-4000-8000-000002000400', 1, 'Prompt Library', 'プロンプトライブラリ'),
('b0000000-0000-4000-8000-000002000400', 2, 'Prompt Template', 'プロンプトテンプレート'),
('b0000000-0000-4000-8000-000002000400', 3, 'Version Control', 'バージョン管理'),

-- ── Course 2 Week 5 ──
('b0000000-0000-4000-8000-000002000500', 1, 'ROI Analysis', 'ROI分析'),
('b0000000-0000-4000-8000-000002000500', 2, 'KPI (Key Performance Indicator)', 'KPI（重要業績評価指標）'),
('b0000000-0000-4000-8000-000002000500', 3, 'Time-to-Value', 'タイム・トゥ・バリュー'),

-- ── Course 2 Week 6 ──
('b0000000-0000-4000-8000-000002000600', 1, 'Automation Portfolio', '自動化ポートフォリオ'),
('b0000000-0000-4000-8000-000002000600', 2, 'Scaling', 'スケーリング'),
('b0000000-0000-4000-8000-000002000600', 3, 'Continuous Improvement', '継続的改善'),

-- ── Course 3 Week 1 ──
('b0000000-0000-4000-8000-000003000100', 1, 'API (Application Programming Interface)', 'API（アプリケーションプログラミングインターフェース）'),
('b0000000-0000-4000-8000-000003000100', 2, 'Model Selection', 'モデル選択'),
('b0000000-0000-4000-8000-000003000100', 3, 'Token Pricing', 'トークン料金'),
('b0000000-0000-4000-8000-000003000100', 4, 'Build vs Buy', 'ビルドvsバイ'),

-- ── Course 3 Week 2 ──
('b0000000-0000-4000-8000-000003000200', 1, 'API Key', 'APIキー'),
('b0000000-0000-4000-8000-000003000200', 2, 'Streaming Response', 'ストリーミングレスポンス'),
('b0000000-0000-4000-8000-000003000200', 3, 'Structured Output', '構造化出力'),
('b0000000-0000-4000-8000-000003000200', 4, 'Function Calling', '関数呼び出し'),

-- ── Course 3 Week 3 ──
('b0000000-0000-4000-8000-000003000300', 1, 'AI-Assisted Coding', 'AI支援コーディング'),
('b0000000-0000-4000-8000-000003000300', 2, 'Code Generation', 'コード生成'),
('b0000000-0000-4000-8000-000003000300', 3, 'Refactoring', 'リファクタリング'),

-- ── Course 3 Week 4 ──
('b0000000-0000-4000-8000-000003000400', 1, 'Chat Interface', 'チャットインターフェース'),
('b0000000-0000-4000-8000-000003000400', 2, 'Inline Suggestion', 'インラインサジェスト'),
('b0000000-0000-4000-8000-000003000400', 3, 'Autonomous Agent', '自律エージェント'),

-- ── Course 3 Week 5 ──
('b0000000-0000-4000-8000-000003000500', 1, 'RAG (Retrieval-Augmented Generation)', 'RAG（検索拡張生成）'),
('b0000000-0000-4000-8000-000003000500', 2, 'Vector Database', 'ベクターデータベース'),
('b0000000-0000-4000-8000-000003000500', 3, 'Embedding', '埋め込み'),
('b0000000-0000-4000-8000-000003000500', 4, 'Chunking', 'チャンキング'),

-- ── Course 3 Week 6 ──
('b0000000-0000-4000-8000-000003000600', 1, 'Guardrail', 'ガードレール'),
('b0000000-0000-4000-8000-000003000600', 2, 'Content Filtering', 'コンテンツフィルタリング'),
('b0000000-0000-4000-8000-000003000600', 3, 'Prompt Versioning', 'プロンプトバージョニング'),

-- ── Course 3 Week 7 ──
('b0000000-0000-4000-8000-000003000700', 1, 'AI Agent', 'AIエージェント'),
('b0000000-0000-4000-8000-000003000700', 2, 'Tool Use', 'ツール使用'),
('b0000000-0000-4000-8000-000003000700', 3, 'Planning Loop', '計画ループ'),
('b0000000-0000-4000-8000-000003000700', 4, 'Human-in-the-Loop', 'ヒューマン・イン・ザ・ループ'),

-- ── Course 3 Week 8 ──
('b0000000-0000-4000-8000-000003000800', 1, 'Regression Testing', '回帰テスト'),
('b0000000-0000-4000-8000-000003000800', 2, 'Output Validation', '出力バリデーション'),
('b0000000-0000-4000-8000-000003000800', 3, 'Fallback Strategy', 'フォールバック戦略'),

-- ── Course 3 Week 9 ──
('b0000000-0000-4000-8000-000003000900', 1, 'CI/CD Pipeline', 'CI/CDパイプライン'),
('b0000000-0000-4000-8000-000003000900', 2, 'Environment Variables', '環境変数'),
('b0000000-0000-4000-8000-000003000900', 3, 'Cost Optimization', 'コスト最適化'),

-- ── Course 3 Week 10 ──
('b0000000-0000-4000-8000-000003001000', 1, 'Capstone Project', 'キャップストーンプロジェクト'),
('b0000000-0000-4000-8000-000003001000', 2, 'Demo Day', 'デモデー'),
('b0000000-0000-4000-8000-000003001000', 3, 'Product Roadmap', 'プロダクトロードマップ');


-- ============================================================
-- 6. COURSE RESOURCES
-- ============================================================

INSERT INTO course_resources (week_id, sort_order, title_en, title_jp, url, resource_type, description_en, description_jp, is_public) VALUES

-- ── Course 1 Resources ──
('b0000000-0000-4000-8000-000001000100', 1,
 'What Is Generative AI?', '生成AIとは？',
 'https://www.mckinsey.com/featured-insights/mckinsey-explainers/what-is-generative-ai', 'article',
 'McKinsey''s comprehensive overview of generative AI and its business impact.',
 'マッキンゼーによる生成AIとそのビジネスへの影響の包括的概要。', true),

('b0000000-0000-4000-8000-000001000100', 2,
 'ChatGPT Official Guide', 'ChatGPT公式ガイド',
 'https://help.openai.com/en/collections/3742473-chatgpt', 'guide',
 'OpenAI''s official ChatGPT documentation and getting started guide.',
 'OpenAI公式のChatGPTドキュメントと入門ガイド。', true),

('b0000000-0000-4000-8000-000001000200', 1,
 'Claude Getting Started', 'Claude入門',
 'https://docs.anthropic.com/en/docs/about-claude/use-cases', 'guide',
 'Anthropic''s guide to using Claude for various use cases.',
 'Anthropicによる様々なユースケースでのClaude使用ガイド。', true),

('b0000000-0000-4000-8000-000001000300', 1,
 'Prompt Engineering Guide', 'プロンプトエンジニアリングガイド',
 'https://platform.openai.com/docs/guides/prompt-engineering', 'guide',
 'OpenAI''s official prompt engineering best practices.',
 'OpenAI公式のプロンプトエンジニアリングベストプラクティス。', true),

('b0000000-0000-4000-8000-000001000500', 1,
 'Perplexity AI', 'Perplexity AI',
 'https://www.perplexity.ai/', 'tool',
 'AI-powered research assistant for web research and fact-checking.',
 'ウェブリサーチとファクトチェックのためのAI搭載リサーチアシスタント。', true),

('b0000000-0000-4000-8000-000001000500', 2,
 'NotebookLM by Google', 'Google NotebookLM',
 'https://notebooklm.google/', 'tool',
 'Google''s AI-powered notebook for document analysis and research.',
 'GoogleのAI搭載ノートブック：ドキュメント分析とリサーチ用。', true),

('b0000000-0000-4000-8000-000001000600', 1,
 'Canva AI Features', 'Canva AI機能',
 'https://www.canva.com/ai-image-generator/', 'tool',
 'Canva''s AI-powered design tools for creating professional visuals.',
 'プロフェッショナルなビジュアル作成のためのCanva AIデザインツール。', true),

-- ── Course 2 Resources ──
('b0000000-0000-4000-8000-000002000100', 1,
 'Anthropic Prompt Engineering Guide', 'Anthropicプロンプトエンジニアリングガイド',
 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', 'guide',
 'Anthropic''s comprehensive guide to advanced prompting techniques.',
 'Anthropicによる上級プロンプティング技術の包括的ガイド。', false),

('b0000000-0000-4000-8000-000002000200', 1,
 'Zapier Getting Started', 'Zapier入門',
 'https://zapier.com/learn/getting-started-guide/', 'guide',
 'Official Zapier guide for building your first automations.',
 'Zapier公式の最初の自動化構築ガイド。', false),

('b0000000-0000-4000-8000-000002000200', 2,
 'Zapier AI Actions', 'Zapier AIアクション',
 'https://zapier.com/apps/ai/integrations', 'tool',
 'Explore Zapier''s AI-powered automation actions.',
 'ZapierのAI搭載自動化アクションを探索。', false),

('b0000000-0000-4000-8000-000002000300', 1,
 'Gamma Presentation Tool', 'Gammaプレゼンテーションツール',
 'https://gamma.app/', 'tool',
 'AI-powered presentation and document creation tool.',
 'AI搭載プレゼンテーション・ドキュメント作成ツール。', false),

('b0000000-0000-4000-8000-000002000500', 1,
 'Measuring AI ROI - Harvard Business Review', 'AI ROI測定 - ハーバードビジネスレビュー',
 'https://hbr.org/topic/subject/artificial-intelligence', 'article',
 'Harvard Business Review articles on measuring AI business impact.',
 'AIのビジネスインパクト測定に関するハーバードビジネスレビューの記事。', false),

-- ── Course 3 Resources ──
('b0000000-0000-4000-8000-000003000100', 1,
 'Anthropic API Documentation', 'Anthropic APIドキュメント',
 'https://docs.anthropic.com/', 'guide',
 'Official Claude API documentation for developers.',
 '開発者向けClaude API公式ドキュメント。', false),

('b0000000-0000-4000-8000-000003000200', 1,
 'Claude API Quickstart', 'Claude APIクイックスタート',
 'https://docs.anthropic.com/en/docs/quickstart', 'guide',
 'Get started with the Claude API in minutes.',
 '数分でClaude APIを始めましょう。', false),

('b0000000-0000-4000-8000-000003000300', 1,
 'Cursor IDE', 'Cursor IDE',
 'https://www.cursor.com/', 'tool',
 'AI-first code editor for accelerated development.',
 '加速開発のためのAIファーストコードエディタ。', false),

('b0000000-0000-4000-8000-000003000400', 1,
 'AI UX Design Patterns', 'AI UXデザインパターン',
 'https://www.nngroup.com/topic/ai/', 'article',
 'Nielsen Norman Group research on AI user experience patterns.',
 'ニールセン・ノーマン・グループによるAIユーザー体験パターンの研究。', false),

('b0000000-0000-4000-8000-000003000500', 1,
 'RAG Architecture Patterns', 'RAGアーキテクチャパターン',
 'https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation', 'guide',
 'Anthropic''s guide to building RAG systems with Claude.',
 'Anthropicによるclaude でのRAGシステム構築ガイド。', false),

('b0000000-0000-4000-8000-000003000700', 1,
 'Claude Agent SDK', 'Claude Agent SDK',
 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview', 'guide',
 'Build AI agents with Claude''s tool use and function calling capabilities.',
 'Claudeのツール使用と関数呼び出し機能でAIエージェントを構築。', false),

('b0000000-0000-4000-8000-000003000900', 1,
 'Vercel Deployment Guide', 'Vercelデプロイガイド',
 'https://vercel.com/docs', 'guide',
 'Official Vercel documentation for deploying web applications.',
 'Webアプリケーションデプロイのためのvercel公式ドキュメント。', false);


-- ============================================================
-- DONE
-- ============================================================
-- After running this script:
-- 1. Visit /learn to see the course catalog
-- 2. Click a course to see the full detail page
-- 3. Sign up and enroll to see the student dashboard
-- 4. Open a course hub to browse weekly content
