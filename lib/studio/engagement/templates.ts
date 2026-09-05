// Questionnaire templates — a typed const, not a table and not an admin UI
// (plan: "Questionnaire templates: code, not an admin route"; the repo's own
// precedent is lib/questions.ts). Ryan edits the INSTANCE every time (decision
// #6); the template changes perhaps three times in the product's life, and the
// tailoring tool schema's template_section_key enum is derived from
// TEMPLATE_SECTION_KEYS below, so template and prompt can never drift apart.
//
// The template carries BOTH _en and _ja strings even though an instance is
// single-locale (decision #4): the template is authoring source, the instance
// is a locale-resolved snapshot. That keeps /ja questionnaires from ever being
// machine-translated at request time. The JA strings ship flagged for native
// review per CLAUDE.md.
//
// One template this unit: small_business_discovery. Its seven sections are the
// studio-client-engagement skill's discovery buckets, with economics SECOND
// ("commercial terms first" — orientation only exists so the client warms up).

import {
  OTHER_VALUE,
  questionnaireManifestSchema,
  type EngagementQuestion,
  type QuestionType,
  type QuestionnaireManifest,
  type QuestionnaireSection,
} from './questions-schema';
import type { EngagementLocale } from './types';

export const TEMPLATE_SECTION_KEYS = [
  'orientation',
  'economics',
  'leadgen',
  'audience',
  'tech_ops',
  'content_brand',
  'goals_capacity',
] as const;
export type TemplateSectionKey = (typeof TEMPLATE_SECTION_KEYS)[number];

export interface TemplateOption {
  value: string;
  label_en: string;
  label_ja: string;
}

export interface TemplateSection {
  key: TemplateSectionKey;
  title_en: string;
  title_ja: string;
  blurb_en: string | null;
  blurb_ja: string | null;
}

export interface TemplateQuestion {
  id: string;
  section_key: TemplateSectionKey;
  qtype: QuestionType;
  prompt_en: string;
  prompt_ja: string;
  help_en: string | null;
  help_ja: string | null;
  required: boolean;
  options: TemplateOption[];
  allow_other: boolean;
  max_select: number | null;
  long: boolean;
}

export interface QuestionnaireTemplate {
  key: string;
  title_en: string;
  title_ja: string;
  intro_en: string;
  intro_ja: string;
  sections: TemplateSection[];
  questions: TemplateQuestion[];
}

// Shorthands so the const below reads as a questionnaire, not a schema.
function text(
  id: string,
  section_key: TemplateSectionKey,
  prompt_en: string,
  prompt_ja: string,
  opts: { help_en?: string; help_ja?: string; required?: boolean; long?: boolean } = {},
): TemplateQuestion {
  return {
    id,
    section_key,
    qtype: 'text',
    prompt_en,
    prompt_ja,
    help_en: opts.help_en ?? null,
    help_ja: opts.help_ja ?? null,
    required: opts.required ?? false,
    options: [],
    allow_other: false,
    max_select: null,
    long: opts.long ?? false,
  };
}

function choice(
  qtype: 'single' | 'multi',
  id: string,
  section_key: TemplateSectionKey,
  prompt_en: string,
  prompt_ja: string,
  options: [string, string, string][],
  opts: {
    help_en?: string;
    help_ja?: string;
    required?: boolean;
    allow_other?: boolean;
    max_select?: number;
  } = {},
): TemplateQuestion {
  return {
    id,
    section_key,
    qtype,
    prompt_en,
    prompt_ja,
    help_en: opts.help_en ?? null,
    help_ja: opts.help_ja ?? null,
    required: opts.required ?? false,
    options: options.map(([value, label_en, label_ja]) => ({ value, label_en, label_ja })),
    allow_other: opts.allow_other ?? false,
    max_select: qtype === 'multi' ? (opts.max_select ?? null) : null,
    long: false,
  };
}

export const SMALL_BUSINESS_DISCOVERY: QuestionnaireTemplate = {
  key: 'small_business_discovery',
  title_en: 'Discovery questionnaire',
  title_ja: 'ディスカバリー・アンケート',
  intro_en:
    'Thanks for taking the time. Your answers here shape what we build and how we measure it. There are no wrong answers, and rough numbers are fine — we will confirm anything important against your real records later. Your answers save automatically, so you can come back to this link anytime.',
  intro_ja:
    'お時間をいただきありがとうございます。ここでのご回答が、何を作り、どう成果を測るかの土台になります。正解はありません。数字はおおよそで構いません（重要な数値は後ほど実際の記録で確認します）。回答は自動保存されるので、このリンクからいつでも再開できます。',
  sections: [
    {
      key: 'orientation',
      title_en: 'About the business',
      title_ja: '事業について',
      blurb_en: 'A quick orientation so the rest of the questions land in context.',
      blurb_ja: 'まずは全体像を教えてください。以降の質問の前提になります。',
    },
    {
      key: 'economics',
      title_en: 'Economics',
      title_ja: '収益と商売のしくみ',
      blurb_en:
        'This is the section that matters most. Rough numbers are fine — they tell us where a website can actually move the needle.',
      blurb_ja:
        '最も重要なセクションです。おおよその数字で結構です。ウェブサイトがどこで本当に効くかを見極めるための材料になります。',
    },
    {
      key: 'leadgen',
      title_en: 'Leads & marketing',
      title_ja: '集客とマーケティング',
      blurb_en: 'Where customers come from today, and what happens when they reach out.',
      blurb_ja: '現在お客様がどこから来ているか、問い合わせが来たらどう対応しているかを教えてください。',
    },
    {
      key: 'audience',
      title_en: 'Customers & segments',
      title_ja: 'お客様とセグメント',
      blurb_en: 'Who you serve, and which of them you would most like more of.',
      blurb_ja: 'どのようなお客様がいて、どの層をもっと増やしたいかを教えてください。',
    },
    {
      key: 'tech_ops',
      title_en: 'Current tools & operations',
      title_ja: '現在のツールと運用',
      blurb_en: 'What is in place today — including anything we should leave alone.',
      blurb_ja: '現在使っているものと、触らないほうがよいものを教えてください。',
    },
    {
      key: 'content_brand',
      title_en: 'Content & brand',
      title_ja: 'コンテンツとブランド',
      blurb_en: 'The assets and voice we can build with.',
      blurb_ja: '制作に使える素材と、ブランドの雰囲気について。',
    },
    {
      key: 'goals_capacity',
      title_en: 'Goals, timeline & capacity',
      title_ja: '目標・スケジュール・体制',
      blurb_en: 'What success looks like, when you need it, and what you can put into it.',
      blurb_ja: '何をもって成功とするか、いつまでに必要か、どれくらい関われるかを教えてください。',
    },
  ],
  questions: [
    // ── orientation ─────────────────────────────────────────────────────────
    text(
      'business_summary',
      'orientation',
      'In a few sentences, what does your business do, and who is it for?',
      '御社の事業内容と、主なお客様について数行で教えてください。',
      { required: true, long: true },
    ),
    choice(
      'single',
      'years_operating',
      'orientation',
      'How long has the business been operating?',
      '創業してどのくらいになりますか？',
      [
        ['under_1', 'Less than a year', '1年未満'],
        ['1_3', '1–3 years', '1〜3年'],
        ['3_10', '3–10 years', '3〜10年'],
        ['over_10', 'More than 10 years', '10年以上'],
      ],
    ),
    choice(
      'single',
      'team_size',
      'orientation',
      'How many people work in the business, including you?',
      'ご自身を含めて、何名で運営していますか？',
      [
        ['solo', 'Just me', '自分ひとり'],
        ['2_5', '2–5', '2〜5名'],
        ['6_15', '6–15', '6〜15名'],
        ['16_50', '16–50', '16〜50名'],
        ['over_50', 'More than 50', '50名以上'],
      ],
    ),
    text(
      'decision_makers',
      'orientation',
      'Who else, if anyone, will weigh in on decisions about this project?',
      'このプロジェクトの意思決定に関わる方は、ほかにいらっしゃいますか？',
      { help_en: 'A partner, a manager, a family member — anyone we should keep in the loop.', help_ja: '共同経営者、店長、ご家族など、共有しておくべき方がいれば教えてください。' },
    ),

    // ── economics ───────────────────────────────────────────────────────────
    text(
      'best_seller',
      'economics',
      'Which product or service brings in the most money per customer?',
      '一人のお客様あたりの売上が最も大きい商品・サービスは何ですか？',
      { required: true },
    ),
    choice(
      'single',
      'revenue_per_customer',
      'economics',
      'Roughly how much does a typical customer spend with you per visit or order?',
      '一般的なお客様は、1回の来店・注文でおおよそいくら使いますか？',
      [
        ['under_100', 'Under $100', '1万円未満'],
        ['100_500', '$100–500', '1万〜5万円'],
        ['500_2000', '$500–2,000', '5万〜20万円'],
        ['2000_10000', '$2,000–10,000', '20万〜100万円'],
        ['over_10000', 'Over $10,000', '100万円以上'],
      ],
      { allow_other: true, help_en: 'A rough band is all we need.', help_ja: 'おおよその範囲で結構です。' },
    ),
    choice(
      'single',
      'new_customers_month',
      'economics',
      'About how many NEW customers do you take on in a typical month?',
      '通常の月に、新規のお客様はおよそ何名くらいですか？',
      [
        ['0_5', '0–5', '0〜5名'],
        ['6_20', '6–20', '6〜20名'],
        ['21_50', '21–50', '21〜50名'],
        ['51_200', '51–200', '51〜200名'],
        ['over_200', 'More than 200', '200名以上'],
        ['not_sure', 'Not sure', 'わからない'],
      ],
    ),
    choice(
      'single',
      'sales_cycle',
      'economics',
      'From first contact to paying, how long does a new customer usually take?',
      '初めての接点から支払いまで、新規のお客様は通常どのくらいかかりますか？',
      [
        ['same_day', 'Same day', 'その日のうち'],
        ['within_week', 'Within a week', '1週間以内'],
        ['1_4_weeks', '1–4 weeks', '1〜4週間'],
        ['1_3_months', '1–3 months', '1〜3か月'],
        ['longer', 'Longer', 'それ以上'],
      ],
    ),
    text(
      'seasonality',
      'economics',
      'When is your busiest season, and your slowest? How big is the swing?',
      '最も忙しい時期と最も暇な時期はいつですか？その差はどのくらいありますか？',
      { help_en: 'Slow months are often where a website can do the most work.', help_ja: '閑散期こそ、ウェブサイトが最も力を発揮できる場面です。' },
    ),
    text(
      'growth_target',
      'economics',
      'What would a great next 12 months look like, in numbers?',
      'これからの12か月が「最高だった」と言えるなら、数字ではどんな状態ですか？',
      { required: true, help_en: 'Revenue, bookings, customers — whichever you actually track.', help_ja: '売上、予約数、顧客数など、実際に把握している指標で構いません。' },
    ),

    // ── leadgen ─────────────────────────────────────────────────────────────
    choice(
      'multi',
      'lead_channels',
      'leadgen',
      'Where do most new customers find you today? Pick up to three.',
      '現在、新しいお客様は主にどこから来ていますか？最大3つ選んでください。',
      [
        ['google_search', 'Google search', 'Google検索'],
        ['google_maps', 'Google Maps / reviews', 'Googleマップ・口コミ'],
        ['instagram', 'Instagram', 'Instagram'],
        ['facebook', 'Facebook', 'Facebook'],
        ['video', 'TikTok / YouTube', 'TikTok・YouTube'],
        ['word_of_mouth', 'Word of mouth / referrals', '口コミ・紹介'],
        ['walk_in', 'Walk-ins / location', '通りがかり・立地'],
        ['paid_ads', 'Paid ads', '有料広告'],
        ['email', 'Email / newsletter', 'メール・ニュースレター'],
        ['partners', 'Partners / other businesses', '提携先・他の事業者'],
      ],
      { required: true, allow_other: true, max_select: 3 },
    ),
    text(
      'channel_worry',
      'leadgen',
      'Is any of those channels getting weaker or more expensive?',
      'その中で、弱まっている、あるいはコストが上がっている経路はありますか？',
    ),
    choice(
      'single',
      'lead_tracking',
      'leadgen',
      'How do you keep track of inquiries and where they came from?',
      '問い合わせとその経路は、どのように管理していますか？',
      [
        ['none', 'We do not track them', '特に管理していない'],
        ['notes', 'A notebook or spreadsheet', 'ノートやスプレッドシート'],
        ['software', 'A CRM or booking system', 'CRMや予約システム'],
        ['not_sure', 'Not sure', 'わからない'],
      ],
    ),
    text(
      'inquiry_handling',
      'leadgen',
      'When a new inquiry comes in, what happens? Who responds, and how quickly?',
      '新しい問い合わせが来たら、どうなりますか？誰が、どのくらいの速さで対応していますか？',
      { long: true },
    ),

    // ── audience ────────────────────────────────────────────────────────────
    text(
      'primary_segments',
      'audience',
      'Describe your two or three most common types of customer.',
      '最もよくいらっしゃるお客様のタイプを2〜3種類、教えてください。',
      { required: true, long: true, help_en: 'Who they are, what they come for, how they found you.', help_ja: 'どんな方か、何を求めて来るのか、どうやって知ったのか。' },
    ),
    text(
      'best_segment',
      'audience',
      'Which of those would you most like more of, and why?',
      'その中で、最も増やしたいのはどのタイプですか？理由も教えてください。',
    ),
    choice(
      'multi',
      'customer_origin',
      'audience',
      'Where are your customers mostly from?',
      'お客様は主にどこから来ていますか？',
      [
        ['local', 'Local residents', '地元の方'],
        ['domestic', 'Visitors from elsewhere in the country', '国内からの旅行者'],
        ['international', 'International visitors', '海外からの旅行者'],
        ['online', 'Online / remote', 'オンライン・遠隔'],
      ],
      { allow_other: true },
    ),
    choice(
      'multi',
      'customer_languages',
      'audience',
      'Which languages do your customers use with you?',
      'お客様とのやり取りで使う言語は何ですか？',
      [
        ['english', 'English', '英語'],
        ['japanese', 'Japanese', '日本語'],
      ],
      { allow_other: true },
    ),

    // ── tech_ops ────────────────────────────────────────────────────────────
    choice(
      'single',
      'current_site_feel',
      'tech_ops',
      'How do you feel about your current website?',
      '現在のウェブサイトについて、どう感じていますか？',
      [
        ['love', 'Proud of it', '気に入っている'],
        ['fine', 'It is fine, just dated', '悪くないが古い'],
        ['embarrassed', 'A little embarrassed by it', '少し恥ずかしい'],
        ['none', 'We do not really have one', '実質的にない'],
      ],
      { required: true },
    ),
    choice(
      'multi',
      'tools_in_use',
      'tech_ops',
      'Which tools does the business run on today?',
      '現在、事業運営に使っているツールはどれですか？',
      [
        ['booking', 'Booking / reservations', '予約システム'],
        ['pos', 'Point of sale', 'POS・レジ'],
        ['crm', 'CRM / customer list', 'CRM・顧客リスト'],
        ['email_tool', 'Email marketing', 'メール配信ツール'],
        ['ecommerce', 'Online store', 'オンラインショップ'],
        ['accounting', 'Accounting', '会計ソフト'],
        ['social_scheduler', 'Social media scheduling', 'SNS投稿管理'],
        ['none', 'None of these', '特にない'],
      ],
      { allow_other: true },
    ),
    text(
      'do_not_touch',
      'tech_ops',
      'Is there any system we should NOT replace or touch?',
      '置き換えたり手を加えたりしないほうがよいシステムはありますか？',
      { help_en: 'The booking system your staff already knows, for example.', help_ja: '例：スタッフが慣れている予約システムなど。' },
    ),
    choice(
      'single',
      'site_access',
      'tech_ops',
      'Who has the logins for your domain, hosting and current site?',
      'ドメイン、ホスティング、現在のサイトのログイン情報は誰が持っていますか？',
      [
        ['me', 'I do', '自分'],
        ['someone_else', 'Someone else (a previous developer, a staff member)', '他の人（以前の制作者やスタッフ）'],
        ['not_sure', 'Not sure', 'わからない'],
      ],
    ),
    choice(
      'single',
      'ai_comfort',
      'tech_ops',
      'How do you feel about AI tools in the business?',
      '事業でAIツールを使うことについて、どう感じていますか？',
      [
        ['daily', 'Already using them regularly', 'すでに日常的に使っている'],
        ['tried', 'Tried a few', 'いくつか試したことがある'],
        ['curious', 'Curious but have not started', '興味はあるが未着手'],
        ['skeptical', 'Skeptical', '懐疑的'],
      ],
    ),

    // ── content_brand ───────────────────────────────────────────────────────
    choice(
      'multi',
      'brand_assets',
      'content_brand',
      'Which of these do you already have?',
      'すでにお持ちのものはどれですか？',
      [
        ['logo', 'Logo files', 'ロゴデータ'],
        ['colors_fonts', 'Brand colors / fonts', 'ブランドカラー・フォント'],
        ['photos', 'Good photos', '使える写真'],
        ['video', 'Video', '動画'],
        ['testimonials', 'Reviews or testimonials we can use', '掲載できる口コミ・お客様の声'],
        ['none', 'None of these yet', 'まだ何もない'],
      ],
    ),
    choice(
      'single',
      'brand_tone',
      'content_brand',
      'If your brand were a person, how should it come across?',
      'ブランドを人にたとえると、どんな印象を与えたいですか？',
      [
        ['warm_local', 'Warm and local', '温かく、地元に根ざした'],
        ['premium', 'Premium and polished', '上質で洗練された'],
        ['playful', 'Playful and energetic', '遊び心があり、元気な'],
        ['professional', 'Calm and professional', '落ち着いていて、プロフェッショナルな'],
      ],
      { allow_other: true },
    ),
    choice(
      'single',
      'content_capacity',
      'content_brand',
      'How often could you realistically add new content (posts, photos, updates)?',
      '新しいコンテンツ（投稿・写真・更新）を現実的にどのくらいの頻度で追加できますか？',
      [
        ['weekly', 'Weekly', '毎週'],
        ['monthly', 'Monthly', '毎月'],
        ['rarely', 'Rarely', 'ほとんどできない'],
        ['need_help', 'We would need help with this', '手伝いが必要'],
      ],
    ),
    text(
      'admired_sites',
      'content_brand',
      'Any websites you admire — in your industry or not? What do you like about them?',
      '業種を問わず、良いと思うウェブサイトはありますか？どこが好きですか？',
    ),

    // ── goals_capacity ──────────────────────────────────────────────────────
    choice(
      'single',
      'top_goal',
      'goals_capacity',
      'If the new site could do only ONE thing well, what should it be?',
      '新しいサイトが一つだけ得意なことを持てるとしたら、何にしますか？',
      [
        ['inquiries', 'Bring in more inquiries', '問い合わせを増やす'],
        ['bookings', 'More bookings or online sales', '予約・オンライン販売を増やす'],
        ['credibility', 'Look as good as the work we do', '仕事の質にふさわしい見た目にする'],
        ['admin_time', 'Save time on admin and repeat questions', '事務作業やよくある質問への対応時間を減らす'],
        ['new_market', 'Reach a new market or language', '新しい市場・言語圏に届く'],
      ],
      { required: true, allow_other: true },
    ),
    text(
      'success_metric',
      'goals_capacity',
      'Six months after launch, how will you know it worked?',
      '公開から半年後、「うまくいった」と判断する基準は何ですか？',
      { required: true },
    ),
    choice(
      'single',
      'timeline',
      'goals_capacity',
      'When do you need this live?',
      'いつまでに公開が必要ですか？',
      [
        ['asap', 'As soon as possible', 'できるだけ早く'],
        ['1_2_months', 'In the next 1–2 months', '1〜2か月以内'],
        ['this_quarter', 'This quarter', '今四半期中'],
        ['flexible', 'Flexible', '柔軟に対応できる'],
      ],
    ),
    choice(
      'single',
      'budget_band',
      'goals_capacity',
      'Is there a budget range you have in mind for the initial build?',
      '初期制作の予算として、想定している範囲はありますか？',
      [
        ['under_1k', 'Under $1,000', '15万円未満'],
        ['1k_3k', '$1,000–3,000', '15万〜45万円'],
        ['3k_8k', '$3,000–8,000', '45万〜120万円'],
        ['over_8k', 'Over $8,000', '120万円以上'],
        ['not_sure', 'Not sure yet', 'まだ決めていない'],
      ],
      { allow_other: true },
    ),
    text(
      'anything_else',
      'goals_capacity',
      'Anything else we should know before we talk?',
      'お話しする前に、ほかに知っておいたほうがよいことはありますか？',
      { long: true },
    ),
  ],
};

export const QUESTIONNAIRE_TEMPLATES = {
  small_business_discovery: SMALL_BUSINESS_DISCOVERY,
} as const;
export type QuestionnaireTemplateKey = keyof typeof QUESTIONNAIRE_TEMPLATES;

export function isTemplateKey(value: unknown): value is QuestionnaireTemplateKey {
  return typeof value === 'string' && Object.hasOwn(QUESTIONNAIRE_TEMPLATES, value);
}

export interface ResolvedTemplate extends QuestionnaireManifest {
  title: string;
  intro_md: string;
}

/**
 * Resolve a template into a single-locale instance manifest. Parsed through
 * questionnaireManifestSchema so a template typo fails loudly at draft time
 * (and templates.test.ts asserts both locales parse for every template).
 */
export function resolveTemplate(template: QuestionnaireTemplate, locale: EngagementLocale): ResolvedTemplate {
  const sections: QuestionnaireSection[] = template.sections.map((s) => ({
    key: s.key,
    title: locale === 'ja' ? s.title_ja : s.title_en,
    blurb: locale === 'ja' ? s.blurb_ja : s.blurb_en,
  }));
  const questions: EngagementQuestion[] = template.questions.map((q) => ({
    id: q.id,
    section_key: q.section_key,
    qtype: q.qtype,
    prompt: locale === 'ja' ? q.prompt_ja : q.prompt_en,
    help: locale === 'ja' ? q.help_ja : q.help_en,
    required: q.required,
    options: q.options.map((o) => ({ value: o.value, label: locale === 'ja' ? o.label_ja : o.label_en })),
    allow_other: q.allow_other,
    max_select: q.max_select,
    long: q.long,
  }));
  const manifest = questionnaireManifestSchema.parse({ sections, questions });
  return {
    ...manifest,
    title: locale === 'ja' ? template.title_ja : template.title_en,
    intro_md: locale === 'ja' ? template.intro_ja : template.intro_en,
  };
}

/** Exposed for tests: the reserved value no template option may ever use. */
export const RESERVED_OPTION_VALUE = OTHER_VALUE;
