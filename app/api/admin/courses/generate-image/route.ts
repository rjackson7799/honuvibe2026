import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

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

function buildImagePrompt(
  course: {
    title_en: string;
    description_en: string | null;
    level: string | null;
    tools_covered: string[] | null;
    tags: string[] | null;
  },
  imageType: 'thumbnail' | 'hero',
): string {
  const descSnippet = getDescriptionSnippet(course.description_en);
  const mood = getLevelMood(course.level);
  const tools = course.tools_covered?.length
    ? `Tools featured in this course: ${course.tools_covered.join(', ')}.`
    : '';

  const courseContext = [
    'Create a high-quality background image with no text for an online course about:',
    `${course.title_en}${descSnippet ? ': ' + descSnippet : ''}`,
    tools,
  ].filter(Boolean).join('\n');

  const styleGuidance = [
    'Visual style: soft, modern 3D-rendered illustration with a glassmorphic, premium-tech feel.',
    `Mood: ${mood} — calm, intelligent, optimistic, premium AI-education brand.`,
    'Background: light cream, off-white, or pale seafoam — never dark, never neon.',
    'Composition: floating geometric forms (spheres, soft cubes, network nodes, layered translucent panels, gentle dotted-grid accents) representing the course topic abstractly.',
    'Materials: matte and glassy surfaces with subtle depth and soft shadows; occasional pastel coral spheres for warmth.',
    'Color palette: seafoam teal as primary, coral as occasional accent, pale neutral grounds. No deep navy, no dark backgrounds, no neon glows, no cyberpunk.',
    'Avoid generic stock-photo aesthetics and busy compositions.',
    'Absolutely no text, letters, numbers, or words anywhere in the image.',
  ].join(' ');

  const composition = imageType === 'thumbnail'
    ? 'Compose for a course-card thumbnail: a centered focal subject readable at small sizes, with plenty of clean negative space. Light cream or pale seafoam ground.'
    : 'Compose for a wide panoramic hero banner: visual interest weighted toward the edges, with a calm open center area where overlay text will sit. Cinematic horizontal flow on a light cream or pale seafoam ground.';

  return [courseContext, styleGuidance, composition].join('\n\n');
}

async function cropToAspect(
  pngBuffer: Buffer,
  imageType: 'thumbnail' | 'hero',
): Promise<Buffer> {
  // gpt-image-1 returns 1536x1024 (3:2). Crop vertically to target aspect ratio.
  // Thumbnail: 16:9 → 1536x864 (crop 160px total, 80 top / 80 bottom — center crop).
  // Hero:      21:9 → 1536x658 (crop 366px total, 183 top / 183 bottom — center crop).
  const targetHeight = imageType === 'thumbnail' ? 864 : 658;
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
    const { courseId, imageType } = await request.json();

    if (!courseId || !imageType) {
      return NextResponse.json(
        { error: 'courseId and imageType are required' },
        { status: 400 },
      );
    }

    if (imageType !== 'thumbnail' && imageType !== 'hero') {
      return NextResponse.json(
        { error: 'imageType must be "thumbnail" or "hero"' },
        { status: 400 },
      );
    }

    // Fetch course details for the prompt
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title_en, description_en, level, tools_covered, tags')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const prompt = buildImagePrompt(course, imageType);

    // Generate via OpenAI gpt-image-1 (1536x1024 landscape, high quality)
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
    const croppedBuffer = await cropToAspect(rawBuffer, imageType);

    // Upload to Supabase Storage as JPEG
    const storagePath = `${courseId}/${imageType}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('course-images')
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
      .from('course-images')
      .getPublicUrl(storagePath);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    // Update course record
    const column = imageType === 'thumbnail' ? 'thumbnail_url' : 'hero_image_url';
    const { error: updateError } = await supabase
      .from('courses')
      .update({ [column]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', courseId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update course: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
