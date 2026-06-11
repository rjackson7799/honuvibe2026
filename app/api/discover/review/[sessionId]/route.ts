import { NextResponse, type NextRequest } from 'next/server';
import { authorizeSession } from '@/lib/discover/session';
import { responsesToAnswerMap, priceFromAnswers } from '@/lib/discover/derive';

// GET  /api/discover/review/[sessionId] — consolidated answers + price. Doubles
//      as the resume hydrator (flow) and the summary source (complete screen).
// POST /api/discover/review/[sessionId] — mark the review step reached
//      (lifecycle → 'review'). Individual edits go through /answer.

interface LeadRow {
  id: string;
  name: string;
  email: string;
  business_name: string;
  industry: string | null;
  location_type: 'online' | 'physical' | 'both' | null;
  tier_interest: 'starter' | 'pro' | 'ai_native' | 'not_sure' | null;
  existing_url: string | null;
  source_locale: 'en' | 'ja';
  email_verified: boolean;
  lifecycle: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { supabase, session } = auth;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, name, email, business_name, industry, location_type, tier_interest, existing_url, source_locale, email_verified, lifecycle',
    )
    .eq('id', session.lead_id)
    .single<LeadRow>();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: responses } = await supabase
    .from('discovery_responses')
    .select('question_id, answer, is_decide_for_me')
    .eq('session_id', sessionId);

  const answerMap = responsesToAnswerMap(responses ?? []);
  const decideForMe = (responses ?? [])
    .filter((r) => r.is_decide_for_me)
    .map((r) => r.question_id);
  const pricing = priceFromAnswers(answerMap, lead);

  return NextResponse.json({
    lead: {
      name: lead.name,
      email: lead.email,
      businessName: lead.business_name,
      industry: lead.industry,
      locationType: lead.location_type,
      tierInterest: lead.tier_interest,
      existingUrl: lead.existing_url,
      emailVerified: lead.email_verified,
      lifecycle: lead.lifecycle,
    },
    answers: answerMap,
    decideForMe,
    currentStep: session.current_step,
    pricing,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { supabase, session } = auth;

  await supabase.from('leads').update({ lifecycle: 'review' }).eq('id', session.lead_id);

  return NextResponse.json({ ok: true });
}
