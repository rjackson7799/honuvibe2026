import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { fetchLinkPreview } from '@/lib/community/link-preview';
import { tryConsume } from '@/lib/community/rate-limit';
import { RATE_LIMITS } from '@/lib/community/constants';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const scope = await getCommunityScope(supabase);
  if (!scope) return NextResponse.json({ error: 'paywall' }, { status: 402 });

  if (
    !tryConsume(
      `lp:${user.id}`,
      RATE_LIMITS.linkPreview.limit,
      RATE_LIMITS.linkPreview.windowMs,
    )
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (!body || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const preview = await fetchLinkPreview(body.url);
  return NextResponse.json({ preview });
}
