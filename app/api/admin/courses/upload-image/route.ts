import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = {
  thumbnail: 2 * 1024 * 1024, // 2MB
  hero: 5 * 1024 * 1024,      // 5MB
};
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

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

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string | null;
    const imageType = formData.get('imageType') as string | null;

    // Validate required fields
    if (!file || !courseId || !imageType) {
      return NextResponse.json(
        { error: 'file, courseId, and imageType are required' },
        { status: 400 },
      );
    }

    // Validate imageType
    if (imageType !== 'thumbnail' && imageType !== 'hero') {
      return NextResponse.json(
        { error: 'imageType must be "thumbnail" or "hero"' },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be JPEG, PNG, WebP, or AVIF' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE[imageType]) {
      const maxMB = MAX_SIZE[imageType] / (1024 * 1024);
      return NextResponse.json(
        { error: `File exceeds ${maxMB}MB limit for ${imageType} images` },
        { status: 400 },
      );
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Upload to Supabase Storage
    const ext = EXT_MAP[file.type];
    const storagePath = `${courseId}/${imageType}.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
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
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
