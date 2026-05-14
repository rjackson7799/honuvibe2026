'use client';

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

import './vertice.css';
import {
  FloatingHonu,
  HonuMark,
  IconArrow,
  IconCheck,
  IconChevron,
  IconPlay,
  IconSpark,
  IconX,
} from './icons';

interface Props {
  locale: string;
}

const PARTNER_SLUG = 'vertice-society';

const COHORT = {
  startDate: '2026-05-15',
  startDateLabel: { jp: '5/15開講', en: 'Starts May 15' },
  seatsLeft: 15,
};

function setPartnerCookie(slug: string) {
  const thirtyDays = 60 * 60 * 24 * 30;
  document.cookie = `hv_partner=${encodeURIComponent(slug)}; Max-Age=${thirtyDays}; Path=/; SameSite=Lax`;
}

export function VerticeLanding({ locale }: Props) {
  useEffect(() => {
    setPartnerCookie(PARTNER_SLUG);
    trackEvent('partner_landing_view', { partner: PARTNER_SLUG, locale });
  }, [locale]);

  return (
    <div className="vertice-scope">
      <Hero />
      <Contrast />
      <Capabilities />
      <Curriculum />
      <VaultPreview />
      <Pricing />
      <Instructors />
      <FAQ />
      <OperatingCompany />
      <FinalCTA />
      <VerticeFooter />
    </div>
  );
}

// ——— Hero ————————————————————————————————————————————————————
function Hero() {
  const onPrimaryClick = () =>
    trackEvent('partner_cta_click', {
      partner: PARTNER_SLUG,
      location: 'hero',
      tier: 'vault',
    });
  const onSecondaryClick = () =>
    trackEvent('partner_cta_click', {
      partner: PARTNER_SLUG,
      location: 'hero',
      tier: 'cohort',
    });

  const stats: Array<{ ic: string; jp: string; en: string }> = [
    { ic: '📚', jp: '30時間以上', en: '30+ hours' },
    { ic: '🎬', jp: '40本以上の動画', en: '40+ videos' },
    { ic: '🌐', jp: 'バイリンガル', en: 'EN-JP' },
    { ic: '♾️', jp: '永久アクセス', en: 'Lifetime' },
    { ic: '🎯', jp: COHORT.startDateLabel.jp + 'ライブ', en: COHORT.startDateLabel.en },
  ];

  return (
    <section className="vertice-hero" aria-labelledby="vertice-hero-title">
      <div className="vertice-hero-wash vertice-hero-wash-seafoam" aria-hidden="true" />
      <div className="vertice-hero-wash vertice-hero-wash-lavender" aria-hidden="true" />

      <div className="vertice-hero-inner">
        <div>
          <div className="vertice-hero-badge">
            <span className="vertice-hero-badge-tag">🌊 EXCLUSIVE</span>
            <span className="vertice-hero-badge-text">
              <span className="vertice-jp">Vertice Society 限定プログラム</span>
              <span className="vertice-hero-badge-sub"> · Members only</span>
            </span>
          </div>

          <h1 id="vertice-hero-title" className="vertice-hero-title">
            <span className="vertice-jp">
              AIで、追いつく。
              <br />
              追い越す。
              <br />
              <span className="vertice-serif-accent">使いこなす。</span>
            </span>
          </h1>
          <p className="vertice-hero-subtitle">
            Catch up. Get ahead.{' '}
            <span className="vertice-hero-subtitle-accent">Master AI.</span>
          </p>

          <p className="vertice-hero-body-jp">
            30時間以上のAI実践トレーニング。プロが毎日使うツールとワークフローを、自分のペースで学ぶ。
          </p>
          <p className="vertice-hero-body-en">
            30+ hours of practical AI training. Master the tools and workflows professionals use
            every day — at your own pace.
          </p>

          <div className="vertice-hero-pain">
            <p className="vertice-hero-pain-jp">
              ビジネスの上位5%は、すでにAIを日常的に使いこなしています。
              <br />
              あなたの3ヶ月後を、変えるプログラムです。
            </p>
            <p className="vertice-hero-pain-en">
              The top 5% already use AI daily. This is the program that changes where you stand in
              three months.
            </p>
          </div>

          <div className="vertice-hero-ctas">
            <a href="#pricing" onClick={onPrimaryClick} className="vertice-hero-cta-primary">
              <span className="vertice-hero-cta-stack">
                <span className="vertice-hero-cta-jp">Vaultに今すぐアクセス →</span>
                <span className="vertice-hero-cta-en">Get Vault Access</span>
              </span>
            </a>
            <a href="#pricing" onClick={onSecondaryClick} className="vertice-hero-cta-secondary">
              <span className="vertice-hero-cta-stack">
                <span className="vertice-hero-cta-jp">
                  {COHORT.startDateLabel.jp}のライブコホートを見る
                </span>
                <span className="vertice-hero-cta-en">See {COHORT.startDateLabel.en} Live Cohort</span>
              </span>
            </a>
          </div>

          <div className="vertice-hero-stats">
            {stats.map((s) => (
              <div key={s.jp} className="vertice-hero-stat">
                <span className="vertice-hero-stat-icon" aria-hidden="true">
                  {s.ic}
                </span>
                <span className="vertice-hero-stat-text">
                  <span className="vertice-hero-stat-jp">{s.jp}</span>
                  <span className="vertice-hero-stat-en">{s.en}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <HeroMockup />
      </div>

      <FloatingHonu top={120} opacity={0.05} />
    </section>
  );
}

function HeroMockup() {
  const weeks: Array<{ w: string; t: string; done?: boolean; active?: boolean }> = [
    { w: '第1週', t: 'AIの基礎', done: true },
    { w: '第2週', t: 'AIに仕事を', done: true },
    { w: '第3週', t: 'チームで活用', active: true },
    { w: '第4週', t: 'AIツール作成' },
    { w: '第5週', t: 'アクションプラン' },
  ];

  return (
    <div className="vertice-mockup" aria-hidden="true">
      <div className="vertice-mockup-halo" />

      <div className="vertice-vault">
        <div className="vertice-vault-bar">
          <div className="vertice-vault-dots">
            <span className="vertice-vault-dot" style={{ background: '#FF6058' }} />
            <span className="vertice-vault-dot" style={{ background: '#FFBD2E' }} />
            <span className="vertice-vault-dot" style={{ background: '#28CA42' }} />
          </div>
          <div className="vertice-vault-url">vault.honuvibe.ai/ai-essentials</div>
        </div>

        <div className="vertice-vault-grid">
          <div className="vertice-vault-rail">
            <p className="vertice-vault-rail-eyebrow">カリキュラム</p>
            {weeks.map((m) => (
              <div
                key={m.w}
                className={`vertice-vault-week${m.active ? ' vertice-vault-week-active' : ''}`}
              >
                <span className="vertice-vault-week-num">{m.w}</span>
                <span className="vertice-vault-week-title">
                  {m.done && (
                    <span className="vertice-vault-week-check">
                      <IconCheck size={9} />
                    </span>
                  )}
                  {m.t}
                </span>
              </div>
            ))}
          </div>

          <div className="vertice-vault-player">
            <p className="vertice-vault-player-eyebrow">第3週 · Lesson 04</p>
            <p className="vertice-vault-player-title">
              チームでAIを<br />使いこなす
            </p>
            <div className="vertice-vault-player-frame">
              <span className="vertice-vault-player-play">
                <IconPlay size={14} />
              </span>
            </div>
            <div className="vertice-vault-player-progress">
              <div className="vertice-vault-player-progress-fill" />
            </div>
            <div className="vertice-vault-player-meta">
              <span>14:22</span>
              <span>37:50</span>
            </div>
          </div>
        </div>

        <div className="vertice-vault-foot">
          <span className="vertice-vault-foot-eyebrow">PROGRESS</span>
          <span className="vertice-vault-foot-amt">38% complete</span>
        </div>
      </div>

      <div className="vertice-chip vertice-chip-lifetime">
        <span className="vertice-chip-icon" aria-hidden="true">♾️</span>
        <span className="vertice-chip-text">
          <span className="vertice-chip-eyebrow">LIFETIME</span>
          <span className="vertice-chip-title">永久アクセス</span>
        </span>
      </div>

      <div className="vertice-chip vertice-chip-cohort">
        <span className="vertice-chip-pulse" aria-hidden="true" />
        <span className="vertice-chip-text">
          <span className="vertice-chip-eyebrow">{COHORT.startDateLabel.en.toUpperCase()}</span>
          <span className="vertice-chip-title">
            {COHORT.startDateLabel.jp} · 残り{COHORT.seatsLeft}席
          </span>
        </span>
      </div>
    </div>
  );
}

// ——— Contrast (BEFORE / 3 MONTHS / AFTER) ————————————————————————
type ContrastItem = { jp: string; en: string };

const CONTRAST_NOW: ContrastItem[] = [
  {
    jp: 'ChatGPTは使ったことがあるが、業務に活かせていない',
    en: "Used ChatGPT, but can't translate it to actual work",
  },
  {
    jp: 'AIツールが多すぎて、何から始めればいいか分からない',
    en: 'Too many AI tools — no idea where to start',
  },
  {
    jp: '同僚や競合がAIで先行していて、焦りを感じている',
    en: 'Peers and competitors are pulling ahead with AI',
  },
  {
    jp: '学ぶ時間がなく、断片的な情報で終わっている',
    en: 'No time to study — only fragments stick',
  },
];

const CONTRAST_FUTURE: ContrastItem[] = [
  {
    jp: '毎日4つのAIツールを使い分け、業務時間を半減',
    en: 'Switch between 4 AI tools daily, cut work time in half',
  },
  {
    jp: '自分専用のAIアシスタントとワークフローを構築',
    en: 'Build a personal AI assistant and workflow stack',
  },
  {
    jp: 'チームにAI活用法を教えられるレベルに到達',
    en: 'Lead AI adoption inside your team — confidently',
  },
  {
    jp: 'AIで新しい収益機会を見つけ、行動できる',
    en: 'Spot new AI-driven opportunities and act on them',
  },
];

function Contrast() {
  return (
    <section
      id="contrast"
      className="vertice-contrast"
      aria-label="Before and after — three months with Vertice Society"
    >
      <FloatingHonu top={50} opacity={0.05} />
      <div className="vertice-contrast-inner">
        <div className="vertice-contrast-grid">
          <ContrastColumn variant="before" items={CONTRAST_NOW} />
          <ContrastDivider />
          <ContrastColumn variant="after" items={CONTRAST_FUTURE} />
        </div>
      </div>
    </section>
  );
}

function ContrastColumn({
  variant,
  items,
}: {
  variant: 'before' | 'after';
  items: ContrastItem[];
}) {
  const isAfter = variant === 'after';
  return (
    <div className="vertice-contrast-col">
      <p
        className={`vertice-contrast-eyebrow${isAfter ? ' vertice-contrast-eyebrow-after' : ''}`}
      >
        {isAfter ? 'AFTER · 3 MONTHS' : 'BEFORE'}
      </p>
      <h3 className="vertice-contrast-h3">
        {isAfter ? '3ヶ月後のあなた' : '今のあなた'}
      </h3>
      <p className="vertice-contrast-sub">
        {isAfter ? "Where you'll be in 3 months" : 'Where you are now'}
      </p>
      <div className="vertice-contrast-list">
        {items.map((item, i) => (
          <div key={i} className="vertice-contrast-item">
            <div className="vertice-contrast-item-icon">
              {isAfter ? (
                <IconCheck
                  size={14}
                  style={{ color: 'var(--vertice-seafoam)' }}
                />
              ) : (
                <IconX size={14} />
              )}
            </div>
            <div>
              <p className="vertice-contrast-item-jp">{item.jp}</p>
              <p className="vertice-contrast-item-en">{item.en}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContrastDivider() {
  return (
    <div className="vertice-contrast-divider" aria-hidden="true">
      <div className="vertice-contrast-divider-line" />
      <div className="vertice-contrast-divider-orb">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 11h14M13 5l6 6-6 6" />
        </svg>
      </div>
      <p className="vertice-contrast-divider-label">3 MONTHS</p>
      <div className="vertice-contrast-divider-line" />
    </div>
  );
}
// ——— Capabilities (4 cards: TOOLS / AUTOMATE / TEAM / BUILD) ———————————
type CapabilityCardData = {
  tag: string;
  icon: string;
  jpTitle: string;
  enTitle: string;
  jpBody: string;
  enBody: string;
  illus: React.ReactNode;
};

function Capabilities() {
  const cards: CapabilityCardData[] = [
    {
      tag: 'TOOLS',
      icon: '🧰',
      jpTitle: 'AIツールの使い分け',
      enTitle: 'Tool fluency',
      jpBody:
        'ChatGPT、Claude、Perplexity、NotebookLMの実践的な使い分け。それぞれの強みを業務シーンで使いこなす。',
      enBody:
        'Master ChatGPT, Claude, Perplexity, and NotebookLM — and know when to use each.',
      illus: <IllusTools />,
    },
    {
      tag: 'AUTOMATE',
      icon: '⚙️',
      jpTitle: '業務の自動化',
      enTitle: 'Workflow automation',
      jpBody:
        'メール、リサーチ、要約、翻訳をAIに任せる。1日2時間の業務時間を取り戻すワークフロー設計。',
      enBody:
        'Hand email, research, summaries, and translation to AI. Get 2 hours back per day.',
      illus: <IllusAutomate />,
    },
    {
      tag: 'TEAM',
      icon: '👥',
      jpTitle: 'チームでAIを活用',
      enTitle: 'Team AI adoption',
      jpBody:
        '会議準備、フォローアップ、タスク委任のテンプレート。チーム全体の生産性を引き上げる。',
      enBody:
        'Templates for meeting prep, follow-ups, delegation — lift the whole team.',
      illus: <IllusTeam />,
    },
    {
      tag: 'BUILD',
      icon: '🛠️',
      jpTitle: '自分専用AIの構築',
      enTitle: 'Build your AI stack',
      jpBody:
        'パーソナルAIアシスタントとワークフローの設計。自分の業務に最適化された、自分だけのAI環境。',
      enBody:
        'Design a personal AI assistant and workflow tuned to how you actually work.',
      illus: <IllusBuild />,
    },
  ];

  return (
    <section id="capabilities" className="vertice-cap" aria-labelledby="vertice-cap-heading">
      <FloatingHonu top={60} opacity={0.06} />
      <div className="vertice-cap-inner">
        <div className="vertice-cap-head">
          <p className="vertice-cap-eyebrow">What you&apos;ll learn</p>
          <h2 id="vertice-cap-heading" className="vertice-cap-title">
            プロが使うAIを、
            <br />
            <span className="vertice-cap-title-accent">プロのやり方で。</span>
          </h2>
          <p className="vertice-cap-sub">AI the way professionals actually use it.</p>
        </div>
        <div className="vertice-cap-grid">
          {cards.map((c) => (
            <CapabilityCard key={c.tag} card={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityCard({ card }: { card: CapabilityCardData }) {
  return (
    <article className="vertice-cap-card">
      <div className="vertice-cap-card-illus">{card.illus}</div>
      <div className="vertice-cap-card-body">
        <div className="vertice-cap-card-tagrow">
          <div className="vertice-cap-card-icon" aria-hidden="true">
            {card.icon}
          </div>
          <span className="vertice-cap-card-tag">{card.tag}</span>
        </div>
        <h3 className="vertice-cap-card-jp-title">{card.jpTitle}</h3>
        <p className="vertice-cap-card-en-title">{card.enTitle}</p>
        <p className="vertice-cap-card-jp-body">{card.jpBody}</p>
        <p className="vertice-cap-card-en-body">{card.enBody}</p>
      </div>
    </article>
  );
}

// ——— Capability illustrations ———————————————————————————————————

function IllusTools() {
  const tools: Array<{ n: string; c: string; x: number; y: number; r: number }> = [
    { n: 'ChatGPT', c: '#10A37F', x: 14, y: 22, r: -3 },
    { n: 'Claude', c: '#C77B58', x: 130, y: 14, r: 4 },
    { n: 'Perplexity', c: '#1FA095', x: 32, y: 78, r: 2 },
    { n: 'NotebookLM', c: '#4285F4', x: 152, y: 86, r: -3 },
  ];
  return (
    <div className="vertice-illus vertice-illus-tools">
      {tools.map((t) => (
        <div
          key={t.n}
          className="vertice-illus-tools-chip"
          style={{ left: t.x, top: t.y, transform: `rotate(${t.r}deg)` }}
        >
          <div className="vertice-illus-tools-chip-bullet" style={{ background: t.c }}>
            {t.n[0]}
          </div>
          <span className="vertice-illus-tools-chip-name">{t.n}</span>
        </div>
      ))}
      <div className="vertice-illus-pill">
        <IconSpark size={14} style={{ color: 'var(--vertice-seafoam-dark)' }} />
        <span>4ツール使い分け</span>
      </div>
    </div>
  );
}

function IllusAutomate() {
  const nodes = ['📧 メール', '📊 要約', '🌐 翻訳', '📤 送信'];
  const bars = [20, 35, 28, 45, 52, 68, 75];
  return (
    <div className="vertice-illus vertice-illus-automate">
      <div className="vertice-illus-automate-flow">
        {nodes.map((n, i) => (
          <Fragment key={n}>
            <div className="vertice-illus-automate-node">{n}</div>
            {i < nodes.length - 1 && (
              <div className="vertice-illus-automate-arrow" aria-hidden="true">
                <span className="vertice-illus-automate-arrow-head" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <div className="vertice-illus-automate-saved">
        <div className="vertice-illus-automate-saved-row">
          <div>
            <p className="vertice-illus-automate-saved-eyebrow">TIME SAVED · 1日</p>
            <p className="vertice-illus-automate-saved-amt">2h 18min</p>
          </div>
          <div className="vertice-illus-automate-saved-delta">
            ↓54% <span>vs. 先月</span>
          </div>
        </div>
        <div className="vertice-illus-automate-bars">
          {bars.map((h, i) => (
            <div key={i} className="vertice-illus-automate-bar-cell">
              <div style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IllusTeam() {
  const agenda = ['1. Q2業績レビュー', '2. 新規案件の状況', '3. リソース配分'];
  const avatars: Array<{ c: string; l: string }> = [
    { c: '#9B87E0', l: 'M' },
    { c: '#2DBFB0', l: 'K' },
    { c: '#E8B86F', l: 'S' },
    { c: '#5A6B73', l: 'T' },
  ];
  return (
    <div className="vertice-illus vertice-illus-team">
      <div className="vertice-illus-team-card">
        <div className="vertice-illus-team-card-head">
          <div className="vertice-illus-team-card-date">
            <span className="vertice-illus-team-card-date-month">5月</span>
            <span className="vertice-illus-team-card-date-day">15</span>
          </div>
          <div>
            <p className="vertice-illus-team-card-title">四半期会議の準備</p>
            <p className="vertice-illus-team-card-time">10:00 — 11:00</p>
          </div>
        </div>
        <p className="vertice-illus-team-card-eyebrow">AI生成 · 議題</p>
        {agenda.map((line) => (
          <p key={line} className="vertice-illus-team-card-line">
            {line}
          </p>
        ))}
      </div>
      <div className="vertice-illus-team-avatars">
        {avatars.map((a) => (
          <div
            key={a.l}
            className="vertice-illus-team-avatar"
            style={{ background: a.c }}
          >
            {a.l}
          </div>
        ))}
      </div>
      <div className="vertice-illus-pill vertice-illus-pill-tr">
        <IconSpark size={14} style={{ color: 'var(--vertice-lavender-dark)' }} />
        <span>準備時間 -80%</span>
      </div>
    </div>
  );
}

function IllusBuild() {
  const layers: Array<{ l: string; c: string; j: string; tc: string }> = [
    { l: 'YOUR AI', c: 'var(--vertice-navy)', j: '自分専用アシスタント', tc: '#fff' },
    { l: 'WORKFLOWS', c: '#E8B86F', j: 'メール・要約・リサーチ', tc: 'var(--vertice-navy)' },
    { l: 'PROMPTS', c: 'var(--vertice-seafoam)', j: '50+ プロンプトライブラリ', tc: '#fff' },
    { l: 'TOOLS', c: 'var(--vertice-lavender)', j: 'ChatGPT · Claude · Perplexity', tc: '#fff' },
  ];
  return (
    <div className="vertice-illus vertice-illus-build">
      <div className="vertice-illus-build-stack">
        {layers.map((b) => (
          <div
            key={b.l}
            className="vertice-illus-build-layer"
            style={{ background: b.c, color: b.tc }}
          >
            <span className="vertice-illus-build-layer-l">{b.l}</span>
            <span className="vertice-illus-build-layer-j">{b.j}</span>
          </div>
        ))}
      </div>
      <div className="vertice-illus-pill">
        <span aria-hidden="true">🛠️</span>
        <span>4層スタック</span>
      </div>
    </div>
  );
}
// ——— Curriculum (5-week dark sticky-rail) ————————————————————————
type CurriculumWeek = {
  n: number;
  jp: string;
  en: string;
  d: string;
  dur: string;
};

const CURRICULUM_WEEKS: CurriculumWeek[] = [
  {
    n: 1,
    jp: 'AIの基礎を知る',
    en: 'AI Foundations',
    d: 'なぜ今AIが重要なのか、プロが使うトップ10ツールをハンズオンで体験。基礎概念から始めて、実務に直結する全体像を掴む。',
    dur: '約6時間 / ~6 hrs',
  },
  {
    n: 2,
    jp: 'AIに仕事をさせる',
    en: 'Put AI to Work',
    d: '文書要約、リサーチ、翻訳のテクニック。AIの限界とハルシネーション対策を学び、業務に安心して導入できる状態に。',
    dur: '約6時間 / ~6 hrs',
  },
  {
    n: 3,
    jp: 'チームでAIを活用する',
    en: 'AI for Teams',
    d: '2人以上のチーム向けAIコミュニケーション、会議準備、AIへのタスク委任。チーム全体の生産性を引き上げるパターン集。',
    dur: '約6時間 / ~6 hrs',
  },
  {
    n: 4,
    jp: 'はじめてのAIツールを作る',
    en: 'Build Your First AI Tool',
    d: 'パーソナルAIワークフロー設計、AIアシスタントのカスタマイズ。コードなしで自分専用のAIを構築。',
    dur: '約6時間 / ~6 hrs',
  },
  {
    n: 5,
    jp: '自分のAIアクションプラン',
    en: 'Your AI Action Plan',
    d: 'パーソナルAIロードマップ、3ツール×3ワークフロー×3目標。修了後3ヶ月の行動計画を持ち帰る。',
    dur: '約6時間 / ~6 hrs · 修了証',
  },
];

const CURRICULUM_CHIPS: Array<{ jp: string; en: string }> = [
  { jp: '自分のペース', en: 'Self-paced' },
  { jp: '日本語サポート', en: 'JP support' },
  { jp: '永久アクセス', en: 'Lifetime' },
  { jp: '修了証', en: 'Certificate' },
];

function Curriculum() {
  return (
    <section
      id="curriculum"
      className="vertice-curr"
      aria-labelledby="vertice-curr-heading"
    >
      <div className="vertice-curr-glow vertice-curr-glow-seafoam" aria-hidden="true" />
      <div className="vertice-curr-glow vertice-curr-glow-lavender" aria-hidden="true" />

      <div className="vertice-curr-inner">
        <div className="vertice-curr-grid">
          <div className="vertice-curr-rail">
            <p className="vertice-curr-eyebrow">The curriculum</p>
            <h2 id="vertice-curr-heading" className="vertice-curr-title">
              5週間。
              <br />
              <span className="vertice-curr-title-accent">プロのためのカリキュラム。</span>
            </h2>
            <p className="vertice-curr-sub">5 weeks. Built for professionals.</p>
            <p className="vertice-curr-body-jp">
              自分のペースで学べる。コホートで学べば、さらに深く。
            </p>
            <p className="vertice-curr-body-en">
              Self-paced. Or go deeper with a live cohort.
            </p>
            <div className="vertice-curr-chips">
              {CURRICULUM_CHIPS.map((c) => (
                <span key={c.en} className="vertice-curr-chip">
                  <span className="vertice-curr-chip-jp">{c.jp}</span>
                  <span className="vertice-curr-chip-en">{c.en}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="vertice-curr-list">
            {CURRICULUM_WEEKS.map((w) => (
              <WeekRow key={w.n} w={w} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeekRow({ w }: { w: CurriculumWeek }) {
  return (
    <div className="vertice-week">
      <div className="vertice-week-num">{w.n}</div>
      <div className="vertice-week-body">
        <div className="vertice-week-headline">
          <h3 className="vertice-week-title">{w.jp}</h3>
          <span className="vertice-week-en">{w.en}</span>
        </div>
        <p className="vertice-week-desc">{w.d}</p>
        <span className="vertice-week-dur">
          <IconPlay size={9} /> {w.dur}
        </span>
      </div>
      <span className="vertice-week-arrow" aria-hidden="true">
        <IconArrow size={16} />
      </span>
    </div>
  );
}
// ——— Vault preview (6 gradient cards) ——————————————————————————
type VaultItem = {
  tag: 'TEMPLATE' | 'PROMPT' | 'WORKFLOW' | 'WALKTHROUGH' | 'GUIDE';
  jp: string;
  en: string;
  g: string;
  img: string;
};

const VAULT_ITEMS: VaultItem[] = [
  {
    tag: 'TEMPLATE',
    jp: 'ビジネスメールAIテンプレート',
    en: 'Business email templates',
    g: 'linear-gradient(135deg, #d4c8f0, #9b8fcf)',
    img: '/images/vault-preview/business-email-templates.webp',
  },
  {
    tag: 'PROMPT',
    jp: 'Claude プロンプト集 50選',
    en: '50 Claude prompts',
    g: 'linear-gradient(135deg, #c8e8df, #6ec3b3)',
    img: '/images/vault-preview/claude-prompts-50.webp',
  },
  {
    tag: 'WORKFLOW',
    jp: 'リサーチ自動化フロー',
    en: 'Research automation',
    g: 'linear-gradient(135deg, #f0d8c8, #d8a182)',
    img: '/images/vault-preview/research-automation.webp',
  },
  {
    tag: 'WALKTHROUGH',
    jp: 'ChatGPTツアー（90分）',
    en: 'ChatGPT walkthrough',
    g: 'linear-gradient(135deg, #d0deef, #8fa8c8)',
    img: '/images/vault-preview/chatgpt-walkthrough.webp',
  },
  {
    tag: 'PROMPT',
    jp: '会議要約プロンプト',
    en: 'Meeting summary prompts',
    g: 'linear-gradient(135deg, #f5d6df, #db9aae)',
    img: '/images/vault-preview/meeting-summary-prompts.webp',
  },
  {
    tag: 'GUIDE',
    jp: 'AI業務委任ガイド',
    en: 'Delegating to AI guide',
    g: 'linear-gradient(135deg, #f5ebd0, #d8b878)',
    img: '/images/vault-preview/ai-delegation-guide.webp',
  },
];

function VaultPreview() {
  return (
    <section id="vault" className="vertice-vaultp" aria-labelledby="vertice-vaultp-heading">
      <FloatingHonu top={70} opacity={0.05} />
      <div className="vertice-vaultp-inner">
        <div className="vertice-vaultp-head">
          <div className="vertice-vaultp-head-copy">
            <p className="vertice-vaultp-eyebrow">The Vault — exclusive resources</p>
            <h2 id="vertice-vaultp-heading" className="vertice-vaultp-title">
              Vaultの中身を
              <br />
              <span className="vertice-vaultp-title-accent">ちょっとだけ。</span>
            </h2>
            <p className="vertice-vaultp-sub">A peek inside the Vault.</p>
            <p className="vertice-vaultp-body">
              40本以上の動画、テンプレート、プロンプトライブラリ。
              <span className="vertice-vaultp-body-en">
                40+ videos, templates, and a prompt library.
              </span>
            </p>
          </div>
          <a href="#vault" className="vertice-vaultp-browse">
            Browse all resources <IconArrow size={16} />
          </a>
        </div>

        <div className="vertice-vaultp-grid">
          {VAULT_ITEMS.map((item, i) => (
            <article key={`${item.tag}-${i}`} className="vertice-vaultp-card">
              <div className="vertice-vaultp-card-art" style={{ background: item.g }}>
                <Image
                  src={item.img}
                  alt=""
                  fill
                  sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 33vw"
                  className="vertice-vaultp-card-img"
                />
                <span className="vertice-vaultp-card-tag">{item.tag}</span>
              </div>
              <div className="vertice-vaultp-card-body">
                <p className="vertice-vaultp-card-jp">{item.jp}</p>
                <p className="vertice-vaultp-card-en">{item.en}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
// ——— Pricing (3 tiers: Community / Vault highlighted / Live Cohort) ———
type PriceFeature = { jp: string; en: string; bold?: boolean };

type PriceCardProps = {
  tier: 'community' | 'vault' | 'cohort';
  highlighted?: boolean;
  badge?: React.ReactNode;
  badgeVariant?: 'default' | 'cohort';
  jpName: string;
  enName: string;
  jpTagline: string;
  enTagline: string;
  price: React.ReactNode;
  sub: React.ReactNode;
  features: PriceFeature[];
  ctaJp: string;
  ctaEn: string;
};

// All 3 CTAs route to the placeholder until Stripe products exist (Vault $199 +
// Community ¥2,800/mo are not yet created; Live Cohort wiring waits on the same
// follow-up). Master plan, "Stripe products to create" section.
const PRICING_CTA_HREF = '/partners/vertice-society/coming-soon';

function Pricing() {
  const onCardCta = (tier: PriceCardProps['tier']) =>
    trackEvent('partner_cta_click', {
      partner: PARTNER_SLUG,
      location: 'pricing',
      tier,
    });

  return (
    <section id="pricing" className="vertice-pr" aria-labelledby="vertice-pr-heading">
      <div className="vertice-pr-inner">
        <div className="vertice-pr-head">
          <p className="vertice-pr-eyebrow">Pricing</p>
          <h2 id="vertice-pr-heading" className="vertice-pr-title">
            あなたに合う、
            <span className="vertice-pr-title-accent">学び方を選ぶ。</span>
          </h2>
          <p className="vertice-pr-sub">Choose how you learn.</p>
          <p className="vertice-pr-body">
            自分のペースで学ぶ。コミュニティで深める。ライブで仕上げる。
            <span className="vertice-pr-body-en">
              Learn at your pace. Go deeper in community. Master it live.
            </span>
          </p>
        </div>

        <div className="vertice-pr-grid">
          <PriceCard
            tier="community"
            jpName="Honu Community"
            enName="Online Community"
            jpTagline="学び続ける場所"
            enTagline="The place to keep learning"
            price={
              <>
                <span className="vertice-pr-price-amt">¥2,800</span>
                <span className="vertice-pr-price-suffix">/月</span>
              </>
            }
            sub="≈ $19/mo · 年額 ¥19,000"
            features={[
              { jp: '月次ライブQ&A', en: 'Monthly live Q&A' },
              { jp: '新しいプロンプト・ツール紹介', en: 'New prompts & tools weekly' },
              { jp: 'ESLコンパニオン（バイリンガル）', en: 'ESL companion (bilingual)' },
              { jp: 'メンバー限定リソース', en: 'Member-only resources' },
              { jp: 'キャンセルいつでも可', en: 'Cancel anytime' },
            ]}
            ctaJp="コミュニティに参加する"
            ctaEn="Join the Community"
          />

          <PriceCard
            tier="vault"
            highlighted
            badge="おすすめ / RECOMMENDED"
            jpName="AI Essentials Vault"
            enName="Self-paced Vault"
            jpTagline="自分のペースで、AIをマスターする"
            enTagline="Master AI at your own pace"
            price={
              <>
                <span className="vertice-pr-price-strike">$299</span>
                <span className="vertice-pr-price-amt vertice-pr-price-amt-lg">$199</span>
                <span className="vertice-pr-price-suffix">(¥29,800)</span>
              </>
            }
            sub={
              <>
                <span className="vertice-pr-sub-highlight">
                  創立メンバー価格 / Founding Member Price
                </span>
                <br />
                <span>最初の100名限定 · 残り37名</span>
              </>
            }
            features={[
              { jp: '30時間以上の実践トレーニング', en: '30+ hours practical training' },
              { jp: '40本以上のビデオレッスン', en: '40+ video lessons' },
              { jp: '全テンプレート・プロンプト集', en: 'All templates & prompts' },
              {
                jp: '永久アクセス（買い切り）',
                en: 'Lifetime access · one-time payment',
                bold: true,
              },
              { jp: 'Honu Community 1ヶ月無料', en: '1 month Community free' },
              { jp: '修了証', en: 'Certificate of completion' },
            ]}
            ctaJp="Vaultにアクセスする"
            ctaEn="Get Vault Access"
          />

          <PriceCard
            tier="cohort"
            badgeVariant="cohort"
            badge={
              <>
                <span className="vertice-pr-badge-pulse" aria-hidden="true" />
                {COHORT.startDateLabel.jp} · 残り{COHORT.seatsLeft}席
              </>
            }
            jpName="ライブコホート"
            enName="Live Cohort"
            jpTagline="講師と一緒に、深く学ぶ"
            enTagline="Go deeper with live instructors"
            price={
              <>
                <span className="vertice-pr-price-amt">$1,250</span>
                <span className="vertice-pr-price-suffix">(¥187,500)</span>
              </>
            }
            sub={`${COHORT.startDateLabel.jp} · ${COHORT.startDateLabel.en}`}
            features={[
              { jp: 'Vault の全コンテンツ込み', en: 'Includes everything in Vault' },
              {
                jp: '5回のライブZoomセッション（各60分）',
                en: '5 live Zoom sessions (60min each)',
              },
              { jp: '少人数制（最大15名）', en: 'Small group (max 15)' },
              {
                jp: 'インストラクターからの直接フィードバック',
                en: 'Direct instructor feedback',
              },
              { jp: '30日間のコホート専用コミュニティ', en: '30-day cohort community' },
              { jp: '認定修了証', en: 'Verified certificate' },
            ]}
            ctaJp="ライブコホートに申し込む"
            ctaEn="Apply for Live Cohort"
          />
        </div>

        <p className="vertice-pr-guarantee">
          すべてのプランに30日間返金保証
          <span className="vertice-pr-guarantee-en">
            · 30-day money-back guarantee on all plans
          </span>
        </p>
      </div>
    </section>
  );

  function PriceCard(props: PriceCardProps) {
    const {
      tier,
      highlighted,
      badge,
      badgeVariant = 'default',
      jpName,
      enName,
      jpTagline,
      enTagline,
      price,
      sub,
      features,
      ctaJp,
      ctaEn,
    } = props;

    return (
      <div
        className={`vertice-pr-card${highlighted ? ' vertice-pr-card-highlighted' : ''}`}
      >
        {badge && (
          <div
            className={`vertice-pr-badge-wrap${highlighted ? ' vertice-pr-badge-wrap-floating' : ''}`}
          >
            <span
              className={`vertice-pr-badge vertice-pr-badge-${highlighted ? 'highlighted' : badgeVariant}`}
            >
              {badge}
            </span>
          </div>
        )}

        <div className="vertice-pr-card-name">
          <h3 className="vertice-pr-card-jp-name">{jpName}</h3>
          <p className="vertice-pr-card-en-name">{enName}</p>
        </div>

        <div className="vertice-pr-card-tag">
          <p className="vertice-pr-card-jp-tag">{jpTagline}</p>
          <p className="vertice-pr-card-en-tag">{enTagline}</p>
        </div>

        <div className="vertice-pr-card-price-wrap">
          <div className="vertice-pr-card-price">{price}</div>
          <p className="vertice-pr-card-price-sub">{sub}</p>
        </div>

        <div className="vertice-pr-card-features">
          {features.map((f, i) => (
            <div key={i} className="vertice-pr-feature">
              <div className="vertice-pr-feature-icon">
                <IconCheck
                  size={14}
                  style={{
                    color: highlighted
                      ? 'var(--vertice-seafoam)'
                      : tier === 'cohort'
                        ? 'var(--vertice-lavender)'
                        : 'var(--vertice-lavender)',
                  }}
                />
              </div>
              <div>
                <p
                  className={`vertice-pr-feature-jp${f.bold ? ' vertice-pr-feature-jp-bold' : ''}`}
                >
                  {f.jp}
                </p>
                <p className="vertice-pr-feature-en">{f.en}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href={PRICING_CTA_HREF}
          onClick={() => onCardCta(tier)}
          className={`vertice-pr-cta${highlighted ? ' vertice-pr-cta-highlighted' : ''}`}
        >
          <span className="vertice-pr-cta-jp">{ctaJp} →</span>
          <span className="vertice-pr-cta-en">{ctaEn}</span>
        </a>
      </div>
    );
  }
}
// ——— Instructors (3 cards w/ photo swap) ————————————————————————
type Instructor = {
  name: string;
  photo: string;
  jpRole: string;
  enRole: string;
  creds: string;
  bio: string;
};

const INSTRUCTORS: Instructor[] = [
  {
    name: 'Ryan Jackson',
    photo: '/images/partners/instructors/ryan.webp',
    jpRole: 'AI教育ディレクター',
    enRole: 'AI Education Director',
    creds: 'MBA, USC Marshall · Northwestern BS',
    bio: 'バイリンガルのAI実践者として、米国のAI最前線と日本のビジネス現場をつなぐ。プロが本当に使うAIワークフローを、誰でも理解できる形で伝える。',
  },
  {
    name: 'Mizuho H.',
    photo: '/images/partners/instructors/mizuho.webp',
    jpRole: 'リードAIトレーナー',
    enRole: 'Lead AI Trainer',
    creds: '企業ビジネス経験 · ネイティブ日本語',
    bio: '日本企業での実務経験と、最先端のAI活用法を統合。日本のビジネス文脈に合わせて、AIの使い方を翻訳・再設計するエキスパート。',
  },
  {
    name: 'Chiemi M.',
    photo: '/images/partners/instructors/chimi.webp',
    jpRole: 'AIコンサルタント・トレーナー',
    enRole: 'AI Consultant & Trainer',
    creds: '認定作業療法士 · ビジネスオペレーション',
    bio: '実践的で忍耐強い指導スタイル。AIに不安を感じる初心者でも、最初の一歩を確実に踏み出せるよう寄り添う。',
  },
];

function Instructors() {
  return (
    <section
      id="instructors"
      className="vertice-inst"
      aria-labelledby="vertice-inst-heading"
    >
      <FloatingHonu top={60} opacity={0.05} />
      <div className="vertice-inst-inner">
        <div className="vertice-inst-head">
          <p className="vertice-inst-eyebrow">Your instructors</p>
          <h2 id="vertice-inst-heading" className="vertice-inst-title">
            教えるのは、
            <span className="vertice-inst-title-accent">実践しているプロ。</span>
          </h2>
          <p className="vertice-inst-sub">Taught by people who actually use this.</p>
        </div>

        <div className="vertice-inst-grid">
          {INSTRUCTORS.map((p) => (
            <article key={p.name} className="vertice-inst-card">
              <div className="vertice-inst-photo-frame">
                <Image
                  src={p.photo}
                  alt={p.name}
                  width={78}
                  height={78}
                  className="vertice-inst-photo"
                />
              </div>
              <h3 className="vertice-inst-name">{p.name}</h3>
              <p className="vertice-inst-jp-role">{p.jpRole}</p>
              <p className="vertice-inst-en-role">{p.enRole}</p>
              <div className="vertice-inst-creds">
                <p>{p.creds}</p>
              </div>
              <p className="vertice-inst-bio">{p.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
// ——— FAQ (9 items, single-open accordion, default-open first) ————————
type FAQItem = { q: string; qen: string; a: string };

const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'Vaultとライブコホートの違いは？',
    qen: "What's the difference between the Vault and the Live Cohort?",
    a: 'Vaultは自分のペースで学ぶ買い切り型のオンライン教材です。ライブコホートはVaultの全コンテンツに加え、5回のライブセッション、少人数制の指導、インストラクターからの直接フィードバックを含みます。ライブコホートは年に4回のみ開講します。',
  },
  {
    q: '英語が苦手でも大丈夫ですか？',
    qen: "I'm not strong in English — is that okay?",
    a: '全てのコンテンツが日本語と英語の両方で提供されます。ビデオには日本語字幕、テンプレートとプロンプトは両言語で用意。ESLコンパニオンガイドで、AI時代に必要な英語スキルも自然に身につきます。',
  },
  {
    q: 'どのくらいの時間が必要ですか？',
    qen: 'How much time will this take?',
    a: '推奨ペースは週6時間 × 5週間 = 約30時間です。多忙な方は週2〜3時間で3ヶ月かけて進めることも可能。永久アクセスなので、ご自身の都合に合わせて学べます。',
  },
  {
    q: '返金保証はありますか？',
    qen: 'Is there a refund guarantee?',
    a: '全てのプランに30日間の返金保証が付きます。理由を問わず、購入から30日以内のご連絡で全額返金いたします。',
  },
  {
    q: '修了証は履歴書に書けますか？',
    qen: 'Can I list the certificate on my resume?',
    a: 'はい。HonuVibe.AI × Vertice Society 共同発行の修了証は、LinkedIn、履歴書、社内研修記録に記載できます。ライブコホート修了者には認定修了証が発行されます。',
  },
  {
    q: 'AIツールの料金は別途必要ですか？',
    qen: 'Do I need to pay for AI tools separately?',
    a: '無料プランで学習可能ですが、ChatGPT Plus（月$20）またはClaude Pro（月$20）の導入を推奨します。コース内で無料／有料プランの選び方も解説します。',
  },
  {
    q: '法人での申込は可能ですか？',
    qen: 'Can my company purchase this for our team?',
    a: 'はい。5名以上のチーム向けには、法人プランと専用オンボーディングをご用意しています。hello@honuvibe.ai までお問い合わせください。',
  },
  {
    q: 'Vertice Society以外のメンバーも参加できますか？',
    qen: 'Can non-Vertice members join?',
    a: '本プログラムはVertice Societyメンバー限定で、創立メンバー価格はメンバーのみ適用されます。一般向けは2026年後半に公開予定です。',
  },
  {
    q: '質問があるときはどうすれば？',
    qen: 'How do I ask questions?',
    a: 'Honu Communityでいつでも質問できます。コホート参加者は専用チャンネルでインストラクターに直接質問可能。一般のお問い合わせは hello@honuvibe.ai までどうぞ。',
  },
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="vertice-faq" aria-labelledby="vertice-faq-heading">
      <FloatingHonu top={60} opacity={0.05} />
      <div className="vertice-faq-inner">
        <div className="vertice-faq-head">
          <p className="vertice-faq-eyebrow">FAQ</p>
          <h2 id="vertice-faq-heading" className="vertice-faq-title">
            よくある質問 /{' '}
            <span className="vertice-faq-title-accent">Questions, answered.</span>
          </h2>
        </div>
        <div className="vertice-faq-list">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `vertice-faq-panel-${i}`;
            const buttonId = `vertice-faq-button-${i}`;
            return (
              <div
                key={i}
                className={`vertice-faq-item${isOpen ? ' vertice-faq-item-open' : ''}`}
              >
                <button
                  id={buttonId}
                  className="vertice-faq-button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <div className="vertice-faq-button-text">
                    <p className="vertice-faq-q">{item.q}</p>
                    <p className="vertice-faq-qen">{item.qen}</p>
                  </div>
                  <span
                    className={`vertice-faq-chevron${isOpen ? ' vertice-faq-chevron-open' : ''}`}
                    aria-hidden="true"
                  >
                    <IconChevron size={16} />
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="vertice-faq-panel"
                  hidden={!isOpen}
                >
                  <p className="vertice-faq-answer">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
// ——— Operating Company (5-row info table) ————————————————————————
const OPERATING_ROWS: Array<{ jp: string; en: string; v: string }> = [
  { jp: '会社名', en: 'Company', v: 'HonuVibe.AI' },
  { jp: '所在地', en: 'Location', v: 'HonuHub Waikiki, Hawaii, USA' },
  { jp: 'パートナー', en: 'Partner', v: 'Vertice Society (Tokyo)' },
  { jp: 'プログラム', en: 'Program', v: 'AI Essentials — Vertice Society 推奨プログラム' },
  { jp: 'お問い合わせ', en: 'Contact', v: 'hello@honuvibe.ai' },
];

function OperatingCompany() {
  return (
    <section
      id="operating-company"
      className="vertice-op"
      aria-labelledby="vertice-op-heading"
    >
      <div className="vertice-op-inner">
        <div className="vertice-op-head">
          <h3 id="vertice-op-heading" className="vertice-op-title">
            運営会社
          </h3>
          <span className="vertice-op-title-en">Operating Company</span>
        </div>
        <dl className="vertice-op-table">
          {OPERATING_ROWS.map((r) => (
            <div key={r.en} className="vertice-op-row">
              <dt className="vertice-op-label">
                <p className="vertice-op-label-jp">{r.jp}</p>
                <p className="vertice-op-label-en">{r.en}</p>
              </dt>
              <dd className="vertice-op-value">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
// ——— Final CTA (purple/lavender gradient + newsletter form) ——————————
function FinalCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'vertice_partner_landing' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Subscription failed');
      }
      setStatus('success');
      trackEvent('newsletter_signup', {
        partner: PARTNER_SLUG,
        source: 'vertice_partner_landing',
      });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Subscription failed');
    }
  };

  return (
    <section id="final-cta" className="vertice-cta" aria-labelledby="vertice-cta-heading">
      <div className="vertice-cta-panel">
        <svg
          className="vertice-cta-rings"
          viewBox="0 0 380 380"
          aria-hidden="true"
          preserveAspectRatio="xMaxYMin meet"
        >
          <circle cx="190" cy="190" r="100" stroke="#fff" strokeWidth="1" fill="none" />
          <circle cx="190" cy="190" r="140" stroke="#fff" strokeWidth="1" fill="none" />
          <circle cx="190" cy="190" r="180" stroke="#fff" strokeWidth="1" fill="none" />
        </svg>
        <div className="vertice-cta-watermark" aria-hidden="true">
          <HonuMark size={160} style={{ color: '#fff' }} />
        </div>

        <div className="vertice-cta-content">
          <p className="vertice-cta-eyebrow">Vertice Society × HonuVibe.AI</p>
          <h2 id="vertice-cta-heading" className="vertice-cta-title">
            3ヶ月後の自分に、
            <br />
            <span className="vertice-cta-title-accent">今、投資する。</span>
          </h2>
          <p className="vertice-cta-sub">Invest in who you&apos;ll be in three months.</p>

          <p className="vertice-cta-body-jp">
            Vaultは <strong>$199の創立メンバー価格</strong>でアクセス可能。次のライブコホートは
            {COHORT.startDateLabel.jp}。
          </p>
          <p className="vertice-cta-body-en">
            Vault available at the $199 Founding Member price. Next live cohort{' '}
            {COHORT.startDateLabel.en.toLowerCase()}.
          </p>

          <form className="vertice-cta-form" onSubmit={onSubmit} noValidate>
            <label htmlFor="vertice-cta-email" className="sr-only">
              Email address
            </label>
            <input
              id="vertice-cta-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={status === 'success'}
              className="vertice-cta-input"
            />
            <button
              type="submit"
              className="vertice-cta-submit"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'success' ? (
                <>
                  <span className="vertice-cta-submit-jp">
                    <IconCheck size={14} /> 受け取りました
                  </span>
                  <span className="vertice-cta-submit-en">Check your inbox</span>
                </>
              ) : status === 'loading' ? (
                <span className="vertice-cta-submit-jp">送信中…</span>
              ) : (
                <>
                  <span className="vertice-cta-submit-jp">今すぐ始める →</span>
                  <span className="vertice-cta-submit-en">Get Started</span>
                </>
              )}
            </button>
          </form>

          {status === 'error' && (
            <div role="alert" className="vertice-cta-error">
              {errorMsg}
            </div>
          )}

          <p className="vertice-cta-fineprint">
            Vertice Societyメンバー限定 · 30日間返金保証
            <span className="vertice-cta-fineprint-en">
              · Vertice Society members only · 30-day guarantee
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
// ——— Footer (dark co-brand, JP+EN paired link grid) ———————————————
const FOOTER_LINKS: Array<{ jp: string; en: string; href: string }> = [
  { jp: '探検する', en: 'Explore', href: '/explore' },
  { jp: 'ビルド', en: 'Build', href: '/honuhub' },
  { jp: '学ぶ', en: 'Learn', href: '/learn' },
  { jp: '概要', en: 'About', href: '/about' },
  { jp: 'パートナー', en: 'Partners', href: '/partners' },
  { jp: 'お問い合わせ', en: 'Contact', href: '/contact' },
];

function VerticeFooter() {
  return (
    <footer className="vertice-footer">
      <div className="vertice-footer-inner">
        <div className="vertice-footer-top">
          <div className="vertice-footer-brand">
            <span className="vertice-footer-cobrand">
              <span className="vertice-footer-vertice">VERTICE</span>
              <span className="vertice-footer-x" aria-hidden="true">
                ×
              </span>
              <span className="vertice-footer-honu">
                HonuVibe<span className="vertice-footer-tld">.AI</span>
              </span>
            </span>
            <p className="vertice-footer-desc">
              ハワイ発のAI教育プラットフォーム。日本のビジネスプロフェッショナルのための、実践的なAIトレーニング。
            </p>
          </div>
          <nav className="vertice-footer-links" aria-label="Footer">
            {FOOTER_LINKS.map((l) => (
              <a key={l.en} href={l.href} className="vertice-footer-link">
                <span className="vertice-footer-link-jp">{l.jp}</span>
                <span className="vertice-footer-link-en">{l.en}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="vertice-footer-bottom">
          <p className="vertice-footer-copy">
            © {new Date().getFullYear()} Vertice Society × HonuVibe.AI · All rights reserved.
          </p>
          <p className="vertice-footer-aloha">
            <HonuMark size={16} style={{ color: '#fff' }} /> Made in Hawaii with Aloha
          </p>
        </div>
      </div>
    </footer>
  );
}
