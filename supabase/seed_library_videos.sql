-- Seed data: 15 Library tutorial videos for development/demo
-- YouTube video URLs curated 2026-02-26 — verify each URL is live before running

INSERT INTO library_videos (slug, title_en, description_en, video_url, thumbnail_url, duration_seconds, category, access_tier, difficulty, sort_order, is_featured, is_published, published_at) VALUES

-- Open tier (5 videos — SEO and social traffic hooks)
('setting-up-cursor-with-claude', 'Setting Up Cursor IDE with Claude', 'Learn how to install Cursor IDE and connect it to Claude for AI-powered coding. A step-by-step guide for beginners.', 'https://www.youtube.com/watch?v=fYX6hHC9FhQ', '/images/library/cursor-setup.jpg', 300, 'coding-tools', 'open', 'beginner', 1, true, true, now()),

('first-ai-chat-claude-vs-chatgpt', 'Your First AI Chat — Claude vs ChatGPT vs Gemini', 'Compare the three major AI assistants side by side. See which one works best for different tasks.', 'https://www.youtube.com/watch?v=SDiDkK0r-9c', '/images/library/ai-compare.jpg', 360, 'ai-basics', 'open', 'beginner', 2, true, true, now()),

('ai-image-generators-midjourney-dalle', 'Using AI Image Generators (Midjourney / DALL-E)', 'Create stunning images with AI. Covers prompting techniques for both Midjourney and DALL-E.', 'https://www.youtube.com/watch?v=g1zy4ELvtxs', '/images/library/image-gen.jpg', 420, 'image-video', 'open', 'beginner', 3, true, true, now()),

('how-to-write-better-prompts', 'How to Write Better Prompts', 'Master the art of prompt engineering with practical examples and frameworks that work across any AI tool.', 'https://www.youtube.com/watch?v=3HVH2Iuplqo', '/images/library/prompts.jpg', 300, 'ai-basics', 'open', 'beginner', 4, true, true, now()),

('ai-tools-small-business', 'AI Tools for Small Business — Where to Start', 'A practical guide to choosing and implementing AI tools for your small business. No technical background required.', 'https://www.youtube.com/watch?v=3iobbYH2SJ8', '/images/library/ai-business.jpg', 360, 'getting-started', 'open', 'beginner', 5, true, true, now()),

-- Free account tier (10 videos)
('connecting-claude-google-sheets', 'Connecting Claude to Google Sheets', 'Automate your spreadsheet workflows by connecting Claude AI to Google Sheets. Build smart data pipelines.', 'https://www.youtube.com/watch?v=0v7uZHVfGRk', '/images/library/claude-sheets.jpg', 300, 'business-automation', 'free_account', 'beginner', 6, false, true, now()),

('first-automation-n8n', 'Building Your First Automation with N8N', 'Create a complete business automation workflow using N8N. From trigger to action in under 10 minutes.', 'https://www.youtube.com/watch?v=6bBWmnv8Q8o', '/images/library/n8n-intro.jpg', 420, 'business-automation', 'free_account', 'intermediate', 7, false, true, now()),

('ai-email-writing-templates', 'AI for Email Writing — Templates That Work', 'Use AI to draft professional emails faster. Includes templates for sales, support, and internal communication.', 'https://www.youtube.com/watch?v=GW3MRr0kuLw', '/images/library/ai-email.jpg', 240, 'productivity', 'free_account', 'beginner', 8, false, true, now()),

('free-supabase-database-setup', 'Setting Up a Free Supabase Database', 'Get started with Supabase in minutes. Create tables, set up authentication, and write your first query.', 'https://www.youtube.com/watch?v=Q7P20fHJlm4', '/images/library/supabase-setup.jpg', 300, 'coding-tools', 'free_account', 'beginner', 9, false, true, now()),

('deploying-website-vercel', 'Deploying a Website on Vercel in 5 Minutes', 'Ship your website to production with Vercel. Covers GitHub integration, environment variables, and custom domains.', 'https://www.youtube.com/watch?v=GthkPo8xFqQ', '/images/library/vercel-deploy.jpg', 300, 'coding-tools', 'free_account', 'beginner', 10, false, true, now()),

('ai-social-media-content', 'Using AI for Social Media Content', 'Create engaging social media posts with AI. Covers caption writing, image generation, and content calendars.', 'https://www.youtube.com/watch?v=4FAHV19KwKQ', '/images/library/ai-social.jpg', 300, 'productivity', 'free_account', 'beginner', 11, false, true, now()),

('introduction-to-mcp', 'Introduction to MCP (Model Context Protocol)', 'Understand the Model Context Protocol and how it connects AI models to real-world tools and data sources.', 'https://www.youtube.com/watch?v=CQywdSdi5iA', '/images/library/mcp-intro.jpg', 360, 'ai-basics', 'free_account', 'intermediate', 12, false, true, now()),

('ai-video-generation-runway', 'AI Video Generation with Runway', 'Create professional videos with AI using Runway. From text-to-video to motion brush and beyond.', 'https://www.youtube.com/watch?v=u1ebRz5IX3E', '/images/library/runway-gen.jpg', 360, 'image-video', 'free_account', 'beginner', 13, false, true, now()),

('automating-client-onboarding', 'Automating Client Onboarding with AI', 'Build an automated client onboarding flow using AI tools. Save hours on every new client relationship.', 'https://www.youtube.com/watch?v=8sPYxqU1SoQ', '/images/library/client-onboard.jpg', 420, 'business-automation', 'free_account', 'intermediate', 14, false, true, now()),

('idea-to-prototype-ai', 'From Idea to Prototype — AI-Powered Building', 'Go from a business idea to a working prototype using AI tools. The fastest path from concept to demo.', 'https://www.youtube.com/watch?v=Rx9V3Ltiklw', '/images/library/idea-proto.jpg', 420, 'getting-started', 'free_account', 'beginner', 15, false, true, now());
