import { NextRequest, NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/vault/actions';
import type { VaultFeedbackType } from '@/lib/vault/types';

export async function POST(request: NextRequest) {
  try {
    const { contentItemId, feedbackType } = await request.json();
    if (!contentItemId || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing contentItemId or feedbackType' },
        { status: 400 },
      );
    }
    const result = await submitFeedback(contentItemId, feedbackType as VaultFeedbackType);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
