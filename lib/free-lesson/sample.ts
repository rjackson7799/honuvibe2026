// Illustrative "before / after" sample for the free-lesson page (P3b).
//
// This is SAMPLE DATA, not user content — it demonstrates the Apply-It Workbench
// practice loop (weak prompt → scored feedback → revised prompt → better output)
// without any live LLM call or real user attempt. Replace `SAMPLE` with a real,
// PII-scrubbed run when one is ready (see docs/strategy/content-intake.md §6).
//
// Kept as a local bilingual constant (not i18n) because it is example payload,
// guaranteed EN/JP parity, and fully owned/swappable by the author.

export type SampleLocale = 'en' | 'ja';

export interface BeforeAfterSample {
  /** The practice brief. */
  brief: string;
  weak: { prompt: string; output: string; score: number };
  /** What the rubric flagged on the weak attempt. */
  gaps: string[];
  strong: { prompt: string; output: string; score: number };
  /** One-line takeaway. */
  takeaway: string;
}

export const SAMPLE: Record<SampleLocale, BeforeAfterSample> = {
  en: {
    brief: 'Announce a new bilingual AI workshop to your email list.',
    weak: {
      prompt: 'Write an email announcing our new AI workshop.',
      output:
        'Subject: New AI Workshop!\n\nHi everyone, we are excited to announce our new AI workshop. It will teach you about AI. Sign up today!',
      score: 38,
    },
    gaps: [
      'No role — the model has no point of view to write from.',
      'No context — who the audience is or why they should care.',
      'No constraints — length, tone, and the single action to take.',
    ],
    strong: {
      prompt:
        'You are the founder of a warm, practical AI school. Write a 120-word email to small-business owners (EN/JP bilingual audience) announcing a hands-on, bilingual AI workshop. Friendly, no hype. End with one clear CTA: reserve a seat. Include one concrete thing they will build.',
      output:
        'Subject: Build your first AI workflow — with us, live\n\nAloha — most “AI training” is theory. This one isn’t. In two hours you’ll build a real automation you can use Monday: a draft-reply assistant tuned to your business, in English or Japanese. Small group, hands-on, every question answered. No jargon, no pressure. If you’ve been meaning to actually try AI in your work, this is the gentle, practical start. Reserve a seat →',
      score: 86,
    },
    takeaway:
      'Same model, same topic. The only thing that changed was the prompt — role, context, and constraints did the work.',
  },
  ja: {
    brief: '新しいバイリンガルAIワークショップをメールリストに告知する。',
    weak: {
      prompt: '新しいAIワークショップを告知するメールを書いて。',
      output:
        '件名：新しいAIワークショップ!\n\n皆さん、新しいAIワークショップを発表できて嬉しいです。AIについて学べます。今すぐ登録を!',
      score: 38,
    },
    gaps: [
      '役割がない — モデルに書く視点が与えられていない。',
      '文脈がない — 読者が誰で、なぜ重要なのか。',
      '制約がない — 長さ、トーン、取ってほしい唯一の行動。',
    ],
    strong: {
      prompt:
        'あなたは温かく実践的なAIスクールの創業者です。小規模事業のオーナー(英語/日本語のバイリンガル読者)向けに、実践的なバイリンガルAIワークショップを告知する120語のメールを書いてください。親しみやすく、誇張なし。明確なCTAで締める:席を予約。参加者が実際に作るものを一つ含める。',
      output:
        '件名:初めてのAIワークフローを、私たちと一緒にライブで\n\nアロハ — 多くの「AIトレーニング」は理論です。これは違います。2時間で、月曜から使える実際の自動化を作ります:あなたのビジネスに合わせた下書き返信アシスタントを、英語でも日本語でも。少人数、実践重視、すべての質問にお答えします。専門用語なし、プレッシャーなし。仕事でAIを試してみたいと思っていたなら、これがやさしく実践的な第一歩です。席を予約する →',
      score: 86,
    },
    takeaway:
      '同じモデル、同じテーマ。変えたのはプロンプトだけ — 役割・文脈・制約が成果を生みました。',
  },
};
