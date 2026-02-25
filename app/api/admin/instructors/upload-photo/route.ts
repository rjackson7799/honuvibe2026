import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
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
    const instructorId = formData.get('instructorId') as string | null;

    if (!file || !instructorId) {
      return NextResponse.json(
        { error: 'file and instructorId are required' },
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
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 2MB limit' },
        { status: 400 },
      );
    }

    // Verify instructor profile exists
    const { data: instructor, error: instructorError } = await supabase
      .from('instructor_profiles')
      .select('id')
      .eq('id', instructorId)
      .single();

    if (instructorError || !instructor) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    // Upload to Supabase Storage
    const ext = EXT_MAP[file.type];
    const storagePath = `${instructorId}/photo.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('instructor-photos')
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
      .from('instructor-photos')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Update instructor profile
    const { error: updateError } = await supabase
      .from('instructor_profiles')
      .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', instructorId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
