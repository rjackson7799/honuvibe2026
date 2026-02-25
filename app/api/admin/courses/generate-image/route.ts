import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

function getLevelMood(level: string | null): string {
  switch (level) {
    case 'beginner':
      return 'approachable, friendly, and welcoming — clear and uncluttered';
    case 'intermediate':
      return 'professional and capable — balanced detail with confident energy';
    case 'advanced':
      return 'sophisticated and technical — rich detail, layered depth, expert-level atmosphere';
    default:
      return 'professional and engaging';
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
    `Visual style: ${mood}.`,
    'Professional quality suitable for a premium education platform.',
    'Subtle representational elements and visual metaphors relevant to the topic are welcome.',
    'Avoid generic stock-photo aesthetics — prefer illustrative, modern, or slightly stylized visuals.',
    'Color tone: dark, deep backgrounds preferred. Teal and gold accents welcome if they suit the subject.',
    'Absolutely no text, letters, numbers, or words anywhere in the image.',
  ].join(' ');

  const composition = imageType === 'thumbnail'
    ? 'Compose for a course card thumbnail: 16:9 aspect ratio, balanced centered focal point, visually striking and clear even at small sizes.'
    : 'Compose for a wide panoramic hero banner: 21:9 aspect ratio, visual interest toward the edges, calm open center area where course title text will be overlaid, cinematic horizontal flow.';

  return [courseContext, styleGuidance, composition].join('\n\n');
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
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

    // Configure aspect ratio and size based on image type
    const imageConfig = imageType === 'thumbnail'
      ? { aspectRatio: '16:9', imageSize: '2K' }
      : { aspectRatio: '21:9', imageSize: '2K' };

    const prompt = buildImagePrompt(course, imageType);

    // Call Gemini Image Generation API
    const model = 'gemini-3-pro-image-preview';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      const message = (err as { error?: { message?: string } })?.error?.message
        || `Gemini API error (${geminiRes.status})`;
      return NextResponse.json(
        { error: `Image generation failed: ${message}` },
        { status: 502 },
      );
    }

    const geminiData = await geminiRes.json();

    // Extract base64 image from response
    const candidates = geminiData.candidates as Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
    }> | undefined;

    const imagePart = candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData,
    );

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json(
        { error: 'No image returned from Gemini' },
        { status: 502 },
      );
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

    // Upload to Supabase Storage
    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const storagePath = `${courseId}/${imageType}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(storagePath, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

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
