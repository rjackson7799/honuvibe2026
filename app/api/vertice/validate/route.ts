import { NextRequest, NextResponse } from 'next/server';

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
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
    }

    const { code } = await request.json();

    const submittedCode = (code ?? '').trim().toUpperCase();
    const validCode = (process.env.VERTICE_ACCESS_CODE ?? '').trim().toUpperCase();

    if (!validCode || submittedCode !== validCode) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 403 });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
