import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendApplicationConfirmation,
  sendApplicationAdminNotification,
} from '@/lib/email/send';
import type { ApplicationEmailData } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Basic validation
    if (!data.name || !data.email || !data.project) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    if (!data.email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 },
      );
    }

    // Insert into applications table (uses service role to bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { error: dbError } = await supabase.from('applications').insert({
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        website: data.website ?? null,
        engagement_type: data.engagement ?? null,
        project_description: data.project,
        referral_source: data.referral_source ?? null,
        timeline: data.timeline ?? null,
        budget_range: data.budget ?? null,
        locale: data.locale ?? 'en',
      });

      if (dbError) {
        console.error('[Apply] DB insert failed:', dbError.message);
      }
    }

    // Detect locale
    const locale = (data.locale === 'ja' ? 'ja' : 'en') as 'en' | 'ja';

    const emailData: ApplicationEmailData = {
      locale,
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      website: data.website ?? null,
      engagement: data.engagement ?? null,
      project: data.project,
      timeline: data.timeline ?? null,
      budget: data.budget ?? null,
      referralSource: data.referral_source ?? null,
    };

    // Fire-and-forget emails
    void Promise.all([
      sendApplicationConfirmation(emailData),
      sendApplicationAdminNotification(emailData),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
