import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { CommunityError, createPost } from '@/lib/community/mutations';
import { CATEGORIES, type Category } from '@/lib/community/constants';
import type { LinkPreview } from '@/lib/community/types';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  const body = (await req.json().catch(() => null)) as
    | { category?: unknown; body_md?: unknown; link_preview?: unknown }
    | null;
  if (
    !body
    || typeof body.category !== 'string'
    || !(CATEGORIES as readonly string[]).includes(body.category)
    || typeof body.body_md !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    const post = await createPost(supabase, {
      category: body.category as Category,
      body_md: body.body_md,
      link_preview: (body.link_preview as LinkPreview | null | undefined) ?? null,
      partner_id: scope.partnerId,
      author_id: user.id,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}
