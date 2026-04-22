import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { submitInstructorApplication } from '@/lib/instructor-applications/actions';
import { PARTNER_COOKIE_NAME } from '@/lib/partner-attribution';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.applicant_full_name || !data.applicant_email || !data.bio_short || !data.proposed_topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    if (!data.applicant_email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Length guards — keep the form honest
    if (String(data.bio_short).length > 1000) {
      return NextResponse.json({ error: 'Bio too long' }, { status: 400 });
    }

    const store = await cookies();
    const partnerSlug = store.get(PARTNER_COOKIE_NAME)?.value
      ? decodeURIComponent(store.get(PARTNER_COOKIE_NAME)!.value)
      : null;

    const expertise = Array.isArray(data.expertise_areas)
      ? data.expertise_areas.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 10)
      : [];

    await submitInstructorApplication({
      applicant_email: String(data.applicant_email),
      applicant_full_name: String(data.applicant_full_name),
      applicant_locale: data.locale === 'ja' ? 'ja' : 'en',
      bio_short: String(data.bio_short),
      expertise_areas: expertise,
      proposed_topic: String(data.proposed_topic),
      sample_material_url: data.sample_material_url ? String(data.sample_material_url) : null,
      linkedin_url: data.linkedin_url ? String(data.linkedin_url) : null,
      website_url: data.website_url ? String(data.website_url) : null,
      why_honuvibe: data.why_honuvibe ? String(data.why_honuvibe) : null,
      partner_slug: partnerSlug,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[instructor-applications/submit] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
