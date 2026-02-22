import { NextRequest, NextResponse } from 'next/server';

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

    // Supabase integration placeholder
    // When NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set,
    // this will insert into the applications table
    // const supabase = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // );
    // await supabase.from('applications').insert(data);

    // For now, log the application (would be replaced by actual DB insert)
    console.log('Application received:', {
      name: data.name,
      email: data.email,
      company: data.company,
      engagement: data.engagement,
      timeline: data.timeline,
      budget: data.budget,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
