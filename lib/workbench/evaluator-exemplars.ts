// Apply-It Workbench — few-shot exemplars for the rubric evaluator.
//
// Two worked examples (weak + strong) per prompting dimension, authored in both
// EN and JP. The evaluator prompt builder (lib/workbench/evaluator.ts) injects
// only the exemplars for a scenario's APPLICABLE dimensions, in the ATTEMPT's
// language, to keep the rubric anchored without blowing the token budget.
//
// Each exemplar pairs a short prompt snippet with the score it should earn and a
// one-line rationale. They calibrate Sonnet's scoring; they are not shown to
// members. JP exemplar text is Japanese; source comments stay plain ASCII to
// avoid mojibake in editors / logs.

import type { WorkbenchDimension, WorkbenchLanguage } from '@/lib/workbench/types';

export interface DimensionExemplar {
  /** A short excerpt of a member prompt, illustrating this dimension. */
  sample: string;
  /** The 0-5 score this excerpt should earn for the dimension. */
  score: number;
  /** One-line justification, in the same language as `sample`. */
  rationale: string;
}

export interface DimensionExemplarPair {
  weak: DimensionExemplar;
  strong: DimensionExemplar;
}

export const EVALUATOR_EXEMPLARS: Record<
  WorkbenchDimension,
  Record<WorkbenchLanguage, DimensionExemplarPair>
> = {
  role: {
    en: {
      weak: {
        sample: 'Write some marketing copy for my product.',
        score: 1,
        rationale: 'No role assigned — the model has to guess who it should be.',
      },
      strong: {
        sample:
          'You are a senior B2B SaaS copywriter who specializes in developer tools. Write the hero headline and subhead for our API monitoring product.',
        score: 5,
        rationale:
          'A specific, relevant persona (B2B SaaS copywriter, dev-tools niche) shapes voice and expertise.',
      },
    },
    ja: {
      weak: {
        sample: '製品のマーケティングコピーを書いて。',
        score: 1,
        rationale: '役割の指定がなく、誰として書くべきかをモデルが推測するしかない。',
      },
      strong: {
        sample:
          'あなたは開発者向けツールを専門とするB2B SaaSのシニアコピーライターです。API監視製品のヒーロー見出しとサブ見出しを書いてください。',
        score: 5,
        rationale:
          '具体的で関連性の高いペルソナ（B2B SaaS・開発者ツール領域）がトーンと専門性を決めている。',
      },
    },
  },

  context: {
    en: {
      weak: {
        sample: 'Help me write a follow-up email to a customer.',
        score: 1,
        rationale: 'No situation given — who the customer is, what happened, or the goal.',
      },
      strong: {
        sample:
          'A customer raised a billing dispute last week; we refunded them and fixed the pricing bug. They are a 2-year enterprise account. Write a follow-up email rebuilding trust.',
        score: 5,
        rationale:
          'Rich, relevant background (dispute, resolution, account tenure) lets the output be specific.',
      },
    },
    ja: {
      weak: {
        sample: '顧客へのフォローアップメールを書くのを手伝って。',
        score: 1,
        rationale: '状況の説明がなく、顧客が誰で何が起きたのか、目的も不明。',
      },
      strong: {
        sample:
          '先週、顧客から請求に関する苦情があり、返金して価格設定のバグも修正しました。相手は2年契約のエンタープライズ顧客です。信頼を取り戻すフォローアップメールを書いてください。',
        score: 5,
        rationale:
          '関連する豊富な背景（苦情・対応・契約年数）が示され、具体的な出力が可能になっている。',
      },
    },
  },

  task: {
    en: {
      weak: {
        sample: 'Tell me about our quarterly numbers.',
        score: 1,
        rationale: 'The ask is vague — summarize? analyze? compare? produce what?',
      },
      strong: {
        sample:
          'Summarize our Q3 revenue vs Q2 in three bullet points, each naming the metric, the % change, and the single biggest driver.',
        score: 5,
        rationale:
          'A precise, bounded task: what to produce, how many items, and what each must contain.',
      },
    },
    ja: {
      weak: {
        sample: '四半期の数字について教えて。',
        score: 1,
        rationale: '依頼が曖昧で、要約か分析か比較か、何を作るのかが不明。',
      },
      strong: {
        sample:
          'Q3の売上をQ2と比較し、3つの箇条書きで要約してください。各項目に指標名・変化率・最大の要因を1つずつ含めること。',
        score: 5,
        rationale:
          '何を・いくつ・各項目に何を含めるかが明確で、範囲が限定された依頼になっている。',
      },
    },
  },

  constraints: {
    en: {
      weak: {
        sample: 'Write a product announcement.',
        score: 1,
        rationale: 'No limits on length, tone, audience, or what to avoid.',
      },
      strong: {
        sample:
          'Write a product announcement under 120 words, in a confident but not hype-y tone, for non-technical small-business owners. Do not mention competitors or use jargon.',
        score: 5,
        rationale:
          'Length, tone, audience, and explicit exclusions all constrain the output cleanly.',
      },
    },
    ja: {
      weak: {
        sample: '製品の発表文を書いて。',
        score: 1,
        rationale: '長さ・トーン・読み手・避けるべき内容などの制約がない。',
      },
      strong: {
        sample:
          '120語以内で、自信はあるが誇張しないトーンの製品発表文を、技術に詳しくない中小企業の経営者向けに書いてください。競合への言及と専門用語は避けること。',
        score: 5,
        rationale:
          '長さ・トーン・読み手・除外事項が明示され、出力をきれいに制約している。',
      },
    },
  },

  format: {
    en: {
      weak: {
        sample: 'Give me ideas for our newsletter.',
        score: 1,
        rationale: 'No structure requested — prose, list, table, and length all undefined.',
      },
      strong: {
        sample:
          'Return a markdown table with columns Topic, Hook, and CTA, one row per idea, exactly five rows.',
        score: 5,
        rationale:
          'Output shape is fully specified: medium, columns, row meaning, and count.',
      },
    },
    ja: {
      weak: {
        sample: 'ニュースレターのアイデアをちょうだい。',
        score: 1,
        rationale: '構造の指定がなく、文章か箇条書きか表か、長さも不明。',
      },
      strong: {
        sample:
          '「テーマ・フック・CTA」を列に持つMarkdownの表で返してください。1アイデアにつき1行、ちょうど5行にすること。',
        score: 5,
        rationale:
          '媒体・列・各行の意味・行数まで、出力の形が完全に指定されている。',
      },
    },
  },

  examples: {
    en: {
      weak: {
        sample: 'Write taglines in our brand voice.',
        score: 1,
        rationale: 'Claims a "brand voice" but gives no sample to anchor it.',
      },
      strong: {
        sample:
          'Our voice sounds like these: "Ship faster. Sleep better." and "Less config, more cooking." Write three new taglines in that same style.',
        score: 5,
        rationale:
          'Concrete few-shot examples pin down the exact voice the model should match.',
      },
    },
    ja: {
      weak: {
        sample: 'うちのブランドの声でタグラインを書いて。',
        score: 1,
        rationale: '「ブランドの声」と言いつつ、基準となるサンプルが示されていない。',
      },
      strong: {
        sample:
          'うちの声はこんな感じです：「もっと速く出荷、もっとぐっすり眠る。」「設定は減らし、手を動かす時間を増やす。」この同じ調子で新しいタグラインを3つ書いてください。',
        score: 5,
        rationale:
          '具体的なfew-shot例があり、モデルが合わせるべき声が正確に定まっている。',
      },
    },
  },
};
