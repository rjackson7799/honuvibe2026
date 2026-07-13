import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendFeedbackAdminNotification } from '@/lib/email/send';

const schema = z.object({
  message: z.string().trim().min(1).max(2000),
  category: z.enum(['general', 'idea', 'problem']).default('general'),
  page_path: z.string().max(512).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const { message, category, page_path } = parsed.data;

  // user_id is derived server-side from the session — never trusted from the client.
  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    category,
    message,
    page_path: page_path ?? null,
  });

  if (error) {
    console.error('[Feedback] insert failed:', error.message);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  // Best-effort admin notification — don't block the response on email.
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  void sendFeedbackAdminNotification({
    category,
    message,
    email: user.email ?? undefined,
    name: profile?.full_name ?? undefined,
    pagePath: page_path,
  });

  return NextResponse.json({ success: true });
}
