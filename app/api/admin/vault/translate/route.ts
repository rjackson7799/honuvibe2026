// POST /api/admin/vault/translate — machine-translate a Vault item's English
// fields (title/description, or article body) to Japanese. Admin-only. The
// result lands in the editor form marked "machine translated" for human
// review; nothing is written to the database here (project rule: never
// machine-translate without human review for production).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AuthoringError,
  translateVaultContentToJp,
  vaultTranslateInputSchema,
} from '@/lib/vault/translate';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const parsed = vaultTranslateInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const translation = await translateVaultContentToJp(parsed.data);
    return NextResponse.json(translation);
  } catch (err) {
    if (err instanceof AuthoringError) {
      console.error('[admin/vault/translate]', err.code, err.message);
      return NextResponse.json(
        { error: `Translate assist failed (${err.code})` },
        { status: 502 },
      );
    }
    console.error('[admin/vault/translate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
