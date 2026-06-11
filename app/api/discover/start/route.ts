import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { newSessionSecret, setSessionCookie } from '@/lib/discover/session';

// POST /api/discover/start — intake gate submit. Creates a lead (lifecycle
// 'new', source 'discover') + a discovery session, sets the session cookie, and
// returns the sessionId. AI-Native short-circuits to the custom scoping path.

const optText = z
  .string()
  .max(2000)
  .nullish()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : null));

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  business_name: z.string().min(1).max(200),
  industry: z
    .enum(['creator', 'healthcare', 'service', 'professional', 'other'])
    .nullish()
    .transform((v) => v ?? null),
  location_type: z.enum(['online', 'physical', 'both']),
  tier_interest: z.enum(['starter', 'pro', 'ai_native', 'not_sure']).default('not_sure'),
  existing_url: z
    .string()
    .url()
    .max(500)
    .nullish()
    .transform((v) => v ?? null)
    .or(z.literal('').transform(() => null)),
  source_locale: z.enum(['en', 'ja']).default('en'),
  consent: z.literal(true, { message: 'Consent is required' }),
});

const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  const supabase = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      name: d.name,
      email: d.email,
      business_name: d.business_name,
      industry: d.industry,
      location_type: d.location_type,
      tier_interest: d.tier_interest,
      existing_url: d.existing_url,
      source: 'discover',
      source_locale: d.source_locale,
      lifecycle: 'new',
      sales_stage: 'new',
    })
    .select('id')
    .single();

  if (leadError || !lead) {
    console.error('[discover/start] lead insert failed:', leadError?.message);
    return NextResponse.json({ error: 'Could not start session' }, { status: 500 });
  }

  const { secret, hash } = newSessionSecret();
  const { data: session, error: sessionError } = await supabase
    .from('discovery_sessions')
    .insert({
      lead_id: lead.id,
      session_secret_hash: hash,
      current_step: 1,
      locale: d.source_locale,
      expires_at: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    console.error('[discover/start] session insert failed:', sessionError?.message);
    return NextResponse.json({ error: 'Could not start session' }, { status: 500 });
  }

  await setSessionCookie(session.id, secret);

  return NextResponse.json({
    sessionId: session.id,
    custom: d.tier_interest === 'ai_native',
  });
}
