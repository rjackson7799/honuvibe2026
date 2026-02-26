-- Migration: Update library_videos with real YouTube URLs
-- IMPORTANT: Verify each URL is live before running.
-- Generated: 2026-02-26
-- Sources: Sabrina Ramonov, Sean Kochel, Anthropic, Lovable, freeCodeCamp, Tech Express

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=fYX6hHC9FhQ', updated_at = now()
  WHERE slug = 'setting-up-cursor-with-claude';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=SDiDkK0r-9c', updated_at = now()
  WHERE slug = 'first-ai-chat-claude-vs-chatgpt';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=g1zy4ELvtxs', updated_at = now()
  WHERE slug = 'ai-image-generators-midjourney-dalle';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=3HVH2Iuplqo', updated_at = now()
  WHERE slug = 'how-to-write-better-prompts';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=3iobbYH2SJ8', updated_at = now()
  WHERE slug = 'ai-tools-small-business';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=0v7uZHVfGRk', updated_at = now()
  WHERE slug = 'connecting-claude-google-sheets';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=6bBWmnv8Q8o', updated_at = now()
  WHERE slug = 'first-automation-n8n';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=GW3MRr0kuLw', updated_at = now()
  WHERE slug = 'ai-email-writing-templates';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=Q7P20fHJlm4', updated_at = now()
  WHERE slug = 'free-supabase-database-setup';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=GthkPo8xFqQ', updated_at = now()
  WHERE slug = 'deploying-website-vercel';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=4FAHV19KwKQ', updated_at = now()
  WHERE slug = 'ai-social-media-content';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=CQywdSdi5iA', updated_at = now()
  WHERE slug = 'introduction-to-mcp';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=u1ebRz5IX3E', updated_at = now()
  WHERE slug = 'ai-video-generation-runway';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=8sPYxqU1SoQ', updated_at = now()
  WHERE slug = 'automating-client-onboarding';

UPDATE library_videos SET video_url = 'https://www.youtube.com/watch?v=Rx9V3Ltiklw', updated_at = now()
  WHERE slug = 'idea-to-prototype-ai';
