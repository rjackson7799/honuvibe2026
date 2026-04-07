-- ============================================================
-- HonuVibe Vault — Seed Content
-- Run:    psql $DATABASE_URL < supabase/seed_vault_content.sql
-- Safe to re-run: slugs use ON CONFLICT DO NOTHING
-- All items flagged: admin_notes = 'SEED DATA — replace with real content'
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CANONICAL TAGS
-- ============================================================
INSERT INTO tags (slug, name_en, name_jp, category) VALUES
  -- Topic tags
  ('ai-fundamentals',    'AI Fundamentals',    'AI基礎',                     'topic'),
  ('prompt-engineering', 'Prompt Engineering', 'プロンプトエンジニアリング',   'topic'),
  ('business-ai',        'Business AI',        'ビジネスAI',                 'topic'),
  ('productivity',       'Productivity',       '生産性',                     'topic'),
  ('content-creation',   'Content Creation',   'コンテンツ制作',              'topic'),
  ('research',           'Research',           'リサーチ',                   'topic'),
  ('automation',         'Automation',         '自動化',                     'topic'),
  ('ethics',             'Ethics',             'AIの倫理',                   'topic'),
  ('career',             'Career',             'キャリア',                   'topic'),
  -- Tool tags
  ('chatgpt',            'ChatGPT',            'ChatGPT',                    'tool'),
  ('claude',             'Claude',             'Claude',                     'tool'),
  ('gemini',             'Gemini',             'Gemini',                     'tool'),
  ('perplexity',         'Perplexity',         'Perplexity',                 'tool'),
  ('notebooklm',         'NotebookLM',         'NotebookLM',                 'tool'),
  ('zapier',             'Zapier',             'Zapier',                     'tool'),
  ('cursor',             'Cursor',             'Cursor',                     'tool')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. VAULT SERIES
-- ============================================================
INSERT INTO vault_series (
  slug, title_en, title_jp,
  description_en, description_jp,
  thumbnail_url, difficulty_level, tags,
  is_published, is_featured
) VALUES
(
  'prompt-engineering-101',
  'Prompt Engineering 101',
  'プロンプトエンジニアリング基礎',
  'Master the fundamentals of writing effective AI prompts. Covers core concepts, chain-of-thought techniques, and advanced system prompts with Claude.',
  'AIプロンプトを効果的に書くための基礎を習得しましょう。基本概念、Chain-of-Thoughtテクニック、Claudeを使った上級システムプロンプトをカバーします。',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Engineering+101',
  'beginner',
  '["prompt-engineering","ai-fundamentals","claude","chatgpt"]',
  true, true
),
(
  'ai-tools-japanese-business',
  'AI Tools for Japanese Business',
  '日本のビジネスのためのAIツール',
  'A practical guide to integrating AI into Japanese professional workflows. From business email to meeting notes to full workflow automation.',
  '日本のビジネス現場にAIを取り入れるための実践ガイド。ビジネスメールから会議メモ、業務自動化まで幅広くカバーします。',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Tools+for+Japanese+Business',
  'intermediate',
  '["business-ai","productivity","automation","chatgpt"]',
  true, true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. SERIES 1 ITEMS — Prompt Engineering 101
-- ============================================================

-- Item 1 of 4: Free intro video (YouTube)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, embed_url, thumbnail_url,
  duration_minutes, author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'what-is-prompt-engineering',
  'What Is Prompt Engineering?',
  'プロンプトエンジニアリングとは？',
  'A beginner-friendly introduction to prompt engineering — what it is, why it matters, and how to start applying it today with ChatGPT or Claude.',
  'プロンプトエンジニアリングの入門動画。ChatGPTやClaudeを使って、今日から実践できる基礎を丁寧に解説します。',
  'video_youtube', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=What+Is+Prompt+Engineering',
  12, 'Ryan Jackson', '2026-01-15',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals","chatgpt","claude"]',
  'free',
  true, true, 'current',
  'SEED DATA — replace with real content',
  vs.id, 1
FROM vault_series vs WHERE vs.slug = 'prompt-engineering-101'
ON CONFLICT (slug) DO NOTHING;

-- Item 2 of 4: Chain-of-Thought guide (premium)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'chain-of-thought-prompting-guide',
  'Chain-of-Thought Prompting: Step-by-Step',
  'Chain-of-Thoughtプロンプティング：ステップバイステップ',
  'Learn how to use chain-of-thought prompting to dramatically improve AI reasoning quality. Includes real before/after examples across business and creative tasks.',
  'Chain-of-Thoughtプロンプティングを使ってAIの推論品質を大幅に向上させる方法を学びます。ビジネスとクリエイティブタスクの実例も豊富に掲載。',
  'guide', 'honuvibe',
  'https://honuvibe.ai/vault/guides/chain-of-thought-prompting-guide',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Chain+of+Thought+Prompting',
  'Ryan Jackson', '2026-01-22',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals","claude","chatgpt"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 2
FROM vault_series vs WHERE vs.slug = 'prompt-engineering-101'
ON CONFLICT (slug) DO NOTHING;

-- Item 3 of 4: Prompt Starter Kit template (premium, has downloads)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'prompt-starter-kit',
  'My Prompt Starter Kit',
  'プロンプトスターターキット',
  'A ready-to-use collection of 20 proven prompt templates covering email, research, summarization, ideation, and more. Download the PDF and XLSX versions.',
  'メール、リサーチ、要約、アイデア出しなど、すぐに使える20のプロンプトテンプレートコレクション。PDFとXLSX形式でダウンロードできます。',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/prompt-starter-kit',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Starter+Kit',
  'Ryan Jackson', '2026-01-29',
  'beginner', 'both',
  '["prompt-engineering","productivity","chatgpt","claude"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 3
FROM vault_series vs WHERE vs.slug = 'prompt-engineering-101'
ON CONFLICT (slug) DO NOTHING;

-- Item 4 of 4: Advanced System Prompts video (premium, custom hosted)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  duration_minutes, author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'advanced-system-prompts-claude',
  'Advanced System Prompts with Claude',
  'Claudeで学ぶ上級システムプロンプト',
  'Go deep on system prompts: persona design, constraint setting, context injection, and multi-turn conversation architecture. Recorded exclusively for HonuVibe members.',
  'システムプロンプトを深掘り：ペルソナ設計、制約設定、コンテキスト注入、マルチターン会話アーキテクチャ。HonuVibeメンバー向け限定収録。',
  'video_custom', 'honuvibe',
  'https://honuvibe.ai/vault/videos/advanced-system-prompts-claude',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Advanced+System+Prompts',
  22, 'Ryan Jackson', '2026-02-05',
  'intermediate', 'both',
  '["prompt-engineering","claude","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 4
FROM vault_series vs WHERE vs.slug = 'prompt-engineering-101'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. SERIES 2 ITEMS — AI Tools for Japanese Business
-- ============================================================

-- Item 1 of 4: Free intro article (both languages)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'why-japanese-professionals-adopting-ai',
  'Why Japanese Professionals Are Adopting AI Now',
  '日本のプロがAIを採用し始めた理由',
  'An honest look at what is driving AI adoption in Japanese workplaces, the unique challenges professionals face, and why 2026 is the tipping point.',
  '日本の職場でAI導入が進む背景、プロフェッショナルが直面する課題、そして2026年がターニングポイントである理由を解説します。',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/why-japanese-professionals-adopting-ai',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Japanese+Professionals+%26+AI',
  'Ryan Jackson', '2026-02-10',
  'beginner', 'both',
  '["business-ai","career","ai-fundamentals"]',
  'free',
  true, true, 'current',
  'SEED DATA — replace with real content',
  vs.id, 1
FROM vault_series vs WHERE vs.slug = 'ai-tools-japanese-business'
ON CONFLICT (slug) DO NOTHING;

-- Item 2 of 4: Business email guide (JP only, premium)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'chatgpt-business-email-japanese',
  'Writing Japanese Business Email with ChatGPT',
  'ChatGPTでビジネスメールを書く',
  'A step-by-step guide to drafting professional Japanese business emails using ChatGPT. Includes prompts for formal requests, follow-ups, and apology emails.',
  'ChatGPTを使って日本語のビジネスメールを作成するステップバイステップガイド。正式な依頼、フォローアップ、お詫びメールのプロンプトも収録。',
  'guide', 'honuvibe',
  'https://honuvibe.ai/vault/guides/chatgpt-business-email-japanese',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=ChatGPT%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9%E3%83%A1%E3%83%BC%E3%83%AB',
  'Ryan Jackson', '2026-02-17',
  'intermediate', 'ja',
  '["business-ai","productivity","chatgpt"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 2
FROM vault_series vs WHERE vs.slug = 'ai-tools-japanese-business'
ON CONFLICT (slug) DO NOTHING;

-- Item 3 of 4: Meeting notes template (JP only, premium, has download)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, thumbnail_url,
  author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'ai-meeting-notes-template-japanese',
  'AI Meeting Notes Template (Japanese)',
  'AI会議メモテンプレート',
  'A downloadable template for capturing and summarizing Japanese business meetings with AI assistance. Includes pre-meeting agenda, live notes, and action items sections.',
  '日本語の会議をAIでキャプチャ・要約するためのダウンロード可能なテンプレート。会議前アジェンダ、ライブメモ、アクションアイテムのセクションを収録。',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/ai-meeting-notes-template-japanese',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI%E4%BC%9A%E8%AD%B0%E3%83%A1%E3%83%A2',
  'Ryan Jackson', '2026-02-24',
  'beginner', 'ja',
  '["business-ai","productivity","automation"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 3
FROM vault_series vs WHERE vs.slug = 'ai-tools-japanese-business'
ON CONFLICT (slug) DO NOTHING;

-- Item 4 of 4: Zapier automation video (JP only, premium, YouTube)
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, embed_url, thumbnail_url,
  duration_minutes, author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes,
  series_id, series_order
)
SELECT
  'zapier-automation-japanese-business',
  'Workflow Automation for Japanese Business with Zapier',
  'Zapierで業務自動化：実践ガイド',
  'A practical video guide to automating repetitive Japanese business workflows with Zapier AI Actions. Covers email routing, report generation, and Slack notifications.',
  'ZapierのAIアクションを使って繰り返し業務を自動化する実践動画。メールルーティング、レポート生成、Slack通知のウォークスルーを収録。',
  'video_youtube', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Zapier%E6%A5%AD%E5%8B%99%E8%87%AA%E5%8B%95%E5%8C%96',
  25, 'Ryan Jackson', '2026-03-03',
  'intermediate', 'ja',
  '["automation","zapier","business-ai","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content',
  vs.id, 4
FROM vault_series vs WHERE vs.slug = 'ai-tools-japanese-business'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 5. STANDALONE CONTENT ITEMS (19 items, no series)
-- ============================================================
INSERT INTO content_items (
  slug, title_en, title_jp, description_en, description_jp,
  content_type, source, url, embed_url, thumbnail_url,
  duration_minutes, author_name, publish_date,
  difficulty_level, language, tags, access_tier,
  is_published, is_featured, freshness_status, admin_notes
) VALUES

-- video_youtube (2 items)
(
  'chatgpt-claude-gemini-comparison',
  'ChatGPT vs Claude vs Gemini: Which AI Tool Is Right for You?',
  'ChatGPT vs Claude vs Gemini：どれを選ぶ？',
  'A clear-headed comparison of the three leading AI assistants — capabilities, pricing, use cases, and which one to reach for in different situations.',
  '三大AIアシスタントを冷静に比較。機能、価格、ユースケース、使い分けのポイントを解説します。',
  'video_youtube', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=ChatGPT+vs+Claude+vs+Gemini',
  18, 'Ryan Jackson', '2026-01-08',
  'beginner', 'both',
  '["ai-fundamentals","chatgpt","claude","gemini"]',
  'premium',
  true, true, 'current',
  'SEED DATA — replace with real content'
),
(
  'perplexity-deep-research',
  'Using Perplexity AI for Deep Research',
  'PerplexityでAI深掘りリサーチ',
  'How to use Perplexity AI to run comprehensive research on any topic — from sourcing to synthesis to citation. Ideal for consultants, writers, and analysts.',
  'PerplexityのAIを使ってあらゆるトピックを深く調査する方法。ソース収集から統合、引用まで。コンサルタント、ライター、アナリストに最適。',
  'video_youtube', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Perplexity+Deep+Research',
  20, 'Ryan Jackson', '2026-01-20',
  'intermediate', 'en',
  '["research","perplexity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),

-- video_custom (2 items)
(
  'ai-ethics-every-professional',
  'AI Ethics: What Every Professional Should Know',
  'AIの倫理：プロが知っておくべきこと',
  'An honest, practical look at AI ethics — bias, hallucination, privacy, and accountability. Includes a framework for making responsible AI decisions at work.',
  'AIの倫理を正直かつ実践的に解説。バイアス、ハルシネーション、プライバシー、説明責任を扱い、職場での責任あるAI利用フレームワークも紹介。',
  'video_custom', 'honuvibe',
  'https://honuvibe.ai/vault/videos/ai-ethics-every-professional',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Ethics',
  28, 'Ryan Jackson', '2026-01-10',
  'beginner', 'both',
  '["ethics","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'building-personal-ai-workflow',
  'Building a Personal AI Workflow',
  'パーソナルAIワークフローの構築',
  'Design an AI workflow that actually sticks. Covers tool selection, habit integration, and how to layer multiple AI tools for maximum output with minimum friction.',
  '実際に続くAIワークフローの設計。ツール選定、習慣への統合、複数のAIツールを組み合わせて最大の成果を最小の摩擦で実現する方法を解説。',
  'video_custom', 'honuvibe',
  'https://honuvibe.ai/vault/videos/building-personal-ai-workflow',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Personal+AI+Workflow',
  35, 'Ryan Jackson', '2026-02-12',
  'intermediate', 'both',
  '["productivity","automation","chatgpt","claude"]',
  'premium',
  true, true, 'current',
  'SEED DATA — replace with real content'
),

-- article (3 items)
(
  'prompt-engineering-mindset',
  'The Prompt Engineering Mindset',
  'プロンプトエンジニアリングのマインドセット',
  'Prompting is not about magic words — it is about clear thinking. This article breaks down the mental model behind effective prompting that nobody else is teaching.',
  'プロンプトは魔法の言葉ではなく、明確な思考の産物です。効果的なプロンプトの背後にあるメンタルモデルを解説します。',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/prompt-engineering-mindset',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Engineering+Mindset',
  NULL, 'Ryan Jackson', '2026-01-05',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'ai-japanese-workplace-trends-2026',
  'AI in the Japanese Workplace: Trends for 2026',
  '日本の職場におけるAI：2026年のトレンド',
  'An analysis of how AI is being adopted across Japanese industries in 2026 — sector breakdowns, real adoption blockers, and what comes next.',
  '2026年、日本の職場でAIがどのように使われているかを業種別に分析。導入の課題と今後の展望をデータとともに紹介。',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/ai-japanese-workplace-trends-2026',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Trends+Japan+2026',
  NULL, 'Ryan Jackson', '2026-03-01',
  'intermediate', 'ja',
  '["business-ai","career"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'ai-content-creation-social-media',
  'AI Content Creation for Social Media',
  'SNSのためのAIコンテンツ制作',
  'How to use AI to plan, draft, and repurpose social media content across platforms. Includes specific prompt templates for LinkedIn, X, and Instagram.',
  'AIを使ってSNSコンテンツを計画・下書き・リパーパスする方法。LinkedIn、X、Instagram向けのプロンプトテンプレートを収録。',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/ai-content-creation-social-media',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Content+Creation',
  NULL, 'Ryan Jackson', '2026-02-01',
  'intermediate', 'en',
  '["content-creation","chatgpt","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),

-- guide (2 items)
(
  'notebooklm-research-guide',
  'Getting Started with NotebookLM for Research',
  'リサーチのためのNotebookLM入門',
  'A step-by-step guide to using NotebookLM for deep research projects. Upload sources, generate summaries, ask questions, and build a research knowledge base.',
  'リサーチプロジェクトへのNotebookLM活用ガイド。ソースのアップロード、要約生成、Q&A、ナレッジベース構築方法を解説。',
  'guide', 'honuvibe',
  'https://honuvibe.ai/vault/guides/notebooklm-research-guide',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=NotebookLM+Research',
  NULL, 'Ryan Jackson', '2026-01-18',
  'beginner', 'en',
  '["research","notebooklm","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'automate-content-calendar-ai',
  'Automating Your Content Calendar with AI',
  'AIでコンテンツカレンダーを自動化する',
  'An advanced guide to building a fully automated content calendar using AI and Zapier. Covers ideation, drafting, scheduling, and performance review loops.',
  'AIとZapierを使って完全自動化されたコンテンツカレンダーを構築する上級ガイド。アイデア出し、下書き、スケジューリング、パフォーマンスレビューを網羅。',
  'guide', 'honuvibe',
  'https://honuvibe.ai/vault/guides/automate-content-calendar-ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Content+Calendar+Automation',
  NULL, 'Ryan Jackson', '2026-03-10',
  'advanced', 'both',
  '["content-creation","automation","zapier","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),

-- template (2 items)
(
  'ai-project-brief-template',
  'AI Project Brief Template',
  'AIプロジェクトブリーフテンプレート',
  'A structured template for scoping any AI project — from client briefing to output definition. Downloadable in PDF and DOCX. Works for solo projects and teams.',
  'クライアントブリーフから成果物定義まで、あらゆるAIプロジェクトをスコープするための構造化テンプレート。PDFとDOCXでダウンロード可能。',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/ai-project-brief-template',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Project+Brief',
  NULL, 'Ryan Jackson', '2026-01-25',
  'beginner', 'both',
  '["productivity","business-ai"]',
  'free',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'weekly-ai-experiment-log',
  'Weekly AI Experiment Log',
  '週次AIエクスペリメントログ',
  'Track your AI experiments systematically with this weekly log template. Record prompts, outputs, ratings, and insights to build a personal AI learning library over time.',
  'このウィークリーログテンプレートでAI実験を体系的に記録。プロンプト、出力、評価、洞察を蓄積して個人のAI学習ライブラリを構築しましょう。',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/weekly-ai-experiment-log',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Experiment+Log',
  NULL, 'Ryan Jackson', '2026-02-15',
  'intermediate', 'en',
  '["productivity","prompt-engineering"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),

-- tool (4 items)
(
  'claude-ai-complete-overview',
  'Claude.ai — Complete Overview',
  'Claude.ai 完全ガイド',
  'Everything you need to know to get started with Claude.ai — interface walkthrough, key features, strengths vs ChatGPT, and the best use cases to start with.',
  'Claude.aiを始めるために必要なすべてを網羅。インターフェースの使い方、主要機能、ChatGPTとの比較、おすすめの活用方法を解説。',
  'tool', 'honuvibe',
  'https://claude.ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Claude.ai+Overview',
  NULL, 'Ryan Jackson', '2026-01-03',
  'beginner', 'both',
  '["ai-fundamentals","claude"]',
  'free',
  true, true, 'current',
  'SEED DATA — replace with real content'
),
(
  'cursor-ai-code-editor-guide',
  'Cursor: AI Code Editor Guide',
  'Cursor：AIコードエディターガイド',
  'A practical guide to Cursor, the AI-native code editor. Covers setup, Tab completion, Chat, Composer, and how to use it for non-developers automating workflows.',
  'AIネイティブコードエディターCursorの実践ガイド。セットアップ、Tabコンプリーション、チャット、Composerの使い方と、業務自動化への活用法を解説。',
  'tool', 'external',
  'https://cursor.com',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cursor+AI+Editor',
  NULL, 'Ryan Jackson', '2026-02-08',
  'intermediate', 'en',
  '["ai-fundamentals","cursor","automation"]',
  'free',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'zapier-ai-actions-overview',
  'Zapier AI Actions Overview',
  'Zapier AIアクション概要',
  'How to use Zapier AI Actions to connect your favorite apps and automate tasks with natural language. Includes practical automation recipes for business workflows.',
  'Zapier AIアクションを使ってアプリ連携をテキスト指示だけで自動化する方法。ビジネスワークフローの自動化レシピも収録。',
  'tool', 'external',
  'https://zapier.com/ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Zapier+AI+Actions',
  NULL, 'Ryan Jackson', '2026-02-20',
  'intermediate', 'both',
  '["automation","zapier","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'notebooklm-deep-dive',
  'NotebookLM Deep Dive',
  'NotebookLM 徹底解説',
  'An advanced exploration of NotebookLM: audio overviews, multi-source synthesis, citation accuracy, and how to build a serious research workflow on top of it.',
  'NotebookLMの高度な活用法を徹底解説。音声概要、マルチソース統合、引用精度、そして本格的なリサーチワークフローの構築方法。',
  'tool', 'external',
  'https://notebooklm.google.com',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=NotebookLM+Deep+Dive',
  NULL, 'Ryan Jackson', '2026-03-15',
  'advanced', 'en',
  '["research","notebooklm"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),

-- course_recording (4 items, all premium)
(
  'cohort1-session-prompt-fundamentals',
  'Cohort 1 Session: Prompt Fundamentals',
  'コホート1セッション：プロンプト基礎',
  'The recorded session from HonuVibe Cohort 1 covering prompt fundamentals. Includes live Q&A, student examples, and instructor walkthroughs of real-world use cases.',
  'HonuVibeコホート1のプロンプト基礎セッション録画。ライブQ&A、受講生の実例、リアルユースケースのウォークスルーを収録。',
  'course_recording', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort1-session-prompt-fundamentals',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+1%3A+Prompt+Fundamentals',
  60, 'Ryan Jackson', '2025-10-15',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'cohort1-session-ai-workflows',
  'Cohort 1 Session: Building AI Workflows',
  'コホート1セッション：AIワークフロー構築',
  'Recorded session from Cohort 1 on designing and deploying personal AI workflows. Covers tool stacking, trigger design, and live automation builds with Zapier.',
  'コホート1のAIワークフロー設計・実装セッション録画。ツール連携、トリガー設計、Zapierを使ったライブ自動化構築を収録。',
  'course_recording', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort1-session-ai-workflows',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+1%3A+AI+Workflows',
  75, 'Ryan Jackson', '2025-11-05',
  'intermediate', 'both',
  '["automation","productivity","zapier"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'cohort2-session-ai-content-creators',
  'Cohort 2 Session: AI for Content Creators',
  'コホート2セッション：コンテンツクリエイターのためのAI',
  'Cohort 2 session on using AI across the full content creation lifecycle — ideation, scripting, editing, repurposing, and distribution strategy.',
  'コホート2のコンテンツ制作ライフサイクル全体にわたるAI活用セッション録画。アイデア出し、スクリプト、編集、リパーパス、配信戦略を網羅。',
  'course_recording', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort2-session-ai-content-creators',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+2%3A+Content+Creators',
  65, 'Ryan Jackson', '2026-01-28',
  'intermediate', 'en',
  '["content-creation","chatgpt","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
),
(
  'cohort2-session-advanced-claude',
  'Cohort 2 Session: Advanced Claude Techniques',
  'コホート2セッション：Claude上級テクニック',
  'The deep-dive Claude session from Cohort 2. Covers Projects, long-context management, artifacts, vision capabilities, and custom instruction design.',
  'コホート2のClaude上級テクニックセッション録画。Projects、長文コンテキスト管理、アーティファクト、ビジョン機能、カスタム指示設計を徹底解説。',
  'course_recording', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort2-session-advanced-claude',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+2%3A+Advanced+Claude',
  80, 'Ryan Jackson', '2026-02-25',
  'advanced', 'both',
  '["claude","prompt-engineering","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA — replace with real content'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. VAULT DOWNLOADS
-- ============================================================

-- Prompt Starter Kit — PDF
INSERT INTO vault_downloads (
  content_item_id, file_name, file_url,
  file_size_bytes, file_type,
  description_en, description_jp,
  access_tier, display_order
)
SELECT
  ci.id,
  'Prompt Starter Kit.pdf',
  'https://honuvibe.ai/vault/downloads/prompt-starter-kit.pdf',
  245760, 'pdf',
  'PDF version of the Prompt Starter Kit — 20 prompt templates ready to copy and paste.',
  'プロンプトスターターキットのPDF版。コピー&ペーストで使える20のプロンプトテンプレート。',
  'premium', 1
FROM content_items ci
WHERE ci.slug = 'prompt-starter-kit'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'Prompt Starter Kit.pdf'
);

-- Prompt Starter Kit — XLSX
INSERT INTO vault_downloads (
  content_item_id, file_name, file_url,
  file_size_bytes, file_type,
  description_en, description_jp,
  access_tier, display_order
)
SELECT
  ci.id,
  'Prompt Starter Kit.xlsx',
  'https://honuvibe.ai/vault/downloads/prompt-starter-kit.xlsx',
  51200, 'xlsx',
  'Editable Excel/Sheets version of the Prompt Starter Kit with sortable columns and rating fields.',
  '並び替え可能な列と評価フィールド付きの編集可能なExcel/Sheets版プロンプトスターターキット。',
  'premium', 2
FROM content_items ci
WHERE ci.slug = 'prompt-starter-kit'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'Prompt Starter Kit.xlsx'
);

-- AI Meeting Notes Template — DOCX
INSERT INTO vault_downloads (
  content_item_id, file_name, file_url,
  file_size_bytes, file_type,
  description_en, description_jp,
  access_tier, display_order
)
SELECT
  ci.id,
  'AI Meeting Notes Template.docx',
  'https://honuvibe.ai/vault/downloads/ai-meeting-notes-template-japanese.docx',
  38912, 'docx',
  'Word/Docs version of the Japanese AI Meeting Notes Template. Fully editable.',
  'AI会議メモテンプレートのWord/Docs版。自由に編集できます。',
  'premium', 1
FROM content_items ci
WHERE ci.slug = 'ai-meeting-notes-template-japanese'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'AI Meeting Notes Template.docx'
);

COMMIT;
