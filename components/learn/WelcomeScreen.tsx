'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Users, ArrowRight } from 'lucide-react';
import { markOnboarded } from '@/lib/students/actions';

type Props = {
  displayName: string;
  locale: string;
};

export function WelcomeScreen({ displayName, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isJP = locale === 'ja';
  const prefix = isJP ? '/ja' : '';

  async function handleNavigate(href: string) {
    if (loading) return;
    setLoading(true);
    await markOnboarded();
    router.push(href);
  }

  const cards = [
    {
      icon: GraduationCap,
      title: isJP ? 'コース' : 'Courses',
      description: isJP
        ? 'ライブZoomセッション付きの担任制コホートコース。プロジェクトを通じて実践的に学びましょう。'
        : 'Teacher-led cohort classes with live Zoom sessions and hands-on projects.',
      cta: isJP ? 'コースを見る' : 'Browse Courses',
      href: `${prefix}/learn/dashboard/courses`,
      accent: 'var(--accent-teal)',
    },
    {
      icon: Lock,
      title: 'The Vault',
      description: isJP
        ? 'Ryanが制作したプレミアム動画ライブラリ。月額サブスクリプションで深く学べます。'
        : "Ryan's premium 10-minute deep-dive videos. On your schedule, at your pace.",
      cta: isJP ? 'Vaultを見る' : 'Explore The Vault',
      href: `${prefix}/learn/dashboard/my-library`,
      accent: 'var(--accent-gold)',
    },
    {
      icon: Users,
      title: isJP ? 'コミュニティ' : 'Community',
      description: isJP
        ? '仲間の受講生とつながり、サポートを受け、ライブセッションに参加しましょう。'
        : 'Connect with fellow students, get support, and join live sessions.',
      cta: isJP ? 'コミュニティへ' : 'Join the Community',
      href: `${prefix}/learn/dashboard/community`,
      accent: 'var(--accent-teal)',
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-16 px-4">
      {/* Heading */}
      <div className="text-center mb-12 max-w-xl">
        <h1 className="text-3xl font-serif text-fg-primary mb-3">
          {isJP ? `${displayName}さん、ようこそ！` : `Welcome to HonuVibe, ${displayName}`}
        </h1>
        <p className="text-fg-secondary text-base">
          {isJP
            ? 'あなたの学習プラットフォームの準備ができました。どこから始めますか？'
            : 'Your learning platform is ready. Where would you like to start?'}
        </p>
      </div>

      {/* CTA Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl mb-10">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => handleNavigate(card.href)}
              disabled={loading}
              className="group flex flex-col items-start gap-4 p-6 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover hover:bg-bg-tertiary transition-all text-left disabled:opacity-60"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${card.accent} 15%, transparent)` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.accent }} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-fg-primary mb-1">{card.title}</h2>
                <p className="text-sm text-fg-tertiary leading-relaxed">{card.description}</p>
              </div>
              <span
                className="inline-flex items-center gap-1 text-sm font-medium transition-colors group-hover:gap-2"
                style={{ color: card.accent }}
              >
                {card.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Skip link */}
      <button
        onClick={() => handleNavigate(`${prefix}/learn/dashboard`)}
        disabled={loading}
        className="text-sm text-fg-tertiary hover:text-fg-secondary transition-colors disabled:opacity-50"
      >
        {isJP ? 'ダッシュボードへスキップ →' : 'Skip to dashboard →'}
      </button>
    </div>
  );
}
