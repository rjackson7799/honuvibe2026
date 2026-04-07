'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { SubscribeButton } from '@/components/billing/SubscribeButton';

export function VaultUpsellBanner() {
  const locale = useLocale();
  const isJP = locale === 'ja';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-xl bg-accent-teal/8 border border-accent-teal/20">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="shrink-0 mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-accent-teal/10">
          <Lock size={15} className="text-accent-teal" />
        </div>
        <div>
          <p className="text-sm font-medium text-fg-primary">
            {isJP ? 'ヴォールトを解除 — 月額$99' : 'Unlock The Vault — $99/month'}
          </p>
          <p className="text-xs text-fg-tertiary mt-0.5">
            {isJP
              ? '英語・日本語の両方でAIを学べる唯一のプラットフォーム。200以上のチュートリアル・ガイド・テンプレート。'
              : 'The only AI learning platform with full English & Japanese content — 200+ tutorials, guides, and templates.'}
          </p>
          <p className="text-xs font-medium text-accent-teal mt-1">
            {isJP ? 'ãƒ´ã‚©ãƒ¼ãƒ«ãƒˆã¯4æœˆ15æ—¥ã«ã‚ªãƒ¼ãƒ—ãƒ³ã—ã¾ã™ã€‚' : 'The Vault opens on April 15.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <SubscribeButton />
        <Link
          href="/learn"
          className="text-xs text-fg-tertiary hover:text-fg-secondary transition-colors whitespace-nowrap underline underline-offset-2"
        >
          {isJP ? 'コースを見る →' : 'Browse courses →'}
        </Link>
      </div>
    </div>
  );
}
