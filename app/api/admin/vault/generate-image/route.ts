import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

const VAULT_PUBLIC_BUCKET = 'vault-public';

function getLevelMood(level: string | null): string {
  switch (level) {
    case 'beginner':
      return 'open, airy, and welcoming with plenty of negative space';
    case 'intermediate':
      return 'balanced and confident with moderate compositional layering';
    case 'advanced':
      return 'richer composition with more layered geometry, still calm and uncluttered';
    default:
      return 'calm, modern, and intelligent';
  }
}

function getTypeMotif(contentType: string | null): string {
  switch (contentType) {
    case 'video':
      return 'a simplified media/player screen and play-button motif';
    case 'workshop':
      return 'a live-session / whiteboard motif with connected participant nodes';
    case 'article':
      return 'an editorial reading-surface motif with clean text-block panels';
    case 'template':
      return 'a document / table / form-layout motif';
    case 'tool':
      return 'a dashboard / widget / control-panel motif';
    case 'prompt_pack':
      return 'a chat / prompt-card / conversation-bubble motif';
    default:
      return 'an abstract knowledge motif';
  }
}

function getDescriptionSnippet(description: string | null, maxChars = 250): string {
  if (!description) return '';
  const sentences = description.split(/(?<=\.)\s+/);
  let result = sentences[0];
  if (sentences[1] !== undefined && (result.length + 1 + sentences[1].length) <= maxChars) {
    result = result + ' ' + sentences[1];
  }
  if (result.length > maxChars) {
    result = result.slice(0, maxChars).trimEnd() + '...';
  }
  return result.trim();
}

function buildVaultImagePrompt(item: {
  title_en: string;
  description_en: string | null;
  difficulty_level: string | null;
  content_type: string | null;
  tags: string[] | null;
}): string {
  const descSnippet = getDescriptionSnippet(item.description_en);
  const mood = getLevelMood(item.difficulty_level);
  const motif = getTypeMotif(item.content_type);
  const tags = item.tags?.length
    ? `Related topics: ${item.tags.slice(0, 6).join(', ')}.`
    : '';

  const itemContext = [
    'Create a high-quality card background image for an online AI-learning resource titled:',
    `${item.title_en}${descSnippet ? ': ' + descSnippet : ''}`,
    `Suggested visual motif: ${motif}.`,
    tags,
  ].filter(Boolean).join('\n');

  const styleGuidance = [
    'Visual style: soft, modern 3D-rendered illustration with a glassmorphic, premium-tech feel.',
    `Mood: ${mood} — calm, intelligent, optimistic, premium AI-education brand.`,
    'Background: light cream, off-white, or pale seafoam — never dark, never neon.',
    'Composition: floating geometric forms (spheres, soft cubes, network nodes, layered translucent panels, gentle dotted-grid accents) plus the suggested motif, representing the topic clearly.',
    'Materials: matte and glassy surfaces with subtle depth and soft shadows; occasional pastel coral spheres for warmth.',
    'Color palette: seafoam teal as primary, coral as occasional accent, pale neutral grounds. No deep navy, no dark backgrounds, no neon glows, no cyberpunk.',
    'Avoid generic stock-photo aesthetics and busy compositions.',
    // Labels ARE allowed for Vault cards (unlike course images), matching the reference style.
    'You MAY include a few small, tasteful conceptual elements that reinforce the topic — a simplified app/UI mockup, a labeled flow diagram, or small icon panels — rendered cleanly as part of the illustration. Keep any text minimal, legible, and topical (short labels only — no paragraphs, no gibberish, no watermarks). For Japanese-business topics, labels may be written in Japanese.',
  ].join(' ');

  const composition =
    'Compose for a wide learning-card banner: keep the key subject horizontally centered and balanced so it still reads when the image is cropped to a short, wide strip. Light cream or pale seafoam ground.';

  return [itemContext, styleGuidance, composition].join('\n\n');
}

async function cropToBanner(pngBuffer: Buffer): Promise<Buffer> {
  // gpt-image returns 1536x1024 (3:2). Center-crop vertically to 16:9 → 1536x864.
  // 16:9 serves both the wide /learn/vault card and the 16:9 learn-dashboard card via object-cover.
  const targetHeight = 864;
  const top = Math.floor((1024 - targetHeight) / 2);

  return sharp(pngBuffer)
    .extract({ left: 0, top, width: 1536, height: targetHeight })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Admin check
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Fetch item details for the prompt
    const { data: item, error: itemError } = await supabase
      .from('content_items')
      .select('title_en, description_en, difficulty_level, content_type, tags')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    const prompt = buildVaultImagePrompt(item);

    // Generate via OpenAI gpt-image (1536x1024 landscape, high quality)
    const openai = new OpenAI({ apiKey });
    const result = await openai.images.generate({
      model: 'gpt-image-2',
      prompt,
      size: '1536x1024',
      quality: 'high',
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        { error: 'No image returned from OpenAI' },
        { status: 502 },
      );
    }

    const rawBuffer = Buffer.from(b64, 'base64');
    const croppedBuffer = await cropToBanner(rawBuffer);

    // Upload to Supabase Storage as JPEG
    const storagePath = `${itemId}/card.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(VAULT_PUBLIC_BUCKET)
      .upload(storagePath, croppedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Get public URL (cache-bust so the UI sees the new image)
    const { data: urlData } = supabase.storage
      .from(VAULT_PUBLIC_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // Update content item record
    const { error: updateError } = await supabase
      .from('content_items')
      .update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update content item: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
