import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Build a focused prompt from course data
    const toolsList = course.tools_covered?.join(', ') || '';
    const tagsList = course.tags?.join(', ') || '';
    const aspectHint = imageType === 'thumbnail'
      ? 'landscape 16:9 aspect ratio, suitable as a course card thumbnail'
      : 'ultra-wide 21:9 panoramic aspect ratio, suitable as a course page hero banner';

    const prompt = [
      `Create a professional, modern course cover image for an AI education platform.`,
      `Course: "${course.title_en}".`,
      course.description_en ? `Description: ${course.description_en.slice(0, 300)}.` : '',
      toolsList ? `Topics/tools: ${toolsList}.` : '',
      tagsList ? `Tags: ${tagsList}.` : '',
      course.level ? `Level: ${course.level}.` : '',
      `Style: Clean, abstract, tech-forward design with ocean/teal color accents.`,
      `Use subtle geometric patterns, gradients, or abstract data visualizations.`,
      `Do NOT include any text, words, letters, or numbers in the image.`,
      `${aspectHint}.`,
    ].filter(Boolean).join(' ');

    // Call OpenAI DALL-E 3
    const size = imageType === 'thumbnail' ? '1792x1024' : '1792x1024';

    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json();
      return NextResponse.json(
        { error: `OpenAI error: ${err.error?.message || 'Image generation failed'}` },
        { status: 502 },
      );
    }

    const dalleData = await dalleRes.json();
    const imageUrl = dalleData.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image returned from OpenAI' }, { status: 502 });
    }

    // Download the generated image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to download generated image' }, { status: 502 });
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // Upload to Supabase Storage
    const storagePath = `${courseId}/${imageType}.png`;

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
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
