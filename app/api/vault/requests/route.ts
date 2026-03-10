import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topicText, tags } = body;

    if (!topicText || typeof topicText !== 'string' || topicText.trim().length === 0) {
      return NextResponse.json({ error: 'Topic text is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('vault_content_requests')
      .insert({
        user_id: user.id,
        topic_text: topicText.trim().slice(0, 500),
        tags: Array.isArray(tags) ? tags : [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Content request insert error:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    console.error('Content request API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('vault_content_requests')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Content requests fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    console.error('Content requests API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
