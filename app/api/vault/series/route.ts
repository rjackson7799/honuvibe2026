import { NextResponse } from 'next/server';
import { getVaultSeriesList } from '@/lib/vault/queries';

export async function GET() {
  try {
    const series = await getVaultSeriesList();
    return NextResponse.json(series);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
