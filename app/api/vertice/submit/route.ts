import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendVerticeLeadConfirmation,
  sendVerticeLeadAdminNotification,
} from '@/lib/email/send';
import type { VerticeLeadEmailData } from '@/lib/email/types';

// ─── In-memory rate limiter ─────────────────────────────────

const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }

  record.count++;
  return record.count > 5;
}

// ─── POST handler ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'rate_limit' },
        { status: 429 },
      );
    }

    const data = await request.json();

    // 2. Validate access code (server-side only)
    const submittedCode = (data.accessCode ?? '').trim().toUpperCase();
    const validCode = (process.env.VERTICE_ACCESS_CODE ?? '').trim().toUpperCase();

    if (!validCode || submittedCode !== validCode) {
      return NextResponse.json(
        { error: 'invalid_code' },
        { status: 403 },
      );
    }

    // 3. Validate required fields
    const { fullName, email, aiLevel, interests, whyStudy } = data;

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (!aiLevel || !['beginner', 'intermediate', 'advanced'].includes(aiLevel)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (!whyStudy || whyStudy.trim().length < 10) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // 4. Upsert into Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let isReturning = false;

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Check if email already exists
      const { data: existing } = await supabase
        .from('vertice_leads')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      isReturning = !!existing;

      const { error: dbError } = await supabase
        .from('vertice_leads')
        .upsert(
          {
            full_name: fullName.trim(),
            email: email.toLowerCase().trim(),
            ai_level: aiLevel,
            interests,
            why_study: whyStudy.trim(),
            locale: data.locale === 'ja' ? 'ja' : 'en',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' },
        );

      if (dbError) {
        console.error('[Vertice] DB upsert failed:', dbError.message);
      }
    }

    // 5. Fire-and-forget emails
    const locale = (data.locale === 'ja' ? 'ja' : 'en') as 'en' | 'ja';
    const firstName = fullName.trim().split(' ')[0];

    const emailData: VerticeLeadEmailData = {
      locale,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      aiLevel,
      interests,
      whyStudy: whyStudy.trim(),
      isReturning,
    };

    void Promise.all([
      sendVerticeLeadConfirmation(emailData),
      sendVerticeLeadAdminNotification(emailData),
    ]);

    // 6. Return success
    return NextResponse.json({
      success: true,
      firstName,
      isReturning,
    });
  } catch {
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 },
    );
  }
}
