// POST /api/admin/studio-leads/[id]/outreach — generate a cold-outreach email
// draft for a Studio lead via Claude, persist it, and return it so the panel can
// show the result (and generated-at timestamp) without a refresh. Admin-only.
//
// Every failure path returns JSON — never a leaked thrown 500:
//   400 malformed lead id · 401/403 non-admin · 404 lead not found ·
//   503 generation unavailable (ANTHROPIC_API_KEY unset) · 502 Claude call failed.

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateOutreachEmail } from '@/lib/studio/outreach-generator';

export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 as const };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Not authorized', status: 403 as const };
  }
  return { user };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: lead } = await admin
    .from('leads')
    .select(
      'name, business_name, industry, existing_url, notes, preview_url, preview_password',
    )
    .eq('id', id)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  // Generation is unavailable (not an error) when the key isn't configured.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Generation unavailable' },
      { status: 503 },
    );
  }

  let email: { subject: string; body: string };
  try {
    email = await generateOutreachEmail({
      company: lead.business_name,
      contactName: lead.name ?? null,
      industry: lead.industry ?? null,
      existingUrl: lead.existing_url ?? null,
      notes: lead.notes ?? null,
      previewUrl: lead.preview_url ?? null,
      previewPassword: lead.preview_password ?? null,
    });
  } catch (err) {
    console.error('[admin/studio-leads/outreach] generation failed:', err);
    return NextResponse.json(
      { error: 'Email generation failed. Please try again.' },
      { status: 502 },
    );
  }

  const generatedAt = new Date().toISOString();
  const { error: writeError } = await admin
    .from('leads')
    .update({
      outreach_email_subject: email.subject,
      outreach_email_body: email.body,
      outreach_email_generated_at: generatedAt,
    })
    .eq('id', id);

  if (writeError) {
    console.error('[admin/studio-leads/outreach] persist failed:', writeError);
    return NextResponse.json(
      { error: 'Generated the email but failed to save it.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    subject: email.subject,
    body: email.body,
    generated_at: generatedAt,
  });
}
