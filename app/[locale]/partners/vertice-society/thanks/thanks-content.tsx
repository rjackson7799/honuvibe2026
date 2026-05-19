'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tier = 'community' | 'vault' | 'cohort';

interface TierCopy {
  badge: string;
  title: string;
  body: string;
  nextSteps: string[];
}

const COPY: Record<Tier, { en: TierCopy; ja: TierCopy }> = {
  community: {
    en: {
      badge: 'HonuVibe Community',
      title: "You're in.",
      body: "Your 14-day free trial has started. We've sent a login link to your email — click it to jump into the Community.",
      nextSteps: [
        'Check your email for a login link from HonuVibe.AI.',
        'Join the member-only Q&A, weekly Zoom, and project channels.',
        "Cancel anytime before day 14 if it's not for you.",
      ],
    },
    ja: {
      badge: 'HonuVibe Community',
      title: 'ご参加ありがとうございます。',
      body: '14日間の無料トライアルが開始されました。ログインリンクをメールでお送りしましたので、クリックしてコミュニティへお入りください。',
      nextSteps: [
        'HonuVibe.AIからのログインリンクメールをご確認ください。',
        'メンバー限定のQ&A、週次Zoom、プロジェクトチャンネルにご参加いただけます。',
        '14日以内であればいつでもキャンセル可能です。',
      ],
    },
  },
  vault: {
    en: {
      badge: 'HonuVibe Vault',
      title: 'Welcome to the Vault.',
      body: "Your subscription is active. We've sent a login link to your email — click it to start watching.",
      nextSteps: [
        'Check your email for a login link from HonuVibe.AI.',
        'All current and future Vault content is yours to explore.',
        'Community access is included — join the Q&A and weekly Zoom.',
      ],
    },
    ja: {
      badge: 'HonuVibe Vault',
      title: 'Vaultへようこそ。',
      body: 'サブスクリプションが有効になりました。ログインリンクをメールでお送りしましたので、クリックして視聴を開始してください。',
      nextSteps: [
        'HonuVibe.AIからのログインリンクメールをご確認ください。',
        '現在および今後追加されるVaultコンテンツすべてにアクセス可能です。',
        'コミュニティアクセスが含まれます — Q&Aと週次Zoomにご参加ください。',
      ],
    },
  },
  cohort: {
    en: {
      badge: 'Vertice Cohort — May 2026',
      title: 'See you May 23.',
      body: "Your cohort seat is reserved. We've sent a login link plus the cohort orientation packet to your email.",
      nextSteps: [
        'Check your email for the orientation packet (Zoom link, calendar invite, prep materials).',
        'Vault + Community access is unlocked through September 25, 2026.',
        'First live session: May 23, 2026 at 9am HST.',
      ],
    },
    ja: {
      badge: 'Vertice Cohort — May 2026',
      title: '5月23日にお会いしましょう。',
      body: 'コホートの席が確保されました。ログインリンクとオリエンテーション資料をメールでお送りしました。',
      nextSteps: [
        'メールでオリエンテーション資料（Zoomリンク、カレンダー招待、事前資料）をご確認ください。',
        '2026年9月25日までVault + コミュニティアクセスが有効です。',
        '初回ライブセッション: 2026年5月23日 9:00 HST。',
      ],
    },
  },
};

const INK_PRIMARY = 'var(--m-ink-primary, #1A2B33)';
const INK_SECONDARY = 'var(--m-ink-secondary, #5A6B73)';
const INK_TERTIARY = 'var(--m-ink-tertiary, #8B9499)';
const ACCENT_TEAL = 'var(--m-accent-teal, #0FA9A0)';
const ACCENT_TEAL_SOFT = 'var(--m-accent-teal-soft, rgba(15, 169, 160, 0.08))';
const BORDER = 'var(--m-border, #E5DFD3)';

export function ThanksContent({
  tier,
  sessionId,
  isJP,
}: {
  tier: Tier | null;
  sessionId: string | null;
  isJP: boolean;
}) {
  const [magicState, setMagicState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [magicError, setMagicError] = useState<string | null>(null);

  if (!tier) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold" style={{ color: INK_PRIMARY }}>
          {isJP ? '注文の確認' : 'Order confirmation'}
        </h1>
        <p className="mt-4" style={{ color: INK_SECONDARY }}>
          {isJP
            ? 'リンクが無効です。問題が続く場合はお問い合わせください。'
            : 'Link is invalid. Please contact support if the problem persists.'}
        </p>
        <Link
          href={isJP ? '/ja' : '/'}
          className="mt-8 inline-block underline"
          style={{ color: INK_SECONDARY }}
        >
          {isJP ? 'ホームに戻る' : 'Back home'}
        </Link>
      </main>
    );
  }

  const copy = COPY[tier][isJP ? 'ja' : 'en'];

  async function handleSendMagicLink() {
    if (!sessionId) {
      setMagicState('error');
      setMagicError(
        isJP
          ? 'セッションIDが見つかりません。サポートにお問い合わせください。'
          : 'Session ID is missing. Please contact support.',
      );
      return;
    }
    setMagicState('loading');
    setMagicError(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMagicState('error');
        setMagicError(
          data.error ??
            (isJP ? 'リンクの送信に失敗しました。' : 'Failed to send link.'),
        );
        return;
      }
      setMagicState('sent');
    } catch {
      setMagicState('error');
      setMagicError(isJP ? 'ネットワークエラー。' : 'Network error.');
    }
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-24">
      <div className="space-y-8">
        <div>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider"
            style={{ background: ACCENT_TEAL_SOFT, color: ACCENT_TEAL }}
          >
            {copy.badge}
          </span>
          <h1
            className="mt-6 text-4xl font-semibold leading-tight md:text-5xl"
            style={{ color: INK_PRIMARY }}
          >
            {copy.title}
          </h1>
          <p className="mt-4 text-lg" style={{ color: INK_SECONDARY }}>
            {copy.body}
          </p>
        </div>

        <ul
          className="space-y-3 border-l pl-5"
          style={{ borderColor: BORDER, color: INK_SECONDARY }}
        >
          {copy.nextSteps.map((step, i) => (
            <li key={i} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ul>

        <div
          className="space-y-3 rounded-lg p-6"
          style={{ border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.6)' }}
        >
          <p className="text-sm" style={{ color: INK_TERTIARY }}>
            {isJP
              ? 'メールが届かない場合は、新しいログインリンクを送信できます。'
              : "Didn't get the email? We can send a fresh login link."}
          </p>

          {magicState === 'sent' ? (
            <p className="text-sm font-medium" style={{ color: ACCENT_TEAL }}>
              {isJP
                ? '✓ 新しいログインリンクをメールでお送りしました。'
                : '✓ Fresh login link sent. Check your email.'}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={magicState === 'loading'}
              className="rounded-md px-5 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
              style={{ background: ACCENT_TEAL, color: '#fff' }}
            >
              {magicState === 'loading'
                ? isJP
                  ? '送信中…'
                  : 'Sending…'
                : isJP
                  ? 'ログインリンクをメールで送信'
                  : 'Email me a login link'}
            </button>
          )}

          {magicState === 'error' && magicError && (
            <p className="text-sm text-red-600">{magicError}</p>
          )}
        </div>

        <div className="border-t pt-6 text-sm" style={{ borderColor: BORDER, color: INK_TERTIARY }}>
          <p>
            {isJP ? 'お問い合わせ: ' : 'Questions? '}
            <a
              href="mailto:hello@honuvibe.ai"
              className="underline hover:opacity-80"
              style={{ color: INK_SECONDARY }}
            >
              hello@honuvibe.ai
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
