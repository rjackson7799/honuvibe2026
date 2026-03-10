import { NextResponse } from 'next/server';
import { getVaultSeriesBySlug } from '@/lib/vault/queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const series = await getVaultSeriesBySlug(slug);

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    return NextResponse.json(series);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
