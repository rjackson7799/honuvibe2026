// Free-lesson page copy — local bilingual content module.
//
// Kept local (not in messages/*.json) because the /free-lesson page is an
// authored content artifact (a lesson) the founder owns and will refine, like
// blog content. One object guarantees EN/JP parity. JP copy here is a first
// draft and should get a human review before heavy promotion (CLAUDE.md).

export type FreeLessonLocale = 'en' | 'ja';

interface LadderItem {
  title: string;
  desc: string;
  cta: string;
  href: string;
}

export interface FreeLessonContent {
  meta: { title: string; description: string };
  hero: { overline: string; headline: string; subhead: string; cta: string };
  sampleLabels: {
    heading: string;
    brief_label: string;
    before_label: string;
    after_label: string;
    prompt_label: string;
    output_label: string;
    score_label: string;
    gaps_label: string;
    takeaway_label: string;
  };
  tryIt: { heading: string; body: string; starter: string };
  capture: {
    heading: string;
    subhead: string;
    email_placeholder: string;
    submit: string;
    submitting: string;
    success_heading: string;
    success_body: string;
    error: string;
  };
  ladder: { heading: string; items: LadderItem[] };
}

export const CONTENT: Record<FreeLessonLocale, FreeLessonContent> = {
  en: {
    meta: {
      title: 'Free AI lesson: the one change that makes AI useful — HonuVibe.AI',
      description:
        'A free, hands-on taste of how HonuVibe teaches: watch a weak AI prompt become a great one, try it yourself, and get the full lesson by email.',
    },
    hero: {
      overline: 'Free lesson',
      headline: 'The one change that makes AI actually useful',
      subhead:
        "Most AI advice is theory. Here's a hands-on taste of how we teach — watch a weak prompt become a strong one, then try it yourself. Free, no account needed.",
      cta: 'Get the full lesson',
    },
    sampleLabels: {
      heading: 'Watch a prompt go from weak to strong',
      brief_label: 'The task',
      before_label: 'Before',
      after_label: 'After',
      prompt_label: 'Prompt',
      output_label: 'What the AI returned',
      score_label: 'Practice score',
      gaps_label: 'What the rubric flagged',
      takeaway_label: 'The takeaway',
    },
    tryIt: {
      heading: 'Now try it yourself',
      body: 'Open your favorite AI tool and paste this starter. Fill in the brackets — the role, who it’s for, the constraints, and the one next step — then watch the output change.',
      starter:
        'You are [a specific role]. Write [what] for [who]. Keep it [constraints: length, tone]. End with one clear next step: [the action].',
    },
    capture: {
      heading: 'Get the full free lesson',
      subhead:
        "We'll send the complete walkthrough — plus a few ready-to-use prompts — to your inbox. No spam, unsubscribe anytime.",
      email_placeholder: 'you@example.com',
      submit: 'Send me the lesson',
      submitting: 'Sending…',
      success_heading: 'Check your inbox 🐢',
      success_body:
        "Your free lesson is on its way. While you wait, here's where to go next.",
      error: 'Something went wrong. Please try again.',
    },
    ladder: {
      heading: 'Ready for more?',
      items: [
        {
          title: 'The Vault',
          desc: 'Self-paced lessons and prompts, bilingual.',
          cta: 'Explore the Vault',
          href: '/learn#vault',
        },
        {
          title: 'Live Courses',
          desc: 'Learn live with a cohort and ship a real project.',
          cta: 'Browse courses',
          href: '/learn#courses',
        },
        {
          title: 'For Teams',
          desc: 'Bring practical AI training to your whole team.',
          cta: 'Plan team training',
          href: '/organizations',
        },
      ],
    },
  },
  ja: {
    meta: {
      title: '無料AIレッスン:AIを役立たせる、たった一つの変化 — HonuVibe.AI',
      description:
        'HonuVibeの教え方を無料で体験。弱いAIプロンプトが優れたものに変わる様子を見て、自分で試し、完全版レッスンをメールで受け取りましょう。',
    },
    hero: {
      overline: '無料レッスン',
      headline: 'AIを本当に役立たせる、たった一つの変化',
      subhead:
        '多くのAIアドバイスは理論です。これは私たちの教え方を体験できる実践的な一歩 — 弱いプロンプトが強いものに変わる様子を見て、自分で試してみましょう。無料、アカウント不要。',
      cta: '完全版レッスンを受け取る',
    },
    sampleLabels: {
      heading: 'プロンプトが弱いものから強いものへ変わる様子',
      brief_label: '課題',
      before_label: 'ビフォー',
      after_label: 'アフター',
      prompt_label: 'プロンプト',
      output_label: 'AIの出力',
      score_label: '練習スコア',
      gaps_label: 'ルーブリックが指摘した点',
      takeaway_label: 'ポイント',
    },
    tryIt: {
      heading: '今度は自分で試してみましょう',
      body: 'お好きなAIツールを開いて、このスターターを貼り付けてください。括弧を埋めましょう — 役割、誰のためか、制約、そして次の一歩 — そして出力の変化を見てみましょう。',
      starter:
        'あなたは[具体的な役割]です。[誰]のために[何]を書いてください。[制約:長さ、トーン]を守ってください。明確な次の一歩で締めくくる:[行動]。',
    },
    capture: {
      heading: '無料の完全版レッスンを受け取る',
      subhead:
        '完全なウォークスルーと、すぐに使えるプロンプトをメールでお送りします。スパムなし、いつでも配信解除できます。',
      email_placeholder: 'you@example.com',
      submit: 'レッスンを送ってもらう',
      submitting: '送信中…',
      success_heading: '受信トレイをご確認ください 🐢',
      success_body:
        '無料レッスンをお送りしています。お待ちの間に、次はこちらへ。',
      error: '問題が発生しました。もう一度お試しください。',
    },
    ladder: {
      heading: 'もっと学びたいですか?',
      items: [
        {
          title: 'The Vault',
          desc: '自習形式のレッスンとプロンプト、バイリンガル。',
          cta: 'Vaultを見る',
          href: '/learn#vault',
        },
        {
          title: '公開コース',
          desc: 'コホートでライブで学び、実際のプロジェクトを形に。',
          cta: 'コースを見る',
          href: '/learn#courses',
        },
        {
          title: 'チーム向け',
          desc: '実践的なAIトレーニングをチーム全体へ。',
          cta: 'チームのトレーニングを計画',
          href: '/organizations',
        },
      ],
    },
  },
};
