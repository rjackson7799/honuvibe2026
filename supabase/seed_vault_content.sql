-- ============================================================
-- HonuVibe Vault â€” Seed Content
-- Run:    psql $DATABASE_URL < supabase/seed_vault_content.sql
-- Safe to re-run: slugs use ON CONFLICT DO NOTHING
-- All items flagged: admin_notes = 'SEED DATA â€” replace with real content'
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CANONICAL TAGS
-- ============================================================
INSERT INTO tags (slug, name_en, name_jp, category) VALUES
  -- Topic tags
  ('ai-fundamentals',    'AI Fundamentals',    'AIåŸºç¤Ž',                     'topic'),
  ('prompt-engineering', 'Prompt Engineering', 'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°',   'topic'),
  ('business-ai',        'Business AI',        'ãƒ“ã‚¸ãƒã‚¹AI',                 'topic'),
  ('productivity',       'Productivity',       'ç”Ÿç”£æ€§',                     'topic'),
  ('content-creation',   'Content Creation',   'ã‚³ãƒ³ãƒ†ãƒ³ãƒ„åˆ¶ä½œ',              'topic'),
  ('research',           'Research',           'ãƒªã‚µãƒ¼ãƒ',                   'topic'),
  ('automation',         'Automation',         'è‡ªå‹•åŒ–',                     'topic'),
  ('ethics',             'Ethics',             'AIã®å€«ç†',                   'topic'),
  ('career',             'Career',             'ã‚­ãƒ£ãƒªã‚¢',                   'topic'),
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
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°åŸºç¤Ž',
  'Master the fundamentals of writing effective AI prompts. Covers core concepts, chain-of-thought techniques, and advanced system prompts with Claude.',
  'AIãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚’åŠ¹æžœçš„ã«æ›¸ããŸã‚ã®åŸºç¤Žã‚’ç¿’å¾—ã—ã¾ã—ã‚‡ã†ã€‚åŸºæœ¬æ¦‚å¿µã€Chain-of-Thoughtãƒ†ã‚¯ãƒ‹ãƒƒã‚¯ã€Claudeã‚’ä½¿ã£ãŸä¸Šç´šã‚·ã‚¹ãƒ†ãƒ ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚’ã‚«ãƒãƒ¼ã—ã¾ã™ã€‚',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Engineering+101',
  'beginner',
  '["prompt-engineering","ai-fundamentals","claude","chatgpt"]',
  true, true
),
(
  'ai-tools-japanese-business',
  'AI Tools for Japanese Business',
  'æ—¥æœ¬ã®ãƒ“ã‚¸ãƒã‚¹ã®ãŸã‚ã®AIãƒ„ãƒ¼ãƒ«',
  'A practical guide to integrating AI into Japanese professional workflows. From business email to meeting notes to full workflow automation.',
  'æ—¥æœ¬ã®ãƒ“ã‚¸ãƒã‚¹ç¾å ´ã«AIã‚’å–ã‚Šå…¥ã‚Œã‚‹ãŸã‚ã®å®Ÿè·µã‚¬ã‚¤ãƒ‰ã€‚ãƒ“ã‚¸ãƒã‚¹ãƒ¡ãƒ¼ãƒ«ã‹ã‚‰ä¼šè­°ãƒ¡ãƒ¢ã€æ¥­å‹™è‡ªå‹•åŒ–ã¾ã§å¹…åºƒãã‚«ãƒãƒ¼ã—ã¾ã™ã€‚',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Tools+for+Japanese+Business',
  'intermediate',
  '["business-ai","productivity","automation","chatgpt"]',
  true, true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. SERIES 1 ITEMS â€” Prompt Engineering 101
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
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°ã¨ã¯ï¼Ÿ',
  'A beginner-friendly introduction to prompt engineering â€” what it is, why it matters, and how to start applying it today with ChatGPT or Claude.',
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°ã®å…¥é–€å‹•ç”»ã€‚ChatGPTã‚„Claudeã‚’ä½¿ã£ã¦ã€ä»Šæ—¥ã‹ã‚‰å®Ÿè·µã§ãã‚‹åŸºç¤Žã‚’ä¸å¯§ã«è§£èª¬ã—ã¾ã™ã€‚',
  'video', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=What+Is+Prompt+Engineering',
  12, 'Ryan Jackson', '2026-01-15',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals","chatgpt","claude"]',
  'free',
  true, true, 'current',
  'SEED DATA â€” replace with real content',
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
  'Chain-of-Thoughtãƒ—ãƒ­ãƒ³ãƒ—ãƒ†ã‚£ãƒ³ã‚°ï¼šã‚¹ãƒ†ãƒƒãƒ—ãƒã‚¤ã‚¹ãƒ†ãƒƒãƒ—',
  'Learn how to use chain-of-thought prompting to dramatically improve AI reasoning quality. Includes real before/after examples across business and creative tasks.',
  'Chain-of-Thoughtãƒ—ãƒ­ãƒ³ãƒ—ãƒ†ã‚£ãƒ³ã‚°ã‚’ä½¿ã£ã¦AIã®æŽ¨è«–å“è³ªã‚’å¤§å¹…ã«å‘ä¸Šã•ã›ã‚‹æ–¹æ³•ã‚’å­¦ã³ã¾ã™ã€‚ãƒ“ã‚¸ãƒã‚¹ã¨ã‚¯ãƒªã‚¨ã‚¤ãƒ†ã‚£ãƒ–ã‚¿ã‚¹ã‚¯ã®å®Ÿä¾‹ã‚‚è±Šå¯Œã«æŽ²è¼‰ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/guides/chain-of-thought-prompting-guide',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Chain+of+Thought+Prompting',
  'Ryan Jackson', '2026-01-22',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals","claude","chatgpt"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
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
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¹ã‚¿ãƒ¼ã‚¿ãƒ¼ã‚­ãƒƒãƒˆ',
  'A ready-to-use collection of 20 proven prompt templates covering email, research, summarization, ideation, and more. Download the PDF and XLSX versions.',
  'ãƒ¡ãƒ¼ãƒ«ã€ãƒªã‚µãƒ¼ãƒã€è¦ç´„ã€ã‚¢ã‚¤ãƒ‡ã‚¢å‡ºã—ãªã©ã€ã™ãã«ä½¿ãˆã‚‹20ã®ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã‚³ãƒ¬ã‚¯ã‚·ãƒ§ãƒ³ã€‚PDFã¨XLSXå½¢å¼ã§ãƒ€ã‚¦ãƒ³ãƒ­ãƒ¼ãƒ‰ã§ãã¾ã™ã€‚',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/prompt-starter-kit',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Starter+Kit',
  'Ryan Jackson', '2026-01-29',
  'beginner', 'both',
  '["prompt-engineering","productivity","chatgpt","claude"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
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
  'Claudeã§å­¦ã¶ä¸Šç´šã‚·ã‚¹ãƒ†ãƒ ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆ',
  'Go deep on system prompts: persona design, constraint setting, context injection, and multi-turn conversation architecture. Recorded exclusively for HonuVibe members.',
  'ã‚·ã‚¹ãƒ†ãƒ ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚’æ·±æŽ˜ã‚Šï¼šãƒšãƒ«ã‚½ãƒŠè¨­è¨ˆã€åˆ¶ç´„è¨­å®šã€ã‚³ãƒ³ãƒ†ã‚­ã‚¹ãƒˆæ³¨å…¥ã€ãƒžãƒ«ãƒã‚¿ãƒ¼ãƒ³ä¼šè©±ã‚¢ãƒ¼ã‚­ãƒ†ã‚¯ãƒãƒ£ã€‚HonuVibeãƒ¡ãƒ³ãƒãƒ¼å‘ã‘é™å®šåŽéŒ²ã€‚',
  'video', 'honuvibe',
  'https://honuvibe.ai/vault/videos/advanced-system-prompts-claude',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Advanced+System+Prompts',
  22, 'Ryan Jackson', '2026-02-05',
  'intermediate', 'both',
  '["prompt-engineering","claude","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
  vs.id, 4
FROM vault_series vs WHERE vs.slug = 'prompt-engineering-101'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. SERIES 2 ITEMS â€” AI Tools for Japanese Business
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
  'æ—¥æœ¬ã®ãƒ—ãƒ­ãŒAIã‚’æŽ¡ç”¨ã—å§‹ã‚ãŸç†ç”±',
  'An honest look at what is driving AI adoption in Japanese workplaces, the unique challenges professionals face, and why 2026 is the tipping point.',
  'æ—¥æœ¬ã®è·å ´ã§AIå°Žå…¥ãŒé€²ã‚€èƒŒæ™¯ã€ãƒ—ãƒ­ãƒ•ã‚§ãƒƒã‚·ãƒ§ãƒŠãƒ«ãŒç›´é¢ã™ã‚‹èª²é¡Œã€ãã—ã¦2026å¹´ãŒã‚¿ãƒ¼ãƒ‹ãƒ³ã‚°ãƒã‚¤ãƒ³ãƒˆã§ã‚ã‚‹ç†ç”±ã‚’è§£èª¬ã—ã¾ã™ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/why-japanese-professionals-adopting-ai',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Japanese+Professionals+%26+AI',
  'Ryan Jackson', '2026-02-10',
  'beginner', 'both',
  '["business-ai","career","ai-fundamentals"]',
  'free',
  true, true, 'current',
  'SEED DATA â€” replace with real content',
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
  'ChatGPTã§ãƒ“ã‚¸ãƒã‚¹ãƒ¡ãƒ¼ãƒ«ã‚’æ›¸ã',
  'A step-by-step guide to drafting professional Japanese business emails using ChatGPT. Includes prompts for formal requests, follow-ups, and apology emails.',
  'ChatGPTã‚’ä½¿ã£ã¦æ—¥æœ¬èªžã®ãƒ“ã‚¸ãƒã‚¹ãƒ¡ãƒ¼ãƒ«ã‚’ä½œæˆã™ã‚‹ã‚¹ãƒ†ãƒƒãƒ—ãƒã‚¤ã‚¹ãƒ†ãƒƒãƒ—ã‚¬ã‚¤ãƒ‰ã€‚æ­£å¼ãªä¾é ¼ã€ãƒ•ã‚©ãƒ­ãƒ¼ã‚¢ãƒƒãƒ—ã€ãŠè©«ã³ãƒ¡ãƒ¼ãƒ«ã®ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚‚åŽéŒ²ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/guides/chatgpt-business-email-japanese',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=ChatGPT%E3%83%93%E3%82%B8%E3%83%8D%E3%82%B9%E3%83%A1%E3%83%BC%E3%83%AB',
  'Ryan Jackson', '2026-02-17',
  'intermediate', 'ja',
  '["business-ai","productivity","chatgpt"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
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
  'AIä¼šè­°ãƒ¡ãƒ¢ãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆ',
  'A downloadable template for capturing and summarizing Japanese business meetings with AI assistance. Includes pre-meeting agenda, live notes, and action items sections.',
  'æ—¥æœ¬èªžã®ä¼šè­°ã‚’AIã§ã‚­ãƒ£ãƒ—ãƒãƒ£ãƒ»è¦ç´„ã™ã‚‹ãŸã‚ã®ãƒ€ã‚¦ãƒ³ãƒ­ãƒ¼ãƒ‰å¯èƒ½ãªãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã€‚ä¼šè­°å‰ã‚¢ã‚¸ã‚§ãƒ³ãƒ€ã€ãƒ©ã‚¤ãƒ–ãƒ¡ãƒ¢ã€ã‚¢ã‚¯ã‚·ãƒ§ãƒ³ã‚¢ã‚¤ãƒ†ãƒ ã®ã‚»ã‚¯ã‚·ãƒ§ãƒ³ã‚’åŽéŒ²ã€‚',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/ai-meeting-notes-template-japanese',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI%E4%BC%9A%E8%AD%B0%E3%83%A1%E3%83%A2',
  'Ryan Jackson', '2026-02-24',
  'beginner', 'ja',
  '["business-ai","productivity","automation"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
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
  'Zapierã§æ¥­å‹™è‡ªå‹•åŒ–ï¼šå®Ÿè·µã‚¬ã‚¤ãƒ‰',
  'A practical video guide to automating repetitive Japanese business workflows with Zapier AI Actions. Covers email routing, report generation, and Slack notifications.',
  'Zapierã®AIã‚¢ã‚¯ã‚·ãƒ§ãƒ³ã‚’ä½¿ã£ã¦ç¹°ã‚Šè¿”ã—æ¥­å‹™ã‚’è‡ªå‹•åŒ–ã™ã‚‹å®Ÿè·µå‹•ç”»ã€‚ãƒ¡ãƒ¼ãƒ«ãƒ«ãƒ¼ãƒ†ã‚£ãƒ³ã‚°ã€ãƒ¬ãƒãƒ¼ãƒˆç”Ÿæˆã€Slacké€šçŸ¥ã®ã‚¦ã‚©ãƒ¼ã‚¯ã‚¹ãƒ«ãƒ¼ã‚’åŽéŒ²ã€‚',
  'video', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Zapier%E6%A5%AD%E5%8B%99%E8%87%AA%E5%8B%95%E5%8C%96',
  25, 'Ryan Jackson', '2026-03-03',
  'intermediate', 'ja',
  '["automation","zapier","business-ai","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content',
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
  'ChatGPT vs Claude vs Geminiï¼šã©ã‚Œã‚’é¸ã¶ï¼Ÿ',
  'A clear-headed comparison of the three leading AI assistants â€” capabilities, pricing, use cases, and which one to reach for in different situations.',
  'ä¸‰å¤§AIã‚¢ã‚·ã‚¹ã‚¿ãƒ³ãƒˆã‚’å†·é™ã«æ¯”è¼ƒã€‚æ©Ÿèƒ½ã€ä¾¡æ ¼ã€ãƒ¦ãƒ¼ã‚¹ã‚±ãƒ¼ã‚¹ã€ä½¿ã„åˆ†ã‘ã®ãƒã‚¤ãƒ³ãƒˆã‚’è§£èª¬ã—ã¾ã™ã€‚',
  'video', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=ChatGPT+vs+Claude+vs+Gemini',
  18, 'Ryan Jackson', '2026-01-08',
  'beginner', 'both',
  '["ai-fundamentals","chatgpt","claude","gemini"]',
  'premium',
  true, true, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'perplexity-deep-research',
  'Using Perplexity AI for Deep Research',
  'Perplexityã§AIæ·±æŽ˜ã‚Šãƒªã‚µãƒ¼ãƒ',
  'How to use Perplexity AI to run comprehensive research on any topic â€” from sourcing to synthesis to citation. Ideal for consultants, writers, and analysts.',
  'Perplexityã®AIã‚’ä½¿ã£ã¦ã‚ã‚‰ã‚†ã‚‹ãƒˆãƒ”ãƒƒã‚¯ã‚’æ·±ãèª¿æŸ»ã™ã‚‹æ–¹æ³•ã€‚ã‚½ãƒ¼ã‚¹åŽé›†ã‹ã‚‰çµ±åˆã€å¼•ç”¨ã¾ã§ã€‚ã‚³ãƒ³ã‚µãƒ«ã‚¿ãƒ³ãƒˆã€ãƒ©ã‚¤ã‚¿ãƒ¼ã€ã‚¢ãƒŠãƒªã‚¹ãƒˆã«æœ€é©ã€‚',
  'video', 'youtube',
  'https://www.youtube.com/watch?v=placeholder',
  'https://www.youtube.com/embed/placeholder',
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Perplexity+Deep+Research',
  20, 'Ryan Jackson', '2026-01-20',
  'intermediate', 'en',
  '["research","perplexity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),

-- video_custom (2 items)
(
  'ai-ethics-every-professional',
  'AI Ethics: What Every Professional Should Know',
  'AIã®å€«ç†ï¼šãƒ—ãƒ­ãŒçŸ¥ã£ã¦ãŠãã¹ãã“ã¨',
  'An honest, practical look at AI ethics â€” bias, hallucination, privacy, and accountability. Includes a framework for making responsible AI decisions at work.',
  'AIã®å€«ç†ã‚’æ­£ç›´ã‹ã¤å®Ÿè·µçš„ã«è§£èª¬ã€‚ãƒã‚¤ã‚¢ã‚¹ã€ãƒãƒ«ã‚·ãƒãƒ¼ã‚·ãƒ§ãƒ³ã€ãƒ—ãƒ©ã‚¤ãƒã‚·ãƒ¼ã€èª¬æ˜Žè²¬ä»»ã‚’æ‰±ã„ã€è·å ´ã§ã®è²¬ä»»ã‚ã‚‹AIåˆ©ç”¨ãƒ•ãƒ¬ãƒ¼ãƒ ãƒ¯ãƒ¼ã‚¯ã‚‚ç´¹ä»‹ã€‚',
  'video', 'honuvibe',
  'https://honuvibe.ai/vault/videos/ai-ethics-every-professional',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Ethics',
  28, 'Ryan Jackson', '2026-01-10',
  'beginner', 'both',
  '["ethics","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'building-personal-ai-workflow',
  'Building a Personal AI Workflow',
  'ãƒ‘ãƒ¼ã‚½ãƒŠãƒ«AIãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼ã®æ§‹ç¯‰',
  'Design an AI workflow that actually sticks. Covers tool selection, habit integration, and how to layer multiple AI tools for maximum output with minimum friction.',
  'å®Ÿéš›ã«ç¶šãAIãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼ã®è¨­è¨ˆã€‚ãƒ„ãƒ¼ãƒ«é¸å®šã€ç¿’æ…£ã¸ã®çµ±åˆã€è¤‡æ•°ã®AIãƒ„ãƒ¼ãƒ«ã‚’çµ„ã¿åˆã‚ã›ã¦æœ€å¤§ã®æˆæžœã‚’æœ€å°ã®æ‘©æ“¦ã§å®Ÿç¾ã™ã‚‹æ–¹æ³•ã‚’è§£èª¬ã€‚',
  'video', 'honuvibe',
  'https://honuvibe.ai/vault/videos/building-personal-ai-workflow',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Personal+AI+Workflow',
  35, 'Ryan Jackson', '2026-02-12',
  'intermediate', 'both',
  '["productivity","automation","chatgpt","claude"]',
  'premium',
  true, true, 'current',
  'SEED DATA â€” replace with real content'
),

-- article (3 items)
(
  'prompt-engineering-mindset',
  'The Prompt Engineering Mindset',
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¨ãƒ³ã‚¸ãƒ‹ã‚¢ãƒªãƒ³ã‚°ã®ãƒžã‚¤ãƒ³ãƒ‰ã‚»ãƒƒãƒˆ',
  'Prompting is not about magic words â€” it is about clear thinking. This article breaks down the mental model behind effective prompting that nobody else is teaching.',
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã¯é­”æ³•ã®è¨€è‘‰ã§ã¯ãªãã€æ˜Žç¢ºãªæ€è€ƒã®ç”£ç‰©ã§ã™ã€‚åŠ¹æžœçš„ãªãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã®èƒŒå¾Œã«ã‚ã‚‹ãƒ¡ãƒ³ã‚¿ãƒ«ãƒ¢ãƒ‡ãƒ«ã‚’è§£èª¬ã—ã¾ã™ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/prompt-engineering-mindset',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Prompt+Engineering+Mindset',
  NULL, 'Ryan Jackson', '2026-01-05',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'ai-japanese-workplace-trends-2026',
  'AI in the Japanese Workplace: Trends for 2026',
  'æ—¥æœ¬ã®è·å ´ã«ãŠã‘ã‚‹AIï¼š2026å¹´ã®ãƒˆãƒ¬ãƒ³ãƒ‰',
  'An analysis of how AI is being adopted across Japanese industries in 2026 â€” sector breakdowns, real adoption blockers, and what comes next.',
  '2026å¹´ã€æ—¥æœ¬ã®è·å ´ã§AIãŒã©ã®ã‚ˆã†ã«ä½¿ã‚ã‚Œã¦ã„ã‚‹ã‹ã‚’æ¥­ç¨®åˆ¥ã«åˆ†æžã€‚å°Žå…¥ã®èª²é¡Œã¨ä»Šå¾Œã®å±•æœ›ã‚’ãƒ‡ãƒ¼ã‚¿ã¨ã¨ã‚‚ã«ç´¹ä»‹ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/ai-japanese-workplace-trends-2026',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Trends+Japan+2026',
  NULL, 'Ryan Jackson', '2026-03-01',
  'intermediate', 'ja',
  '["business-ai","career"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'ai-content-creation-social-media',
  'AI Content Creation for Social Media',
  'SNSã®ãŸã‚ã®AIã‚³ãƒ³ãƒ†ãƒ³ãƒ„åˆ¶ä½œ',
  'How to use AI to plan, draft, and repurpose social media content across platforms. Includes specific prompt templates for LinkedIn, X, and Instagram.',
  'AIã‚’ä½¿ã£ã¦SNSã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚’è¨ˆç”»ãƒ»ä¸‹æ›¸ããƒ»ãƒªãƒ‘ãƒ¼ãƒ‘ã‚¹ã™ã‚‹æ–¹æ³•ã€‚LinkedInã€Xã€Instagramå‘ã‘ã®ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã‚’åŽéŒ²ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/articles/ai-content-creation-social-media',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Content+Creation',
  NULL, 'Ryan Jackson', '2026-02-01',
  'intermediate', 'en',
  '["content-creation","chatgpt","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),

-- guide (2 items)
(
  'notebooklm-research-guide',
  'Getting Started with NotebookLM for Research',
  'ãƒªã‚µãƒ¼ãƒã®ãŸã‚ã®NotebookLMå…¥é–€',
  'A step-by-step guide to using NotebookLM for deep research projects. Upload sources, generate summaries, ask questions, and build a research knowledge base.',
  'ãƒªã‚µãƒ¼ãƒãƒ—ãƒ­ã‚¸ã‚§ã‚¯ãƒˆã¸ã®NotebookLMæ´»ç”¨ã‚¬ã‚¤ãƒ‰ã€‚ã‚½ãƒ¼ã‚¹ã®ã‚¢ãƒƒãƒ—ãƒ­ãƒ¼ãƒ‰ã€è¦ç´„ç”Ÿæˆã€Q&Aã€ãƒŠãƒ¬ãƒƒã‚¸ãƒ™ãƒ¼ã‚¹æ§‹ç¯‰æ–¹æ³•ã‚’è§£èª¬ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/guides/notebooklm-research-guide',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=NotebookLM+Research',
  NULL, 'Ryan Jackson', '2026-01-18',
  'beginner', 'en',
  '["research","notebooklm","ai-fundamentals"]',
  'free',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'automate-content-calendar-ai',
  'Automating Your Content Calendar with AI',
  'AIã§ã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚«ãƒ¬ãƒ³ãƒ€ãƒ¼ã‚’è‡ªå‹•åŒ–ã™ã‚‹',
  'An advanced guide to building a fully automated content calendar using AI and Zapier. Covers ideation, drafting, scheduling, and performance review loops.',
  'AIã¨Zapierã‚’ä½¿ã£ã¦å®Œå…¨è‡ªå‹•åŒ–ã•ã‚ŒãŸã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚«ãƒ¬ãƒ³ãƒ€ãƒ¼ã‚’æ§‹ç¯‰ã™ã‚‹ä¸Šç´šã‚¬ã‚¤ãƒ‰ã€‚ã‚¢ã‚¤ãƒ‡ã‚¢å‡ºã—ã€ä¸‹æ›¸ãã€ã‚¹ã‚±ã‚¸ãƒ¥ãƒ¼ãƒªãƒ³ã‚°ã€ãƒ‘ãƒ•ã‚©ãƒ¼ãƒžãƒ³ã‚¹ãƒ¬ãƒ“ãƒ¥ãƒ¼ã‚’ç¶²ç¾…ã€‚',
  'article', 'honuvibe',
  'https://honuvibe.ai/vault/guides/automate-content-calendar-ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Content+Calendar+Automation',
  NULL, 'Ryan Jackson', '2026-03-10',
  'advanced', 'both',
  '["content-creation","automation","zapier","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),

-- template (2 items)
(
  'ai-project-brief-template',
  'AI Project Brief Template',
  'AIãƒ—ãƒ­ã‚¸ã‚§ã‚¯ãƒˆãƒ–ãƒªãƒ¼ãƒ•ãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆ',
  'A structured template for scoping any AI project â€” from client briefing to output definition. Downloadable in PDF and DOCX. Works for solo projects and teams.',
  'ã‚¯ãƒ©ã‚¤ã‚¢ãƒ³ãƒˆãƒ–ãƒªãƒ¼ãƒ•ã‹ã‚‰æˆæžœç‰©å®šç¾©ã¾ã§ã€ã‚ã‚‰ã‚†ã‚‹AIãƒ—ãƒ­ã‚¸ã‚§ã‚¯ãƒˆã‚’ã‚¹ã‚³ãƒ¼ãƒ—ã™ã‚‹ãŸã‚ã®æ§‹é€ åŒ–ãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã€‚PDFã¨DOCXã§ãƒ€ã‚¦ãƒ³ãƒ­ãƒ¼ãƒ‰å¯èƒ½ã€‚',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/ai-project-brief-template',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Project+Brief',
  NULL, 'Ryan Jackson', '2026-01-25',
  'beginner', 'both',
  '["productivity","business-ai"]',
  'free',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'weekly-ai-experiment-log',
  'Weekly AI Experiment Log',
  'é€±æ¬¡AIã‚¨ã‚¯ã‚¹ãƒšãƒªãƒ¡ãƒ³ãƒˆãƒ­ã‚°',
  'Track your AI experiments systematically with this weekly log template. Record prompts, outputs, ratings, and insights to build a personal AI learning library over time.',
  'ã“ã®ã‚¦ã‚£ãƒ¼ã‚¯ãƒªãƒ¼ãƒ­ã‚°ãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã§AIå®Ÿé¨“ã‚’ä½“ç³»çš„ã«è¨˜éŒ²ã€‚ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã€å‡ºåŠ›ã€è©•ä¾¡ã€æ´žå¯Ÿã‚’è“„ç©ã—ã¦å€‹äººã®AIå­¦ç¿’ãƒ©ã‚¤ãƒ–ãƒ©ãƒªã‚’æ§‹ç¯‰ã—ã¾ã—ã‚‡ã†ã€‚',
  'template', 'honuvibe',
  'https://honuvibe.ai/vault/templates/weekly-ai-experiment-log',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=AI+Experiment+Log',
  NULL, 'Ryan Jackson', '2026-02-15',
  'intermediate', 'en',
  '["productivity","prompt-engineering"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),

-- tool (4 items)
(
  'claude-ai-complete-overview',
  'Claude.ai â€” Complete Overview',
  'Claude.ai å®Œå…¨ã‚¬ã‚¤ãƒ‰',
  'Everything you need to know to get started with Claude.ai â€” interface walkthrough, key features, strengths vs ChatGPT, and the best use cases to start with.',
  'Claude.aiã‚’å§‹ã‚ã‚‹ãŸã‚ã«å¿…è¦ãªã™ã¹ã¦ã‚’ç¶²ç¾…ã€‚ã‚¤ãƒ³ã‚¿ãƒ¼ãƒ•ã‚§ãƒ¼ã‚¹ã®ä½¿ã„æ–¹ã€ä¸»è¦æ©Ÿèƒ½ã€ChatGPTã¨ã®æ¯”è¼ƒã€ãŠã™ã™ã‚ã®æ´»ç”¨æ–¹æ³•ã‚’è§£èª¬ã€‚',
  'tool', 'honuvibe',
  'https://claude.ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Claude.ai+Overview',
  NULL, 'Ryan Jackson', '2026-01-03',
  'beginner', 'both',
  '["ai-fundamentals","claude"]',
  'free',
  true, true, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'cursor-ai-code-editor-guide',
  'Cursor: AI Code Editor Guide',
  'Cursorï¼šAIã‚³ãƒ¼ãƒ‰ã‚¨ãƒ‡ã‚£ã‚¿ãƒ¼ã‚¬ã‚¤ãƒ‰',
  'A practical guide to Cursor, the AI-native code editor. Covers setup, Tab completion, Chat, Composer, and how to use it for non-developers automating workflows.',
  'AIãƒã‚¤ãƒ†ã‚£ãƒ–ã‚³ãƒ¼ãƒ‰ã‚¨ãƒ‡ã‚£ã‚¿ãƒ¼Cursorã®å®Ÿè·µã‚¬ã‚¤ãƒ‰ã€‚ã‚»ãƒƒãƒˆã‚¢ãƒƒãƒ—ã€Tabã‚³ãƒ³ãƒ—ãƒªãƒ¼ã‚·ãƒ§ãƒ³ã€ãƒãƒ£ãƒƒãƒˆã€Composerã®ä½¿ã„æ–¹ã¨ã€æ¥­å‹™è‡ªå‹•åŒ–ã¸ã®æ´»ç”¨æ³•ã‚’è§£èª¬ã€‚',
  'tool', 'external',
  'https://cursor.com',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cursor+AI+Editor',
  NULL, 'Ryan Jackson', '2026-02-08',
  'intermediate', 'en',
  '["ai-fundamentals","cursor","automation"]',
  'free',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'zapier-ai-actions-overview',
  'Zapier AI Actions Overview',
  'Zapier AIã‚¢ã‚¯ã‚·ãƒ§ãƒ³æ¦‚è¦',
  'How to use Zapier AI Actions to connect your favorite apps and automate tasks with natural language. Includes practical automation recipes for business workflows.',
  'Zapier AIã‚¢ã‚¯ã‚·ãƒ§ãƒ³ã‚’ä½¿ã£ã¦ã‚¢ãƒ—ãƒªé€£æºã‚’ãƒ†ã‚­ã‚¹ãƒˆæŒ‡ç¤ºã ã‘ã§è‡ªå‹•åŒ–ã™ã‚‹æ–¹æ³•ã€‚ãƒ“ã‚¸ãƒã‚¹ãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼ã®è‡ªå‹•åŒ–ãƒ¬ã‚·ãƒ”ã‚‚åŽéŒ²ã€‚',
  'tool', 'external',
  'https://zapier.com/ai',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Zapier+AI+Actions',
  NULL, 'Ryan Jackson', '2026-02-20',
  'intermediate', 'both',
  '["automation","zapier","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'notebooklm-deep-dive',
  'NotebookLM Deep Dive',
  'NotebookLM å¾¹åº•è§£èª¬',
  'An advanced exploration of NotebookLM: audio overviews, multi-source synthesis, citation accuracy, and how to build a serious research workflow on top of it.',
  'NotebookLMã®é«˜åº¦ãªæ´»ç”¨æ³•ã‚’å¾¹åº•è§£èª¬ã€‚éŸ³å£°æ¦‚è¦ã€ãƒžãƒ«ãƒã‚½ãƒ¼ã‚¹çµ±åˆã€å¼•ç”¨ç²¾åº¦ã€ãã—ã¦æœ¬æ ¼çš„ãªãƒªã‚µãƒ¼ãƒãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼ã®æ§‹ç¯‰æ–¹æ³•ã€‚',
  'tool', 'external',
  'https://notebooklm.google.com',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=NotebookLM+Deep+Dive',
  NULL, 'Ryan Jackson', '2026-03-15',
  'advanced', 'en',
  '["research","notebooklm"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),

-- course_recording (4 items, all premium)
(
  'cohort1-session-prompt-fundamentals',
  'Cohort 1 Session: Prompt Fundamentals',
  'ã‚³ãƒ›ãƒ¼ãƒˆ1ã‚»ãƒƒã‚·ãƒ§ãƒ³ï¼šãƒ—ãƒ­ãƒ³ãƒ—ãƒˆåŸºç¤Ž',
  'The recorded session from HonuVibe Cohort 1 covering prompt fundamentals. Includes live Q&A, student examples, and instructor walkthroughs of real-world use cases.',
  'HonuVibeã‚³ãƒ›ãƒ¼ãƒˆ1ã®ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆåŸºç¤Žã‚»ãƒƒã‚·ãƒ§ãƒ³éŒ²ç”»ã€‚ãƒ©ã‚¤ãƒ–Q&Aã€å—è¬›ç”Ÿã®å®Ÿä¾‹ã€ãƒªã‚¢ãƒ«ãƒ¦ãƒ¼ã‚¹ã‚±ãƒ¼ã‚¹ã®ã‚¦ã‚©ãƒ¼ã‚¯ã‚¹ãƒ«ãƒ¼ã‚’åŽéŒ²ã€‚',
  'workshop', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort1-session-prompt-fundamentals',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+1%3A+Prompt+Fundamentals',
  60, 'Ryan Jackson', '2025-10-15',
  'beginner', 'both',
  '["prompt-engineering","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'cohort1-session-ai-workflows',
  'Cohort 1 Session: Building AI Workflows',
  'ã‚³ãƒ›ãƒ¼ãƒˆ1ã‚»ãƒƒã‚·ãƒ§ãƒ³ï¼šAIãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼æ§‹ç¯‰',
  'Recorded session from Cohort 1 on designing and deploying personal AI workflows. Covers tool stacking, trigger design, and live automation builds with Zapier.',
  'ã‚³ãƒ›ãƒ¼ãƒˆ1ã®AIãƒ¯ãƒ¼ã‚¯ãƒ•ãƒ­ãƒ¼è¨­è¨ˆãƒ»å®Ÿè£…ã‚»ãƒƒã‚·ãƒ§ãƒ³éŒ²ç”»ã€‚ãƒ„ãƒ¼ãƒ«é€£æºã€ãƒˆãƒªã‚¬ãƒ¼è¨­è¨ˆã€Zapierã‚’ä½¿ã£ãŸãƒ©ã‚¤ãƒ–è‡ªå‹•åŒ–æ§‹ç¯‰ã‚’åŽéŒ²ã€‚',
  'workshop', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort1-session-ai-workflows',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+1%3A+AI+Workflows',
  75, 'Ryan Jackson', '2025-11-05',
  'intermediate', 'both',
  '["automation","productivity","zapier"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'cohort2-session-ai-content-creators',
  'Cohort 2 Session: AI for Content Creators',
  'ã‚³ãƒ›ãƒ¼ãƒˆ2ã‚»ãƒƒã‚·ãƒ§ãƒ³ï¼šã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚¯ãƒªã‚¨ã‚¤ã‚¿ãƒ¼ã®ãŸã‚ã®AI',
  'Cohort 2 session on using AI across the full content creation lifecycle â€” ideation, scripting, editing, repurposing, and distribution strategy.',
  'ã‚³ãƒ›ãƒ¼ãƒˆ2ã®ã‚³ãƒ³ãƒ†ãƒ³ãƒ„åˆ¶ä½œãƒ©ã‚¤ãƒ•ã‚µã‚¤ã‚¯ãƒ«å…¨ä½“ã«ã‚ãŸã‚‹AIæ´»ç”¨ã‚»ãƒƒã‚·ãƒ§ãƒ³éŒ²ç”»ã€‚ã‚¢ã‚¤ãƒ‡ã‚¢å‡ºã—ã€ã‚¹ã‚¯ãƒªãƒ—ãƒˆã€ç·¨é›†ã€ãƒªãƒ‘ãƒ¼ãƒ‘ã‚¹ã€é…ä¿¡æˆ¦ç•¥ã‚’ç¶²ç¾…ã€‚',
  'workshop', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort2-session-ai-content-creators',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+2%3A+Content+Creators',
  65, 'Ryan Jackson', '2026-01-28',
  'intermediate', 'en',
  '["content-creation","chatgpt","productivity"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
),
(
  'cohort2-session-advanced-claude',
  'Cohort 2 Session: Advanced Claude Techniques',
  'ã‚³ãƒ›ãƒ¼ãƒˆ2ã‚»ãƒƒã‚·ãƒ§ãƒ³ï¼šClaudeä¸Šç´šãƒ†ã‚¯ãƒ‹ãƒƒã‚¯',
  'The deep-dive Claude session from Cohort 2. Covers Projects, long-context management, artifacts, vision capabilities, and custom instruction design.',
  'ã‚³ãƒ›ãƒ¼ãƒˆ2ã®Claudeä¸Šç´šãƒ†ã‚¯ãƒ‹ãƒƒã‚¯ã‚»ãƒƒã‚·ãƒ§ãƒ³éŒ²ç”»ã€‚Projectsã€é•·æ–‡ã‚³ãƒ³ãƒ†ã‚­ã‚¹ãƒˆç®¡ç†ã€ã‚¢ãƒ¼ãƒ†ã‚£ãƒ•ã‚¡ã‚¯ãƒˆã€ãƒ“ã‚¸ãƒ§ãƒ³æ©Ÿèƒ½ã€ã‚«ã‚¹ã‚¿ãƒ æŒ‡ç¤ºè¨­è¨ˆã‚’å¾¹åº•è§£èª¬ã€‚',
  'workshop', 'honuvibe',
  'https://honuvibe.ai/vault/recordings/cohort2-session-advanced-claude',
  NULL,
  'https://placehold.co/800x450/1a1f2e/94a3b8?text=Cohort+2%3A+Advanced+Claude',
  80, 'Ryan Jackson', '2026-02-25',
  'advanced', 'both',
  '["claude","prompt-engineering","ai-fundamentals"]',
  'premium',
  true, false, 'current',
  'SEED DATA â€” replace with real content'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. VAULT DOWNLOADS
-- ============================================================

-- Prompt Starter Kit â€” PDF
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
  'PDF version of the Prompt Starter Kit â€” 20 prompt templates ready to copy and paste.',
  'ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¹ã‚¿ãƒ¼ã‚¿ãƒ¼ã‚­ãƒƒãƒˆã®PDFç‰ˆã€‚ã‚³ãƒ”ãƒ¼&ãƒšãƒ¼ã‚¹ãƒˆã§ä½¿ãˆã‚‹20ã®ãƒ—ãƒ­ãƒ³ãƒ—ãƒˆãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã€‚',
  'premium', 1
FROM content_items ci
WHERE ci.slug = 'prompt-starter-kit'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'Prompt Starter Kit.pdf'
);

-- Prompt Starter Kit â€” XLSX
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
  'ä¸¦ã³æ›¿ãˆå¯èƒ½ãªåˆ—ã¨è©•ä¾¡ãƒ•ã‚£ãƒ¼ãƒ«ãƒ‰ä»˜ãã®ç·¨é›†å¯èƒ½ãªExcel/Sheetsç‰ˆãƒ—ãƒ­ãƒ³ãƒ—ãƒˆã‚¹ã‚¿ãƒ¼ã‚¿ãƒ¼ã‚­ãƒƒãƒˆã€‚',
  'premium', 2
FROM content_items ci
WHERE ci.slug = 'prompt-starter-kit'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'Prompt Starter Kit.xlsx'
);

-- AI Meeting Notes Template â€” DOCX
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
  'AIä¼šè­°ãƒ¡ãƒ¢ãƒ†ãƒ³ãƒ—ãƒ¬ãƒ¼ãƒˆã®Word/Docsç‰ˆã€‚è‡ªç”±ã«ç·¨é›†ã§ãã¾ã™ã€‚',
  'premium', 1
FROM content_items ci
WHERE ci.slug = 'ai-meeting-notes-template-japanese'
AND NOT EXISTS (
  SELECT 1 FROM vault_downloads vd
  WHERE vd.content_item_id = ci.id
  AND vd.file_name = 'AI Meeting Notes Template.docx'
);

COMMIT;


