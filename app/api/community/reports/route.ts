import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCommunityScope } from '@/lib/community/scope';
import { CommunityError, fileReport } from '@/lib/community/mutations';
import { tryConsume } from '@/lib/community/rate-limit';
import { RATE_LIMITS } from '@/lib/community/constants';

const VALID_REASONS = ['spam', 'harassment', 'off_topic', 'other'] as const;
const VALID_TARGETS = ['post', 'comment'] as const;

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
      `rp:${user.id}`,
      RATE_LIMITS.reports.limit,
      RATE_LIMITS.reports.windowMs,
    )
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | { target_type?: unknown; target_id?: unknown; reason?: unknown; note?: unknown }
    | null;
  if (
    !body
    || typeof body.target_type !== 'string'
    || !(VALID_TARGETS as readonly string[]).includes(body.target_type)
    || typeof body.target_id !== 'string'
    || typeof body.reason !== 'string'
    || !(VALID_REASONS as readonly string[]).includes(body.reason)
  ) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  try {
    await fileReport(supabase, {
      target_type: body.target_type as 'post' | 'comment',
      target_id: body.target_id,
      reporter_id: user.id,
      partner_id: scope.partnerId,
      reason: body.reason as 'spam' | 'harassment' | 'off_topic' | 'other',
      note: typeof body.note === 'string' ? body.note : null,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof CommunityError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}
