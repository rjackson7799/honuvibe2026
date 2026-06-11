import { NextResponse, type NextRequest } from 'next/server';
import { authorizeSession } from '@/lib/discover/session';
import { responsesToAnswerMap, priceFromAnswers } from '@/lib/discover/derive';

// POST /api/discover/complete/[sessionId] — finalize. Requires a verified email.
// Computes pricing deterministically (lib/pricing.ts), snapshots it on the
// session, writes discovery_outputs.pricing_summary, and advances lifecycle →
// 'completed'. The other artifacts (brand voice, PRD, design brief) stay null
// until the Claude generation increment.

interface LeadRow {
  id: string;
  email_verified: boolean;
  industry: string | null;
  location_type: 'online' | 'physical' | 'both' | null;
  tier_interest: 'starter' | 'pro' | 'ai_native' | 'not_sure' | null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { supabase, session } = auth;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, email_verified, industry, location_type, tier_interest')
    .eq('id', session.lead_id)
    .single<LeadRow>();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!lead.email_verified) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 409 });
  }

  const { data: responses } = await supabase
    .from('discovery_responses')
    .select('question_id, answer')
    .eq('session_id', sessionId);

  const answerMap = responsesToAnswerMap(responses ?? []);
  const pricing = priceFromAnswers(answerMap, lead);
  const now = new Date().toISOString();

  await supabase
    .from('discovery_sessions')
    .update({
      computed_pricing: pricing,
      recommend_upgrade: pricing.recommendUpgrade,
      completed_at: now,
    })
    .eq('id', sessionId);

  // Upsert the pricing summary artifact (other artifacts stay null this slice).
  const { error: outputError } = await supabase.from('discovery_outputs').upsert(
    { session_id: sessionId, pricing_summary: pricing, generated_at: now },
    { onConflict: 'session_id' },
  );
  if (outputError) {
    console.error('[discover/complete] output upsert failed:', outputError.message);
  }

  await supabase.from('leads').update({ lifecycle: 'completed' }).eq('id', lead.id);

  return NextResponse.json({ ok: true, pricing });
}
