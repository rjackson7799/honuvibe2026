import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be JPEG, PNG, or WebP', code: 'wrong_type' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 2MB limit', code: 'too_large' },
        { status: 400 },
      );
    }

    const ext = EXT_MAP[file.type];
    const storagePath = `${user.id}/avatar.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('avatars')
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

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
