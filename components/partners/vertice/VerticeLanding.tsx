'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

import './vertice.css';
import {
  FloatingHonu,
  HonuMark,
  IconArrow,
  IconCheck,
  IconChevron,
  IconSpark,
  IconWave,
  IconX,
} from './icons';

interface Props {
  locale: string;
}

const PARTNER_SLUG = 'vertice-society';

const COHORT = {
  startDate: '2026-05-23',
  startDateLabel: { jp: '5/23開講', en: 'Starts May 23' },
  seatsLeft: 15,
};

const HERO_OUTCOMES: Array<{ jp: string; en: string }> = [
  { jp: '自分専用のAIワークフローを構築', en: 'Build your own AI workflow stack' },
  { jp: '業務時間を週10時間以上削減', en: 'Reclaim 10+ hours per week' },
  { jp: 'ポートフォリオに残るAIプロジェクト1本', en: 'Ship one portfolio-ready AI project' },
];

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
      <TaughtBy />
      <Contrast />
      <QualifierStrip />
      <Capabilities />
      <Curriculum />
      <LearningFormats />
      <VaultPreview />
      <Testimonials />
      <Pricing />
      <Instructors />
      <FAQ />
      <OperatingCompany />
      <FinalCTA />
      <VerticeFooter />
      <MobileStickyCTA />
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

          <div className="vertice-hero-outcomes" aria-label="What you'll ship in 5 weeks">
            <p className="vertice-hero-outcomes-label">
              <span className="vertice-hero-outcomes-label-jp">5週間で身につくこと</span>
              <span className="vertice-hero-outcomes-label-en">What you&apos;ll ship in 5 weeks</span>
            </p>
            <ul className="vertice-hero-outcomes-list">
              {HERO_OUTCOMES.map((o) => (
                <li key={o.en} className="vertice-hero-outcomes-item">
                  <span className="vertice-hero-outcomes-icon" aria-hidden="true">
                    <IconCheck size={11} />
                  </span>
                  <span className="vertice-hero-outcomes-text">
                    <span className="vertice-hero-outcomes-jp">{o.jp}</span>
                    <span className="vertice-hero-outcomes-en">{o.en}</span>
                  </span>
                </li>
              ))}
            </ul>
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
                  Vault + ライブ指導 · {COHORT.startDateLabel.jp}コホート
                </span>
                <span className="vertice-hero-cta-en">
                  Vault + Live Coaching · {COHORT.startDateLabel.en} Cohort
                </span>
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

const VAULT_WEEKS: Array<{ w: string; t: string; done?: boolean; active?: boolean }> = [
  { w: '第1週', t: 'AIの基礎', done: true },
  { w: '第2週', t: 'AIに仕事を', done: true },
  { w: '第3週', t: 'チームで活用', active: true },
  { w: '第4週', t: 'AIツール作成' },
  { w: '第5週', t: 'アクションプラン' },
];

type FrameworkCard = {
  jp: string;
  en: string;
  desc: string;
  Icon: typeof IconArrow;
};

const VAULT_FRAMEWORKS: FrameworkCard[] = [
  {
    jp: '完全委任',
    en: 'Full handoff',
    desc: '低リスクな定型業務はAIに最後までやらせる。',
    Icon: IconArrow,
  },
  {
    jp: '検証付き',
    en: 'With check',
    desc: '重要な意思決定は出力をチームでレビューしてから使う。',
    Icon: IconCheck,
  },
  {
    jp: '反復改善',
    en: 'Iterate',
    desc: '一発で諦めない。プロンプトを2〜3回磨き込む。',
    Icon: IconWave,
  },
];

const VAULT_CHECKLIST: string[] = [
  '依頼に「目的・参加者・論点」を含めたか',
  'AIに前提情報を渡したか（人物・期限・制約）',
  '出力をそのまま使わず、必ず一度レビューしたか',
];

function HeroMockup() {
  return (
    <div className="vertice-mockup-stage" aria-hidden="true">
      <div className="vertice-mockup">
      <div className="vertice-mockup-halo" />

      <svg
        className="vertice-mockup-elevation"
        viewBox="0 0 520 880"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M -20 820 Q 220 380 560 120"
          stroke="rgba(155, 135, 224, 0.18)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M -20 860 Q 240 490 560 210"
          stroke="rgba(155, 135, 224, 0.12)"
          strokeWidth="1.25"
          fill="none"
        />
        <path
          d="M -20 900 Q 260 600 560 300"
          stroke="rgba(45, 191, 176, 0.10)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

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
            {VAULT_WEEKS.map((m) => (
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
            <p className="vertice-vault-player-eyebrow">第3週 · LESSON 04</p>
            <p className="vertice-vault-player-title">
              チームでAIを<br />使いこなす
            </p>
            <p className="vertice-vault-player-lead">
              AIに「やっておいて」だけでは結果は薄い。プロが日常的に使うのは、
              <em>目的・参加者・論点</em>
              の3つを必ず渡す依頼方法。タスクごとに「どこまでAIに任せ、どこから人がチェックするか」を決めれば、
              チーム全員の生産性が一段上がる。
            </p>

            <p className="vertice-vault-h3">3つの委任パターン</p>
            <ol className="vertice-vault-rules">
              {VAULT_FRAMEWORKS.map(({ jp, en, desc }, i) => (
                <li key={en} className="vertice-vault-rule">
                  <span className="vertice-vault-rule-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="vertice-vault-rule-body">
                    <span className="vertice-vault-rule-name">
                      <span className="vertice-vault-rule-jp">{jp}</span>
                      <span className="vertice-vault-rule-en">{en}</span>
                    </span>
                    <span className="vertice-vault-rule-desc">{desc}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="vertice-vault-h3">プロンプト例 — 会議準備</p>
            <div className="vertice-vault-example">
              <div className="vertice-vault-example-row vertice-vault-example-row-bad">
                <span className="vertice-vault-example-mark" aria-hidden="true">
                  <IconX size={10} />
                </span>
                <div className="vertice-vault-example-body">
                  <code className="vertice-vault-example-prompt">「会議準備して」</code>
                  <span className="vertice-vault-example-out">一般論しか出ない</span>
                </div>
              </div>
              <div className="vertice-vault-example-row vertice-vault-example-row-good">
                <span className="vertice-vault-example-mark" aria-hidden="true">
                  <IconCheck size={10} />
                </span>
                <div className="vertice-vault-example-body">
                  <code className="vertice-vault-example-prompt">
                    「金曜のチームMTG。目的：Q3戦略合意。参加者：PM+営業+CS。論点：優先順位3つ。論点ごとに議題案を3つずつ。」
                  </code>
                  <span className="vertice-vault-example-out">チーム特化の議題草案 + 想定論点</span>
                </div>
              </div>
            </div>

            <p className="vertice-vault-h3">今日のチェックリスト</p>
            <ul className="vertice-vault-checklist">
              {VAULT_CHECKLIST.map((t) => (
                <li key={t} className="vertice-vault-checkitem">
                  <span className="vertice-vault-checkitem-box" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="vertice-vault-foot">
          <span className="vertice-vault-foot-eyebrow">PROGRESS</span>
          <div className="vertice-vault-foot-bar">
            <div className="vertice-vault-foot-bar-fill" />
          </div>
          <span className="vertice-vault-foot-amt">38%</span>
        </div>
      </div>

      <div className="vertice-chip vertice-chip-lifetime">
        <span className="vertice-chip-icon" aria-hidden="true">♾️</span>
        <span className="vertice-chip-text">
          <span className="vertice-chip-eyebrow">LIFETIME</span>
          <span className="vertice-chip-title">永久アクセス</span>
        </span>
      </div>

      <figure className="vertice-mockup-testimonial">
        <div className="vertice-mockup-testimonial-head">
          <span className="vertice-mockup-testimonial-avatar" aria-hidden="true">M</span>
          <div className="vertice-mockup-testimonial-id">
            <span className="vertice-mockup-testimonial-name">M. Tanaka</span>
            <span className="vertice-mockup-testimonial-role">マーケティングマネージャー · 東京</span>
          </div>
          <span className="vertice-mockup-testimonial-result">週10時間削減</span>
        </div>
        <blockquote className="vertice-mockup-testimonial-quote">
          「3週目で自分のメール対応が1日30分以下に。テンプレートがそのまま実務で使えました。」
        </blockquote>
      </figure>
    </div>
    </div>
  );
}

// ——— TaughtBy strip (slim trust strip directly under hero) ——————————
function TaughtBy() {
  return (
    <section className="vertice-taughtby" aria-label="Taught by">
      <div className="vertice-taughtby-inner">
        <p className="vertice-taughtby-eyebrow">TAUGHT BY · 講師陣</p>
        <a href="#instructors" className="vertice-taughtby-row">
          {INSTRUCTORS.map((p) => (
            <span key={p.name} className="vertice-taughtby-person">
              <span className="vertice-taughtby-photo-frame">
                <Image
                  src={p.photo}
                  alt=""
                  width={36}
                  height={36}
                  className="vertice-taughtby-photo"
                />
              </span>
              <span className="vertice-taughtby-text">
                <span className="vertice-taughtby-name">{p.name}</span>
                <span className="vertice-taughtby-role">{p.enRole}</span>
              </span>
            </span>
          ))}
          <span className="vertice-taughtby-link">
            プロフィールを見る <IconArrow size={12} />
          </span>
        </a>
      </div>
    </section>
  );
}

// ——— Contrast (BEFORE / 3 MONTHS / AFTER) ————————————————————————
type ContrastItem = { jp: string; en: string };
type ContrastFutureItem = ContrastItem & { stage: string };

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

const CONTRAST_FUTURE: ContrastFutureItem[] = [
  {
    stage: '効率化',
    jp: '毎日4つのAIツールを使い分け、業務時間を半減',
    en: 'Switch between 4 AI tools daily, cut work time in half',
  },
  {
    stage: '構築',
    jp: '自分専用のAIアシスタントとワークフローを構築',
    en: 'Build a personal AI assistant and workflow stack',
  },
  {
    stage: '定着',
    jp: 'チームにAI活用法を教えられるレベルに到達',
    en: 'Lead AI adoption inside your team — confidently',
  },
  {
    stage: '成果創出',
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

function ContrastColumn(
  props:
    | { variant: 'before'; items: ContrastItem[] }
    | { variant: 'after'; items: ContrastFutureItem[] }
) {
  const isAfter = props.variant === 'after';
  return (
    <div
      className={`vertice-contrast-col${isAfter ? ' vertice-contrast-col-after' : ' vertice-contrast-col-before'}`}
    >
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
        {props.items.map((item, i) => (
          <div
            key={i}
            className={`vertice-contrast-item ${isAfter ? 'vertice-contrast-item-future' : 'vertice-contrast-item-now'}`}
          >
            {isAfter ? (
              <div className="vertice-contrast-timeline-marker" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </div>
            ) : (
              <div
                className="vertice-contrast-item-badge vertice-contrast-item-badge-now"
                aria-hidden="true"
              >
                <IconX size={11} />
              </div>
            )}
            <div className="vertice-contrast-item-body">
              {isAfter && 'stage' in item && (
                <span className="vertice-contrast-timeline-eyebrow">{item.stage}</span>
              )}
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
// ——— Qualifier strip (Who this is for / not for) ————————————————————
type QualifierItem = { jp: string; en: string };

const QUALIFIER_FOR: QualifierItem[] = [
  {
    jp: '毎日スプレッドシートや文書を扱う社会人',
    en: 'Working pros using docs and spreadsheets daily',
  },
  {
    jp: '断片的なYouTubeではなく、体系立てて学びたい方',
    en: 'Want a structured curriculum, not random tutorials',
  },
  {
    jp: '5週間、1日30分の学習時間を確保できる方',
    en: 'Can commit 30 min/day for 5 weeks',
  },
];

const QUALIFIER_NOT_FOR: QualifierItem[] = [
  {
    jp: 'ChatGPTをまだ一度も触ったことがない方',
    en: "Haven't opened ChatGPT once yet",
  },
  {
    jp: '実践せず、動画を眺めるだけで満足したい方',
    en: 'Want passive watching only, not application',
  },
  {
    jp: '何も作らずに資格証だけ欲しい方',
    en: 'Looking for a certificate without building anything',
  },
];

function QualifierStrip() {
  return (
    <section id="who" className="vertice-qual" aria-labelledby="vertice-qual-heading">
      <div className="vertice-qual-inner">
        <h2 id="vertice-qual-heading" className="sr-only">
          Who this program is for
        </h2>
        <div className="vertice-qual-grid">
          <div className="vertice-qual-col vertice-qual-col-for">
            <p className="vertice-qual-eyebrow vertice-qual-eyebrow-for">FOR YOU IF</p>
            <p className="vertice-qual-title">こんな方におすすめ</p>
            <ul className="vertice-qual-list">
              {QUALIFIER_FOR.map((q) => (
                <li key={q.en} className="vertice-qual-item">
                  <span
                    className="vertice-qual-icon vertice-qual-icon-for"
                    aria-hidden="true"
                  >
                    <IconCheck size={14} />
                  </span>
                  <span className="vertice-qual-text">
                    <span className="vertice-qual-jp">{q.jp}</span>
                    <span className="vertice-qual-en">{q.en}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="vertice-qual-divider" aria-hidden="true" />
          <div className="vertice-qual-col vertice-qual-col-not">
            <p className="vertice-qual-eyebrow vertice-qual-eyebrow-not">NOT FOR YOU IF</p>
            <p className="vertice-qual-title">向いていない方</p>
            <ul className="vertice-qual-list">
              {QUALIFIER_NOT_FOR.map((q) => (
                <li key={q.en} className="vertice-qual-item">
                  <span
                    className="vertice-qual-icon vertice-qual-icon-not"
                    aria-hidden="true"
                  >
                    <IconX size={14} />
                  </span>
                  <span className="vertice-qual-text">
                    <span className="vertice-qual-jp">{q.jp}</span>
                    <span className="vertice-qual-en">{q.en}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
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
  outcomeJp: string;
  outcomeEn: string;
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
        'ChatGPT、Claude、Claude Cowork、Gemini、Perplexity、NotebookLMの実践的な使い分け。それぞれの強みを業務シーンで使いこなす。',
      enBody:
        'Master ChatGPT, Claude, Claude Cowork, Gemini, Perplexity, and NotebookLM — and know when to use each.',
      outcomeJp: '業務ごとに最適なAIを5秒で選べる',
      outcomeEn: 'Pick the right AI in 5 seconds',
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
      outcomeJp: '1日2時間以上を取り戻す',
      outcomeEn: 'Reclaim 2+ hours every day',
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
      outcomeJp: '会議準備を80%短縮',
      outcomeEn: '80% less meeting prep',
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
      outcomeJp: 'コードなしで自分専用AIを構築',
      outcomeEn: 'Build your own AI — no code',
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
        <div className="vertice-cap-card-outcome">
          <span className="vertice-cap-card-outcome-icon" aria-hidden="true">
            <IconCheck size={11} />
          </span>
          <span className="vertice-cap-card-outcome-text">
            <span className="vertice-cap-card-outcome-jp">{card.outcomeJp}</span>
            <span className="vertice-cap-card-outcome-en">{card.outcomeEn}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

// ——— Capability illustrations ———————————————————————————————————

type ToolGlyph = (props: { size?: number }) => ReactElement;

const GlyphChatGPT: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#fff"
      d="M21.5 10.4a5.4 5.4 0 0 0-.5-4.4 5.5 5.5 0 0 0-5.9-2.6 5.5 5.5 0 0 0-9.3 2 5.5 5.5 0 0 0-3.6 2.6 5.4 5.4 0 0 0 .7 6.4 5.4 5.4 0 0 0 .5 4.4 5.5 5.5 0 0 0 5.9 2.6 5.5 5.5 0 0 0 4.1 1.9 5.5 5.5 0 0 0 5.2-3.8 5.5 5.5 0 0 0 3.6-2.6 5.4 5.4 0 0 0-.7-6.5Zm-8.2 11.4a4 4 0 0 1-2.6-1l.1-.1 4.4-2.6a.7.7 0 0 0 .4-.6V11l1.8 1.1v5.2a4 4 0 0 1-4 4Zm-8.7-3.7a4 4 0 0 1-.5-2.7V10l4.4 2.6a.7.7 0 0 0 .7 0l5.4-3.1v2.1L11 14.1a.7.7 0 0 0-.4.6v5L8.8 18.7Z"
    />
  </svg>
);

const GlyphClaude: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <g fill="#fff">
      <path d="M11.4 5.6 9 12l2.4 6.4h1.7L15.4 12 13 5.6h-1.6Z" />
      <path d="M3.5 12 6 5.6h2.1L5.7 12l2.4 6.4H6L3.5 12Z" />
      <path d="M20.5 12 18 5.6h-2.1L18.3 12l-2.4 6.4H18l2.5-6.4Z" />
    </g>
  </svg>
);

const GlyphGemini: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#fff"
      d="M12 2c.4 4.6 2.4 6.6 7 7-4.6.4-6.6 2.4-7 7-.4-4.6-2.4-6.6-7-7 4.6-.4 6.6-2.4 7-7Z"
    />
  </svg>
);

const GlyphCowork: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontFamily="ui-sans-serif, system-ui"
      fontSize="11"
      fontWeight="800"
      fill="#fff"
      letterSpacing="-0.5"
    >
      CC
    </text>
  </svg>
);

const GlyphPerplexity: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#fff"
      d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const GlyphNotebookLM: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 18A12 12 0 0 1 18 6" />
      <path d="M6 13a7 7 0 0 1 7-7" />
    </g>
    <circle cx="6.5" cy="17.5" r="1.6" fill="#fff" />
  </svg>
);

type ToolDef = {
  id: string;
  name: string;
  jp: string;
  en: string;
  color: string;
  Glyph: ToolGlyph;
};

function IllusTools() {
  const left: ToolDef[] = [
    { id: 'chatgpt', name: 'ChatGPT', jp: 'アイデア創出', en: 'Ideation', color: '#10A37F', Glyph: GlyphChatGPT },
    { id: 'claude', name: 'Claude', jp: '分析・要約', en: 'Analysis', color: '#D97757', Glyph: GlyphClaude },
    { id: 'perplexity', name: 'Perplexity', jp: 'リサーチ', en: 'Research', color: '#1FA095', Glyph: GlyphPerplexity },
  ];
  const right: ToolDef[] = [
    { id: 'gemini', name: 'Gemini', jp: 'マルチモーダル', en: 'Multimodal', color: '#4285F4', Glyph: GlyphGemini },
    { id: 'cowork', name: 'Claude Cowork', jp: 'チーム協働', en: 'Team', color: '#B45A1F', Glyph: GlyphCowork },
    { id: 'notebooklm', name: 'NotebookLM', jp: 'ナレッジ整理', en: 'Knowledge', color: '#1A2B33', Glyph: GlyphNotebookLM },
  ];

  return (
    <div className="vertice-illus vertice-illus-tools" role="presentation">
      <svg
        className="vertice-illus-tools-lines"
        viewBox="0 0 400 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vt-line-l" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2DBFB0" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="vt-line-r" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0%" stopColor="#E6B450" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E6B450" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {[60, 160, 260].map((y) => (
          <path
            key={`l-${y}`}
            d={`M 130 ${y} C 165 ${y}, 175 160, 200 160`}
            fill="none"
            stroke="url(#vt-line-l)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
        {[60, 160, 260].map((y) => (
          <path
            key={`r-${y}`}
            d={`M 270 ${y} C 235 ${y}, 225 160, 200 160`}
            fill="none"
            stroke="url(#vt-line-r)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
        <circle cx="130" cy="60" r="2.5" fill="#2DBFB0" opacity="0.7" />
        <circle cx="130" cy="160" r="2.5" fill="#2DBFB0" opacity="0.7" />
        <circle cx="130" cy="260" r="2.5" fill="#2DBFB0" opacity="0.7" />
        <circle cx="270" cy="60" r="2.5" fill="#E6B450" opacity="0.7" />
        <circle cx="270" cy="160" r="2.5" fill="#E6B450" opacity="0.7" />
        <circle cx="270" cy="260" r="2.5" fill="#E6B450" opacity="0.7" />
      </svg>

      <div className="vertice-illus-tools-col vertice-illus-tools-col-l">
        {left.map((t) => (
          <ToolNode key={t.id} tool={t} side="l" />
        ))}
      </div>

      <div className="vertice-illus-tools-hub" aria-hidden="true">
        <div className="vertice-illus-tools-hub-ring" />
        <div className="vertice-illus-tools-hub-inner">
          <IconSpark size={18} style={{ color: 'var(--vertice-seafoam-dark)' }} />
          <span className="vertice-illus-tools-hub-jp">最適なAIを選ぶ</span>
          <span className="vertice-illus-tools-hub-en">Pick the right AI</span>
        </div>
      </div>

      <div className="vertice-illus-tools-col vertice-illus-tools-col-r">
        {right.map((t) => (
          <ToolNode key={t.id} tool={t} side="r" />
        ))}
      </div>
    </div>
  );
}

function ToolNode({ tool, side }: { tool: ToolDef; side: 'l' | 'r' }) {
  const { Glyph } = tool;
  return (
    <div className={`vertice-illus-tools-node vertice-illus-tools-node-${side}`}>
      <div className="vertice-illus-tools-node-logo" style={{ background: tool.color }}>
        <Glyph size={20} />
      </div>
      <div className="vertice-illus-tools-node-text">
        <span className="vertice-illus-tools-node-name">{tool.name}</span>
        <span className="vertice-illus-tools-node-jp">{tool.jp}</span>
      </div>
    </div>
  );
}

const GlyphMail: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path d="M4 7l8 6 8-6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GlyphSearch: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path d="m20 20-4.3-4.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const GlyphDoc: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 3h9l4 4v14H6z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9 11h7M9 15h7M9 7h3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const GlyphGlobe: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path
      d="M4 12h16M12 4c2.5 2.5 3.8 5.3 3.8 8s-1.3 5.5-3.8 8c-2.5-2.5-3.8-5.3-3.8-8S9.5 6.5 12 4Z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.5"
    />
  </svg>
);

type AutomateTask = {
  id: string;
  jp: string;
  en: string;
  color: string;
  Glyph: ToolGlyph;
};

function IllusAutomate() {
  const tasks: AutomateTask[] = [
    { id: 'mail', jp: 'メール', en: 'Email', color: '#9B87E0', Glyph: GlyphMail },
    { id: 'research', jp: 'リサーチ', en: 'Research', color: '#4285F4', Glyph: GlyphSearch },
    { id: 'summary', jp: '要約', en: 'Summary', color: '#D97757', Glyph: GlyphDoc },
    { id: 'translate', jp: '翻訳', en: 'Translate', color: '#1FA095', Glyph: GlyphGlobe },
  ];

  return (
    <div className="vertice-illus vertice-illus-automate" role="presentation">
      <svg
        className="vertice-illus-automate-lines"
        viewBox="0 0 400 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="va-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2DBFB0" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="va-arrow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1FA496" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[60, 130, 200, 270].map((y) => (
          <path
            key={`task-${y}`}
            d={`M 120 ${y} C 155 ${y}, 165 160, 195 160`}
            fill="none"
            stroke="url(#va-line)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
        {[60, 130, 200, 270].map((y) => (
          <circle key={`dot-${y}`} cx="120" cy={y} r="2.5" fill="#2DBFB0" opacity="0.7" />
        ))}
        <path
          d="M 235 160 L 275 160"
          stroke="url(#va-arrow)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 270 154 L 278 160 L 270 166"
          fill="none"
          stroke="#1FA496"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>

      <div className="vertice-illus-automate-col vertice-illus-automate-tasks">
        {tasks.map((t) => {
          const { Glyph } = t;
          return (
            <div key={t.id} className="vertice-illus-automate-task">
              <div className="vertice-illus-automate-task-logo" style={{ background: t.color }}>
                <Glyph size={16} />
              </div>
              <span className="vertice-illus-automate-task-label">{t.jp}</span>
              <span className="vertice-illus-automate-task-check" aria-hidden="true">
                <IconCheck size={8} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="vertice-illus-automate-hub" aria-hidden="true">
        <div className="vertice-illus-automate-hub-ring" />
        <div className="vertice-illus-automate-hub-inner">
          <IconSpark size={18} style={{ color: 'var(--vertice-seafoam-dark)' }} />
          <span className="vertice-illus-automate-hub-label">AI</span>
          <span className="vertice-illus-automate-hub-sub">AUTOMATE</span>
        </div>
      </div>

      <div className="vertice-illus-automate-col vertice-illus-automate-outcome">
        <p className="vertice-illus-automate-outcome-eyebrow">
          <span>RECLAIMED</span>
          <span className="vertice-illus-automate-outcome-eyebrow-jp">毎日取り戻す</span>
        </p>
        <p className="vertice-illus-automate-outcome-amt">
          2h <span className="vertice-illus-automate-outcome-amt-min">18min</span>
        </p>
        <span className="vertice-illus-automate-outcome-delta">↓ 54% vs. 先月</span>
      </div>
    </div>
  );
}

const GlyphPeople: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="9" r="3.2" fill="none" stroke="#fff" strokeWidth="1.7" />
    <circle cx="16" cy="10" r="2.4" fill="none" stroke="#fff" strokeWidth="1.7" />
    <path
      d="M3 19c0-3 2.7-5 6-5s6 2 6 5"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M15 18c.4-2 2-3.3 4-3.3s3.6 1.3 4 3.3"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const GlyphTask: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path
      d="M8 12.5l3 3 5-6"
      fill="none"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GlyphSend: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3.5 12 21 4l-7 17-3-8-7.5-1z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

type TeamStep = {
  n: string;
  jp: string;
  color: string;
  Glyph: ToolGlyph;
};

function IllusTeam() {
  const agenda = ['1. Q2業績レビュー', '2. 新規案件の状況', '3. リソース配分'];
  const steps: TeamStep[] = [
    { n: '01', jp: '資料を準備', color: '#9B87E0', Glyph: GlyphDoc },
    { n: '02', jp: 'チームで確認', color: '#2DBFB0', Glyph: GlyphPeople },
    { n: '03', jp: 'タスクを割当', color: '#E6B450', Glyph: GlyphTask },
    { n: '04', jp: 'フォローアップ', color: '#5A6B73', Glyph: GlyphSend },
  ];
  const avatars: Array<{ c: string; l: string }> = [
    { c: '#9B87E0', l: 'M' },
    { c: '#2DBFB0', l: 'K' },
    { c: '#E6B450', l: 'S' },
    { c: '#5A6B73', l: 'T' },
  ];

  return (
    <div className="vertice-illus vertice-illus-team" role="presentation">
      <svg
        className="vertice-illus-team-lines"
        viewBox="0 0 400 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vt-team-in" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#9B87E0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#9B87E0" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="vt-team-out" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1FA496" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M 160 160 C 190 160, 200 160, 220 160"
          fill="none"
          stroke="url(#vt-team-in)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <path
          d="M 290 160 C 310 160, 320 160, 340 160"
          fill="none"
          stroke="url(#vt-team-out)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
        <circle cx="160" cy="160" r="2.5" fill="#9B87E0" opacity="0.7" />
        <circle cx="340" cy="160" r="2.5" fill="#2DBFB0" opacity="0.7" />
      </svg>

      <div className="vertice-illus-team-col vertice-illus-team-meeting-col">
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
      </div>

      <div className="vertice-illus-team-col vertice-illus-team-steps">
        {steps.map((s) => {
          const { Glyph } = s;
          return (
            <div key={s.n} className="vertice-illus-team-step">
              <span className="vertice-illus-team-step-num">{s.n}</span>
              <div className="vertice-illus-team-step-icon" style={{ background: s.color }}>
                <Glyph size={14} />
              </div>
              <span className="vertice-illus-team-step-label">{s.jp}</span>
              <span className="vertice-illus-team-step-check" aria-hidden="true">
                <IconCheck size={8} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="vertice-illus-team-col vertice-illus-team-people">
        <div className="vertice-illus-team-avatars">
          {avatars.map((a) => (
            <div
              key={a.l}
              className="vertice-illus-team-avatar"
              style={{ background: a.c }}
              aria-hidden="true"
            >
              {a.l}
            </div>
          ))}
        </div>
        <div className="vertice-illus-team-status">
          <span className="vertice-illus-team-status-dot" aria-hidden="true" />
          <span>チームで連携中</span>
        </div>
      </div>

      <div className="vertice-illus-pill vertice-illus-team-pill">
        <IconSpark size={12} style={{ color: 'var(--vertice-lavender-dark)' }} />
        <span>準備時間 -80%</span>
      </div>
    </div>
  );
}

const GlyphPerson: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" fill="none" stroke="#fff" strokeWidth="1.8" />
    <path
      d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
      fill="none"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const GlyphChat: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="11" r="1" fill="#fff" />
    <circle cx="13" cy="11" r="1" fill="#fff" />
    <circle cx="17" cy="11" r="1" fill="#fff" />
  </svg>
);

const GlyphWrench: ToolGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M14.7 6.3a4 4 0 0 1 5 5L17 14l3 3-3 3-3-3-2.7 2.7a4 4 0 0 1-5-5L9 12 6 9l3-3 3 3 2.7-2.7Z"
      fill="none"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const GlyphRobot: ToolGlyph = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="8" width="14" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="9.5" cy="13" r="1.2" fill="currentColor" />
    <circle cx="14.5" cy="13" r="1.2" fill="currentColor" />
    <path d="M12 8V5M10 5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M3 13v2M21 13v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

type BuildLayer = {
  id: string;
  name: string;
  jp: string;
  color: string;
  Glyph: ToolGlyph;
  pos: 'tl' | 'tr' | 'bl' | 'br';
};

function IllusBuild() {
  const layers: BuildLayer[] = [
    { id: 'you', name: 'YOUR AI', jp: '自分専用アシスタント', color: '#1A2B33', Glyph: GlyphPerson, pos: 'tl' },
    { id: 'flows', name: 'WORKFLOWS', jp: 'メール · 要約 · リサーチ', color: '#E6B450', Glyph: GlyphDoc, pos: 'tr' },
    { id: 'prompts', name: 'PROMPTS', jp: '50+ プロンプト', color: '#2DBFB0', Glyph: GlyphChat, pos: 'bl' },
    { id: 'tools', name: 'TOOLS', jp: 'ChatGPT · Claude +3', color: '#9B87E0', Glyph: GlyphWrench, pos: 'br' },
  ];
  const left = layers.filter((l) => l.pos === 'tl' || l.pos === 'bl');
  const right = layers.filter((l) => l.pos === 'tr' || l.pos === 'br');

  return (
    <div className="vertice-illus vertice-illus-build" role="presentation">
      <svg
        className="vertice-illus-build-lines"
        viewBox="0 0 400 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vb-line-l" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2DBFB0" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="vb-line-r" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0%" stopColor="#9B87E0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#9B87E0" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {[100, 220].map((y) => (
          <path
            key={`l-${y}`}
            d={`M 130 ${y} C 165 ${y}, 175 160, 200 160`}
            fill="none"
            stroke="url(#vb-line-l)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
        {[100, 220].map((y) => (
          <path
            key={`r-${y}`}
            d={`M 270 ${y} C 235 ${y}, 225 160, 200 160`}
            fill="none"
            stroke="url(#vb-line-r)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
        ))}
        <circle cx="130" cy="100" r="2.5" fill="#1A2B33" opacity="0.7" />
        <circle cx="130" cy="220" r="2.5" fill="#2DBFB0" opacity="0.7" />
        <circle cx="270" cy="100" r="2.5" fill="#E6B450" opacity="0.85" />
        <circle cx="270" cy="220" r="2.5" fill="#9B87E0" opacity="0.7" />
      </svg>

      <div className="vertice-illus-build-col vertice-illus-build-col-l">
        {left.map((l) => (
          <BuildNode key={l.id} layer={l} />
        ))}
      </div>

      <div className="vertice-illus-build-hub" aria-hidden="true">
        <div className="vertice-illus-build-hub-ring" />
        <div className="vertice-illus-build-hub-inner">
          <span className="vertice-illus-build-hub-icon" style={{ color: 'var(--vertice-seafoam-dark)' }}>
            <GlyphRobot size={22} />
          </span>
          <span className="vertice-illus-build-hub-label">MY AI</span>
          <span className="vertice-illus-build-hub-status">
            <span className="vertice-illus-build-hub-dot" />
            Online
          </span>
        </div>
      </div>

      <div className="vertice-illus-build-col vertice-illus-build-col-r">
        {right.map((l) => (
          <BuildNode key={l.id} layer={l} />
        ))}
      </div>

      <div className="vertice-illus-pill vertice-illus-build-pill">
        <IconSpark size={12} style={{ color: 'var(--vertice-seafoam-dark)' }} />
        <span>4層スタック</span>
      </div>
    </div>
  );
}

function BuildNode({ layer }: { layer: BuildLayer }) {
  const { Glyph } = layer;
  return (
    <div className="vertice-illus-build-node">
      <div className="vertice-illus-build-node-logo" style={{ background: layer.color }}>
        <Glyph size={16} />
      </div>
      <div className="vertice-illus-build-node-text">
        <span className="vertice-illus-build-node-name">{layer.name}</span>
        <span className="vertice-illus-build-node-jp">{layer.jp}</span>
      </div>
    </div>
  );
}
// ——— Curriculum (5-module sticky-rail) ————————————————————————
type CurriculumModule = {
  n: number;
  jp: string;
  en: string;
  d: string;
};

const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    n: 1,
    jp: 'AIの基礎を知る',
    en: 'AI Foundations',
    d: 'なぜ今AIが重要なのか、プロが日常で使う6つのAI（ChatGPT、Claude、Claude Cowork、Gemini、Perplexity、NotebookLM）をハンズオンで体験。基礎概念から始めて、実務に直結する全体像を掴む。',
  },
  {
    n: 2,
    jp: 'AIに仕事をさせる',
    en: 'Put AI to Work',
    d: '文書要約、リサーチ、翻訳のテクニック。AIの限界とハルシネーション対策を学び、業務に安心して導入できる状態に。',
  },
  {
    n: 3,
    jp: 'チームでAIを活用する',
    en: 'AI for Teams',
    d: '2人以上のチーム向けAIコミュニケーション、会議準備、AIへのタスク委任。チーム全体の生産性を引き上げるパターン集。',
  },
  {
    n: 4,
    jp: 'はじめてのAIツールを作る',
    en: 'Build Your First AI Tool',
    d: 'パーソナルAIワークフロー設計、AIアシスタントのカスタマイズ。コードなしで自分専用のAIを構築。',
  },
  {
    n: 5,
    jp: '自分のAIアクションプラン',
    en: 'Your AI Action Plan',
    d: 'パーソナルAIロードマップ、3ツール×3ワークフロー×3目標。修了後3ヶ月の行動計画を持ち帰る。',
  },
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
            <p className="vertice-curr-eyebrow">What you&apos;ll learn</p>
            <h2 id="vertice-curr-heading" className="vertice-curr-title">
              <span className="vertice-curr-title-accent">5モジュール。</span>
              <br />
              プロのためのカリキュラム。
            </h2>
            <p className="vertice-curr-sub">30 hours. Built for professionals.</p>
            <p className="vertice-curr-body-jp">
              プロが毎日使うツールとワークフローを、ハンズオンで身につける。
            </p>
            <p className="vertice-curr-body-en">
              Hands-on training in the tools and workflows professionals use every day.
            </p>
          </div>

          <div className="vertice-curr-list">
            {CURRICULUM_MODULES.map((m) => (
              <ModuleRow key={m.n} m={m} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleRow({ m }: { m: CurriculumModule }) {
  return (
    <div className="vertice-week">
      <div className="vertice-week-num">{m.n}</div>
      <div className="vertice-week-body">
        <div className="vertice-week-headline">
          <h3 className="vertice-week-title">{m.jp}</h3>
          <span className="vertice-week-en">{m.en}</span>
        </div>
        <p className="vertice-week-desc">{m.d}</p>
      </div>
      <span className="vertice-week-arrow" aria-hidden="true">
        <IconArrow size={16} />
      </span>
    </div>
  );
}

// ——— LearningFormats (Vault self-paced vs Cohort 5-week live) ————————
type FormatGlyph = (props: { size?: number }) => ReactElement;

const FGLibrary: FormatGlyph = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="6" height="16" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="11" y="4" width="5" height="16" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M17.2 6.4l3.2.8-3 12-3.2-.8z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const FGPeople: FormatGlyph = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="16" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M3 19c0-3 2.7-5 6-5s6 2 6 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M15 18c.4-2 2-3.3 4-3.3s3.6 1.3 4 3.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const FGInfinity: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7.5 8.5c-2 0-3.5 1.6-3.5 3.5s1.5 3.5 3.5 3.5c2.8 0 4-4 6.5-4 1.7 0 3 1.3 3 3s-1.3 3-3 3-3.5-2-5-4-2-3.5-2-4.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 8.5c-1.7 0-2.8 1.5-3.7 3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const FGClock: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12 7.5V12l3 2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FGPlay: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
  </svg>
);

const FGGlobeOutline: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M3.5 12h17M12 3.5c2.5 2.5 3.8 5.3 3.8 8.5s-1.3 6-3.8 8.5c-2.5-2.5-3.8-5.3-3.8-8.5s1.3-6 3.8-8.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const FGCalendar: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="6" width="17" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const FGVideo: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="13" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M16 10.5l5-2v7l-5-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const FGRocket: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M14 4c4 1 6 3 7 7l-7 7-3-3-3-3 6-8z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <circle cx="15" cy="9" r="1.6" fill="currentColor" />
    <path
      d="M7 14l-3 3 3 1 1 3 3-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const FGCertificate: FormatGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="10" r="2" fill="currentColor" />
    <path
      d="M9 14.5l-1.5 6 4.5-2.5 4.5 2.5-1.5-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

type FormatBullet = { jp: string; en: string; Glyph: FormatGlyph };

type FormatCardProps = {
  mode: 'vault' | 'cohort';
  badgeJp: string;
  badgeEn: string;
  HeaderGlyph: FormatGlyph;
  titleJp: string;
  titleEn: string;
  bullets: FormatBullet[];
  ctaHref: string;
  ctaJp: string;
  ctaEn: string;
};

function LearningFormats() {
  return (
    <section
      id="how-you-learn"
      className="vertice-formats"
      aria-labelledby="vertice-formats-heading"
    >
      <div className="vertice-formats-inner">
        <p className="vertice-formats-eyebrow">How you learn it</p>
        <h2 id="vertice-formats-heading" className="vertice-formats-title">
          同じ内容、
          <span className="vertice-formats-title-accent">2つの学び方。</span>
        </h2>
        <p className="vertice-formats-sub">Same curriculum. Two ways to learn.</p>

        <div className="vertice-formats-grid">
          <FormatCard
            mode="vault"
            badgeJp="自分のペース"
            badgeEn="Self-paced"
            HeaderGlyph={FGLibrary}
            titleJp="Vault"
            titleEn="Self-paced library"
            bullets={[
              { jp: '永久アクセス・あなたのスケジュールで', en: 'Lifetime access · your schedule', Glyph: FGInfinity },
              { jp: '合計30時間・週2〜10時間で柔軟に', en: '~30 hours total · 2–10 hrs/week', Glyph: FGClock },
              { jp: '40本以上の動画・テンプレート・プロンプト', en: '40+ videos · templates · prompts', Glyph: FGPlay },
              { jp: 'いつでもどこでも、何度でも見返せる', en: 'Watch anywhere, anytime, as many times as you want', Glyph: FGGlobeOutline },
            ]}
            ctaHref="#pricing"
            ctaJp="Vaultの詳細を見る"
            ctaEn="See Vault pricing"
          />
          <FormatCard
            mode="cohort"
            badgeJp="ライブコホート"
            badgeEn="Live Cohort"
            HeaderGlyph={FGPeople}
            titleJp="Live Cohort"
            titleEn="5-week live program"
            bullets={[
              { jp: '5週間・週6時間（ライブ + 自習）', en: '5 weeks · 6 hrs/week (live + self-study)', Glyph: FGCalendar },
              { jp: '週1回のライブZoom・少人数指導', en: 'Weekly live Zoom · small-group coaching', Glyph: FGVideo },
              { jp: '同期メンバーとプロジェクトを完走', en: 'Ship a project alongside cohort peers', Glyph: FGRocket },
              { jp: '修了証・Vaultの全コンテンツを含む', en: 'Verified certificate · includes full Vault library', Glyph: FGCertificate },
            ]}
            ctaHref="#pricing"
            ctaJp="コホートの詳細を見る"
            ctaEn="See Cohort pricing"
          />
        </div>

        <p className="vertice-formats-foot">
          <span className="vertice-formats-foot-jp">
            どちらも同じ5モジュールのカリキュラム。学び方だけが違います。
          </span>
          <span className="vertice-formats-foot-en">
            Both modes deliver the same 5-module curriculum. Only the format differs.
          </span>
        </p>
      </div>
    </section>
  );
}

function FormatCard({
  mode,
  badgeJp,
  badgeEn,
  HeaderGlyph,
  titleJp,
  titleEn,
  bullets,
  ctaHref,
  ctaJp,
  ctaEn,
}: FormatCardProps) {
  const onClick = () =>
    trackEvent('partner_format_click', {
      partner: PARTNER_SLUG,
      mode,
    });

  return (
    <div className={`vertice-formats-card vertice-formats-card-${mode}`}>
      <div className="vertice-formats-card-header">
        <div className="vertice-formats-card-header-icon" aria-hidden="true">
          <HeaderGlyph size={22} />
        </div>
        <div className="vertice-formats-card-badge">
          <span className="vertice-formats-card-badge-jp">{badgeJp}</span>
          <span className="vertice-formats-card-badge-en">{badgeEn}</span>
        </div>
      </div>
      <h3 className="vertice-formats-card-title">{titleJp}</h3>
      <p className="vertice-formats-card-title-en">{titleEn}</p>
      <div className="vertice-formats-card-divider" aria-hidden="true" />
      <ul className="vertice-formats-card-bullets">
        {bullets.map((b) => {
          const { Glyph } = b;
          return (
            <li key={b.en} className="vertice-formats-card-bullet">
              <span className="vertice-formats-card-bullet-icon" aria-hidden="true">
                <Glyph size={18} />
              </span>
              <span className="vertice-formats-card-bullet-text">
                <span className="vertice-formats-card-bullet-jp">{b.jp}</span>
                <span className="vertice-formats-card-bullet-en">{b.en}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <a
        href={ctaHref}
        onClick={onClick}
        className="vertice-formats-card-cta"
      >
        <span className="vertice-formats-card-cta-label">
          <span className="vertice-formats-card-cta-jp">{ctaJp}</span>
          <span className="vertice-formats-card-cta-en">{ctaEn}</span>
        </span>
        <IconArrow size={14} className="vertice-formats-card-cta-arrow" />
      </a>
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
// ——— Testimonials (3 placeholder cards above Pricing) ————————————————
// NOTE: Placeholder content — replace with real member quotes before launch.
// The "PLACEHOLDER" banner above the section is intentional and must stay until
// real quotes are dropped in.
type Testimonial = {
  initial: string;
  bg: string;
  quoteJp: string;
  quoteEn: string;
  name: string;
  roleJp: string;
  roleEn: string;
  resultJp: string;
  resultEn: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initial: 'M',
    bg: '#9B87E0',
    quoteJp:
      '半信半疑で始めましたが、3週目で自分のメール対応が1日30分以下に。テンプレートがそのまま実務で使えました。',
    quoteEn:
      'Skeptical at first — by week 3, my email work was under 30 minutes a day. The templates worked as-is.',
    name: 'M. Tanaka',
    roleJp: 'マーケティングマネージャー · 東京',
    roleEn: 'Marketing Manager · Tokyo',
    resultJp: '週10時間削減',
    resultEn: '10 hrs/week saved',
  },
  {
    initial: 'K',
    bg: '#2DBFB0',
    quoteJp:
      '英語が苦手でしたが、日本語字幕とESLガイドのおかげで完走できました。プロンプト集だけで元が取れたと感じます。',
    quoteEn:
      'My English is limited, but the JP subtitles and ESL guide carried me through. The prompt library alone paid for itself.',
    name: 'K. Sato',
    roleJp: 'プロダクトリード · 大阪',
    roleEn: 'Product Lead · Osaka',
    resultJp: 'プロンプト50本を実務に統合',
    resultEn: '50 prompts shipped',
  },
  {
    initial: 'S',
    bg: '#E8B86F',
    quoteJp:
      'チーム全員でVaultを使い始めて、会議準備の時間が80%短くなりました。ROIは1週間で達成できました。',
    quoteEn:
      'My whole team adopted the Vault — meeting prep dropped 80%. ROI hit in week one.',
    name: 'S. Watanabe',
    roleJp: '事業責任者 · 福岡',
    roleEn: 'Business Lead · Fukuoka',
    resultJp: '会議準備 -80%',
    resultEn: '80% less prep time',
  },
];

function Testimonials() {
  return (
    <section
      id="testimonials"
      className="vertice-test"
      aria-labelledby="vertice-test-heading"
    >
      <FloatingHonu top={50} opacity={0.05} />
      <div className="vertice-test-inner">
        <div className="vertice-test-head">
          <p className="vertice-test-eyebrow">受講者の声 / Member stories</p>
          <h2 id="vertice-test-heading" className="vertice-test-title">
            実際に、
            <span className="vertice-test-title-accent">使いこなしている人たち。</span>
          </h2>
          <p className="vertice-test-sub">Real people. Real outcomes.</p>
        </div>
        <div className="vertice-test-grid">
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className="vertice-test-card">
              <span className="vertice-test-quote-mark" aria-hidden="true">
                &ldquo;
              </span>
              <p className="vertice-test-quote-jp">{t.quoteJp}</p>
              <p className="vertice-test-quote-en">{t.quoteEn}</p>
              <div className="vertice-test-footer">
                <div className="vertice-test-person">
                  <span
                    className="vertice-test-avatar"
                    style={{ background: t.bg }}
                    aria-hidden="true"
                  >
                    {t.initial}
                  </span>
                  <div className="vertice-test-meta">
                    <p className="vertice-test-name">{t.name}</p>
                    <p className="vertice-test-role-jp">{t.roleJp}</p>
                    <p className="vertice-test-role-en">{t.roleEn}</p>
                  </div>
                </div>
                <div className="vertice-test-result">
                  <p className="vertice-test-result-jp">{t.resultJp}</p>
                  <p className="vertice-test-result-en">{t.resultEn}</p>
                </div>
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
  includes?: React.ReactNode;
  delta?: React.ReactNode;
  accessChip?: React.ReactNode;
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
            <span className="vertice-pr-title-accent">プランを選ぶ。</span>
          </h2>
          <p className="vertice-pr-sub">Choose your plan.</p>
          <p className="vertice-pr-body">
            自分のペースで学ぶ。コミュニティで深める。ライブで仕上げる。
            <span className="vertice-pr-body-en">
              Learn at your pace. Go deeper in community. Master it live.
            </span>
          </p>
        </div>

        <div className="vertice-pr-ladder" aria-label="How the tiers stack">
          <div className="vertice-pr-ladder-step">
            <span className="vertice-pr-ladder-num">1</span>
            <span className="vertice-pr-ladder-text">
              <span className="vertice-pr-ladder-jp">Community でつながる</span>
              <span className="vertice-pr-ladder-en">Connect</span>
            </span>
          </div>
          <span className="vertice-pr-ladder-arrow" aria-hidden="true">
            <IconArrow size={14} />
          </span>
          <div className="vertice-pr-ladder-step">
            <span className="vertice-pr-ladder-num">2</span>
            <span className="vertice-pr-ladder-text">
              <span className="vertice-pr-ladder-jp">Vault で身につける</span>
              <span className="vertice-pr-ladder-en">Learn</span>
            </span>
          </div>
          <span className="vertice-pr-ladder-arrow" aria-hidden="true">
            <IconArrow size={14} />
          </span>
          <div className="vertice-pr-ladder-step">
            <span className="vertice-pr-ladder-num">3</span>
            <span className="vertice-pr-ladder-text">
              <span className="vertice-pr-ladder-jp">Live Cohort で仕上げる</span>
              <span className="vertice-pr-ladder-en">Master</span>
            </span>
          </div>
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
                <span className="vertice-pr-price-amt">$20</span>
                <span className="vertice-pr-price-suffix">/month</span>
              </>
            }
            sub="≈ ¥2,800/月 · 年額 ¥19,000"
            features={[
              {
                jp: '困った時は月次Q&Aでプロから直接答えがもらえる',
                en: 'Get answers direct from pros every month',
              },
              {
                jp: '毎週、業務で使える新プロンプト・ツールが届く',
                en: 'New ready-to-use prompts and tools every week',
              },
              {
                jp: '英語も日本語も、自分のペースで強化',
                en: 'Build English + Japanese AI fluency at your pace',
              },
              {
                jp: 'メンバー限定リソースで最新動向に置いていかれない',
                en: 'Member-only resources keep you current',
              },
              { jp: 'キャンセルいつでも可・契約縛りなし', en: 'Cancel anytime · no lock-in' },
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
            accessChip={
              <>
                <span className="vertice-pr-access-icon" aria-hidden="true">
                  ♾️
                </span>
                <span className="vertice-pr-access-text">
                  <span className="vertice-pr-access-jp">永久アクセス · 一度払えば終わり</span>
                  <span className="vertice-pr-access-en">Lifetime access · pay once</span>
                </span>
              </>
            }
            features={[
              {
                jp: '1日30分×5週間で実務スキルが身につく',
                en: '30 min/day × 5 weeks → practical AI fluency',
                bold: true,
              },
              {
                jp: '隙間時間に1本ずつ完結する短尺レッスン40本以上',
                en: '40+ bite-sized lessons, one per coffee break',
              },
              {
                jp: 'コピペで初日から使える業務テンプレート＆プロンプト',
                en: 'Copy-paste templates and prompts you use day one',
              },
              {
                jp: 'Honu Community 1ヶ月無料アクセス付き',
                en: '1 month Honu Community membership free',
              },
              {
                jp: 'LinkedInに載せられる修了証',
                en: 'Certificate you can list on LinkedIn',
              },
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
            includes={
              <>
                <span className="vertice-pr-includes-check" aria-hidden="true">
                  <IconCheck size={11} />
                </span>
                <span className="vertice-pr-includes-text">
                  <span className="vertice-pr-includes-jp">Vaultの全コンテンツ込み</span>
                  <span className="vertice-pr-includes-en">Includes everything in Vault</span>
                </span>
              </>
            }
            delta={
              <>
                <p className="vertice-pr-delta-label">Vaultに加えて · On top of Vault</p>
                <p className="vertice-pr-delta-jp">
                  週1ライブ · プロジェクト指導 · 同期仲間 · 認定証
                </p>
                <p className="vertice-pr-delta-en">
                  Live weekly · Project feedback · Cohort peers · Verified cert
                </p>
              </>
            }
            jpName="ライブコホート"
            enName="Live Cohort"
            jpTagline="Vault + 講師による直接指導"
            enTagline="Vault + direct live coaching"
            price={
              <>
                <span className="vertice-pr-price-amt">$1,250</span>
                <span className="vertice-pr-price-suffix">(¥187,500)</span>
              </>
            }
            sub={`${COHORT.startDateLabel.jp} · ${COHORT.startDateLabel.en}`}
            features={[
              {
                jp: 'Vaultの全コンテンツ＋ライブ指導が付く',
                en: 'Everything in Vault + live instruction',
              },
              {
                jp: '週1回のライブZoomでプロから直接答えがもらえる',
                en: 'Weekly live Zoom — direct answers from pros',
              },
              {
                jp: '少人数制（最大15名）で確実に発言・質問できる',
                en: 'Small group (max 15) — you get airtime',
                bold: true,
              },
              {
                jp: '自分のプロジェクトに対して、その場で改善案がもらえる',
                en: 'Bring your project — get feedback in real time',
              },
              {
                jp: '30日間、同期受講者と一緒にプロジェクトを進める',
                en: '30 days shipping projects with your cohort',
              },
              {
                jp: 'LinkedIn・履歴書に書ける認定修了証',
                en: 'Verified certificate for LinkedIn and resume',
              },
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
      includes,
      delta,
      accessChip,
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
          <div className="vertice-pr-badge-wrap vertice-pr-badge-wrap-floating">
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

        {accessChip && <div className="vertice-pr-access">{accessChip}</div>}

        {includes && <div className="vertice-pr-includes">{includes}</div>}

        {delta && <div className="vertice-pr-delta">{delta}</div>}

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
    name: 'Chiemi M.',
    photo: '/images/partners/instructors/chimi.webp',
    jpRole: 'AIコンサルタント・トレーナー',
    enRole: 'AI Consultant & Trainer',
    creds: '認定作業療法士 · ビジネスオペレーション',
    bio: '実践的で忍耐強い指導スタイル。AIに不安を感じる初心者でも、最初の一歩を確実に踏み出せるよう寄り添う。',
  },
  {
    name: 'Mizuho H.',
    photo: '/images/partners/instructors/mizuho.webp',
    jpRole: 'リードAIトレーナー',
    enRole: 'Lead AI Trainer',
    creds: '企業ビジネス経験 · ネイティブ日本語',
    bio: '日本企業での実務経験と、最先端のAI活用法を統合。日本のビジネス文脈に合わせて、AIの使い方を翻訳・再設計するエキスパート。',
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
    q: '受講後、実際に何ができるようになりますか？',
    qen: 'What can I actually do after completing the course?',
    a: '修了後は、(1) ChatGPT・Claude・Perplexity・NotebookLMを業務シーンに合わせて使い分けられる、(2) メール・リサーチ・要約・翻訳をAIに任せて1日2時間以上の業務時間を取り戻せる、(3) 自分専用のAIワークフローを1本構築し、ポートフォリオとしてLinkedInや社内で共有できる、この3点が確実に身につきます。',
  },
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
    a: '無料プランで学習を開始できます。本格活用にはChatGPT Plus（月$20）またはClaude Pro（月$20）を推奨。Geminiは無料のAdvancedプランが利用可能、PerplexityとNotebookLMも無料枠で十分学習できます。Claude CoworkはClaude Pro / Teamプランに含まれます。コース内で各プランの選び方を解説します。',
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
// ——— MobileStickyCTA (fixed bottom bar, mobile only) —————————————————
function MobileStickyCTA() {
  const [pastHero, setPastHero] = useState(false);
  const [atPricing, setAtPricing] = useState(false);

  useEffect(() => {
    const heroEl = document.querySelector('.vertice-hero');
    const pricingEl = document.getElementById('pricing');
    if (!heroEl || !pricingEl) return;

    const heroObs = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -40% 0px' }
    );
    const priceObs = new IntersectionObserver(
      ([entry]) => setAtPricing(entry.isIntersecting),
      { threshold: 0.05 }
    );

    heroObs.observe(heroEl);
    priceObs.observe(pricingEl);
    return () => {
      heroObs.disconnect();
      priceObs.disconnect();
    };
  }, []);

  const visible = pastHero && !atPricing;

  return (
    <div
      className={`vertice-stickycta${visible ? ' vertice-stickycta-visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="vertice-stickycta-meta">
        <p className="vertice-stickycta-name">AI Essentials Vault</p>
        <p className="vertice-stickycta-price">
          <span className="vertice-stickycta-strike">$299</span>
          <span className="vertice-stickycta-amt">$199</span>
          <span className="vertice-stickycta-life">永久アクセス</span>
        </p>
      </div>
      <a
        href="#pricing"
        className="vertice-stickycta-btn"
        onClick={() =>
          trackEvent('partner_cta_click', {
            partner: PARTNER_SLUG,
            location: 'sticky_mobile',
            tier: 'vault',
          })
        }
        tabIndex={visible ? 0 : -1}
      >
        今すぐ参加 →
      </a>
    </div>
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
