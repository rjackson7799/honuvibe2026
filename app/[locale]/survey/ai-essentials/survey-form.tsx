'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { validateSurveyToken } from '@/lib/survey/actions';
import type { SurveyTokenResult } from '@/lib/survey/actions';

// ─── Option type ──────────────────────────────────────────────────────────────

type Option = { en: string; jp: string; value?: string };

// ─── Option sets ──────────────────────────────────────────────────────────────

const PROFESSIONAL_BACKGROUNDS: Option[] = [
  { en: 'Business Owner / Entrepreneur', jp: '経営者・起業家' },
  { en: 'Corporate Employee (Non-Technical)', jp: '会社員（非技術系）' },
  { en: 'Engineer / Developer', jp: 'エンジニア・開発者' },
  { en: 'Designer / Creative', jp: 'デザイナー・クリエイター' },
  { en: 'Marketing / Sales', jp: 'マーケティング・営業' },
  { en: 'Finance / Accounting', jp: '財務・経理' },
  { en: 'Healthcare / Medical', jp: '医療・ヘルスケア' },
  { en: 'Education / Academia', jp: '教育・学術' },
  { en: 'Legal / Compliance', jp: '法律・コンプライアンス' },
  { en: 'Consultant / Freelancer', jp: 'コンサルタント・フリーランス' },
  { en: 'Student', jp: '学生' },
  { en: 'Government / Public Sector', jp: '行政・公共機関' },
  { en: 'Non-Profit', jp: 'NPO・非営利団体' },
  { en: 'Other', jp: 'その他' },
];

const ROLE_DESCRIPTIONS: Option[] = [
  { en: 'I manage a team or business', jp: 'チームや組織をまとめる立場にある' },
  { en: 'I work independently on projects', jp: '個人で案件やプロジェクトを進めている' },
  { en: 'I support others (admin, operations)', jp: 'サポート業務・事務・オペレーションを担当している' },
  { en: 'I create content or designs', jp: 'コンテンツ制作やデザインをしている' },
  { en: 'I analyze data or write reports', jp: 'データ分析やレポート作成をしている' },
  { en: 'I build or maintain technical systems', jp: '技術的なシステムの構築・保守をしている' },
  { en: 'I am studying or in training', jp: '勉強中・研修中' },
  { en: 'Other', jp: 'その他' },
];

const AI_KNOWLEDGE_LEVELS: Option[] = [
  { en: "Complete beginner — I've never used AI tools", jp: '完全初心者 ― AIツールを使ったことがない' },
  { en: "Curious — I've heard of ChatGPT but barely tried it", jp: '興味はある ― ChatGPTは知っているが、ほとんど試していない' },
  { en: "Occasional user — I try AI tools sometimes but don't rely on them", jp: 'たまに使う ― 試したことはあるが、日常的には使っていない' },
  { en: 'Regular user — I use AI tools weekly and want to go deeper', jp: '定期的に使う ― 毎週活用していて、さらに深めたい' },
];

const AI_TOOLS: Option[] = [
  { en: 'ChatGPT', jp: 'ChatGPT' },
  { en: 'Claude', jp: 'Claude' },
  { en: 'Gemini', jp: 'Gemini' },
  { en: 'Copilot (Microsoft)', jp: 'Copilot（Microsoft）' },
  { en: 'Midjourney / DALL·E / image AI', jp: 'Midjourney / DALL·E / 画像生成AI' },
  { en: 'Notion AI', jp: 'Notion AI' },
  { en: 'Grammarly / writing AI', jp: 'Grammarly / 文章補助AI' },
  { en: 'AI in Google Docs / Gmail', jp: 'Google ドキュメント / Gmail のAI機能' },
  { en: 'Voice assistants (Alexa, Siri)', jp: '音声アシスタント（Alexa・Siri）' },
  { en: 'None yet', jp: 'まだ使ったことがない' },
];

const USAGE_FREQUENCIES: Option[] = [
  { en: 'Never', jp: 'まったく使わない' },
  { en: 'Once or twice total', jp: '合計1〜2回程度' },
  { en: 'A few times a month', jp: '月に数回' },
  { en: 'A few times a week', jp: '週に数回' },
  { en: 'Daily', jp: '毎日' },
];

const LEARNING_REASONS: Option[] = [
  { en: 'Save time on repetitive tasks', jp: '繰り返し作業の時間を節約したい' },
  { en: 'Improve my writing or communication', jp: '文章力やコミュニケーション能力を向上させたい' },
  { en: 'Understand AI well enough to lead teams using it', jp: 'チームでAIを活用できるよう理解を深めたい' },
  { en: 'Stay competitive in my industry', jp: '業界での競争力を維持・向上させたい' },
  { en: 'Build or launch something new', jp: '新しいものを作りたい・ローンチしたい' },
  { en: 'Help my business or clients', jp: '自分のビジネスやクライアントに役立てたい' },
  { en: 'Personal curiosity and growth', jp: '純粋な好奇心と自己成長のため' },
  { en: 'Prepare for a career change', jp: 'キャリアチェンジの準備として' },
  { en: 'Keep up with colleagues who already use AI', jp: 'すでにAIを使っている同僚に追いつきたい' },
  { en: 'Reduce costs in my work', jp: '業務コストを削減したい' },
  { en: 'Better understand the AI tools my company is adopting', jp: '会社が導入しているAIツールを理解したい' },
  { en: 'Other', jp: 'その他' },
];

const AI_HELP_WITH: Option[] = [
  { en: 'Writing and editing', jp: '文章作成・編集' },
  { en: 'Research and summarizing information', jp: 'リサーチ・情報収集・要約' },
  { en: 'Planning and organizing', jp: '計画立案・スケジュール管理' },
  { en: 'Customer communication', jp: '顧客対応・コミュニケーション' },
  { en: 'Marketing and content creation', jp: 'マーケティング・コンテンツ制作' },
  { en: 'Data analysis', jp: 'データ分析' },
  { en: 'Coding or technical tasks', jp: 'コーディング・技術的な作業' },
  { en: 'Learning new skills faster', jp: '新しいスキルを素早く習得する' },
  { en: 'Automating repetitive work', jp: '繰り返し作業の自動化' },
  { en: 'Decision making support', jp: '意思決定のサポート' },
  { en: 'Creating presentations or visuals', jp: 'プレゼン資料・ビジュアルの作成' },
  { en: 'Other', jp: 'その他' },
];

const SUCCESS_DEFINITIONS: Option[] = [
  { en: 'I can use at least 2–3 AI tools confidently in my daily work', jp: '2〜3種類のAIツールを自信を持って日常業務に活用できる' },
  { en: 'I understand enough to teach others on my team', jp: 'チームの他のメンバーに教えられるくらい理解できている' },
  { en: 'I have a clear plan for where AI fits in my work or business', jp: '自分の仕事やビジネスにAIをどう活かすか、明確なプランがある' },
  { en: 'I built or prototyped something using AI', jp: 'AIを使って何か作ったり、プロトタイプを完成させた' },
  { en: 'I feel less intimidated and more excited about AI', jp: 'AIに対する不安が減り、ワクワク感が増している' },
  { en: 'I can have informed conversations about AI with clients or stakeholders', jp: 'クライアントやステークホルダーとAIについて自信を持って話せる' },
];

const CURRENT_FEELINGS: Option[] = [
  { en: 'Excited — I want to dive in as fast as possible', jp: 'ワクワクしている ― できるだけ早く始めたい' },
  { en: 'Curious but cautious — I want to understand before I commit', jp: '興味はあるが慎重 ― 深く関わる前にまず理解したい' },
  { en: 'A little nervous — I worry it might be too technical for me', jp: '少し不安 ― 自分には技術的すぎるかもしれない' },
  { en: "Skeptical — I'm not sure AI is as useful as people say", jp: '懐疑的 ― AIが言われるほど役立つか確信が持てない' },
  { en: "Overwhelmed — There is so much out there, I don't know where to start", jp: '圧倒されている ― 情報が多すぎて、どこから始めればいいかわからない' },
];

const HAS_LAPTOP_OPTIONS: Option[] = [
  { en: 'Yes, I will bring my own laptop', jp: 'はい、自分のノートパソコンを持参します' },
  { en: 'No, I will need to borrow one', jp: 'いいえ、借りる必要があります' },
  { en: "I'm not sure yet", jp: 'まだわかりません' },
];

const ZOOM_OPTIONS: Option[] = [
  { en: 'Yes, I use Zoom regularly', jp: 'はい、定期的に使っています' },
  { en: "I've used it once or twice", jp: '1〜2回使ったことがあります' },
  { en: "No, I've never used Zoom", jp: 'いいえ、使ったことはありません' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  professional_background: string;
  role_description: string;
  ai_knowledge_level: string;
  ai_tools_used: string[];
  ai_usage_frequency: string;
  learning_reasons: string[];
  ai_help_with: string[];
  success_definition: string;
  current_feeling: string;
  specific_interests: string;
  has_laptop: string;
  used_zoom_before: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  professional_background: '',
  role_description: '',
  ai_knowledge_level: '',
  ai_tools_used: [],
  ai_usage_frequency: '',
  learning_reasons: [],
  ai_help_with: [],
  success_definition: '',
  current_feeling: '',
  specific_interests: '',
  has_laptop: '',
  used_zoom_before: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ en, jp }: { en: string; jp: string }) {
  return (
    <div className="mb-6 border-b border-border-default pb-3">
      <h2 className="font-serif text-xl text-fg-primary">{en}</h2>
      <p className="mt-0.5 font-sans text-sm text-fg-tertiary">{jp}</p>
    </div>
  );
}

function QuestionLabel({
  num,
  en,
  jp,
  required,
}: {
  num: number;
  en: string;
  jp: string;
  required?: boolean;
}) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-fg-secondary">
        {num}. {en}
        {required && <span className="ml-1 text-accent-teal">*</span>}
      </p>
      <p className="mt-0.5 text-xs text-fg-tertiary">{jp}</p>
    </div>
  );
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const val = opt.value ?? opt.en;
        const checked = value === val;
        return (
          <label
            key={val}
            className={cn(
              'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150',
              checked
                ? 'border-accent-teal bg-accent-teal-subtle text-fg-primary'
                : 'border-border-default bg-bg-secondary text-fg-secondary hover:border-border-hover',
            )}
          >
            <input
              type="radio"
              name={name}
              value={val}
              checked={checked}
              onChange={() => onChange(val)}
              className="sr-only"
            />
            <span
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                checked ? 'border-accent-teal bg-accent-teal' : 'border-border-default',
              )}
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-snug">{opt.en}</span>
              <span className="text-xs text-fg-tertiary">{opt.jp}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
  maxItems,
}: {
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  maxItems?: number;
}) {
  function toggle(val: string) {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else if (!maxItems || values.length < maxItems) {
      onChange([...values, val]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const val = opt.value ?? opt.en;
        const checked = values.includes(val);
        const disabled = !checked && !!maxItems && values.length >= maxItems;
        return (
          <label
            key={val}
            className={cn(
              'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors duration-150',
              checked
                ? 'border-accent-teal bg-accent-teal-subtle text-fg-primary'
                : 'border-border-default bg-bg-secondary text-fg-secondary',
              disabled && 'cursor-not-allowed opacity-40',
              !checked && !disabled && 'hover:border-border-hover',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(val)}
              className="sr-only"
            />
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                checked ? 'border-accent-teal bg-accent-teal' : 'border-border-default',
              )}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm leading-snug">{opt.en}</span>
              <span className="text-xs text-fg-tertiary">{opt.jp}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Main form ───────────────────────────────────────────────────────────────

export function SurveyForm({ token }: { token?: string }) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Token-based assignment state
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) return;
    validateSurveyToken(token).then((result: SurveyTokenResult) => {
      if (!result) return; // invalid token — anonymous mode
      if (result.status === 'completed') {
        setAlreadyCompleted(true);
        return;
      }
      // Valid pending assignment
      setAssignmentId(result.assignmentId);
      setForm((prev) => ({ ...prev, name: result.userName }));
    });
  }, [token]);

  // Already-completed guard
  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">&#10003;</div>
          <h1 className="font-serif text-2xl text-fg-primary">Survey Complete</h1>
          <p className="text-fg-secondary">
            You&apos;ve already completed this survey — thank you! We look forward to seeing you in class.
          </p>
          <p className="text-sm text-fg-tertiary">
            Questions? Email{' '}
            <a href="mailto:help@honuvibe.com" className="text-accent-teal hover:underline">
              help@honuvibe.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) next.name = 'Please enter your name. / お名前を入力してください。';
    if (!form.professional_background) next.professional_background = 'Please select an option. / 選択してください。';
    if (!form.role_description) next.role_description = 'Please select an option. / 選択してください。';
    if (!form.ai_knowledge_level) next.ai_knowledge_level = 'Please select an option. / 選択してください。';
    if (form.ai_tools_used.length === 0) next.ai_tools_used = 'Please select at least one. / 1つ以上選択してください。';
    if (!form.ai_usage_frequency) next.ai_usage_frequency = 'Please select an option. / 選択してください。';
    if (form.learning_reasons.length === 0) next.learning_reasons = 'Please select at least one. / 1つ以上選択してください。';
    if (form.ai_help_with.length === 0) next.ai_help_with = 'Please select at least one. / 1つ以上選択してください。';
    if (!form.success_definition) next.success_definition = 'Please select an option. / 選択してください。';
    if (!form.current_feeling) next.current_feeling = 'Please select an option. / 選択してください。';
    if (!form.has_laptop) next.has_laptop = 'Please select an option. / 選択してください。';
    if (!form.used_zoom_before) next.used_zoom_before = 'Please select an option. / 選択してください。';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...(assignmentId ? { assignmentId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error || 'Something went wrong. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div data-theme="light" className="min-h-screen bg-bg-primary px-5 py-16">
        <div className="mx-auto max-w-[600px] text-center">
          <div className="mb-6 text-5xl">🌺</div>
          <h1 className="mb-3 font-serif text-3xl text-fg-primary">Thank you!</h1>
          <p className="mb-2 text-fg-secondary">
            Your response has been received. We&apos;ll review it before Session 1 to make the course as relevant as possible for your background and goals.
          </p>
          <p className="text-sm text-fg-tertiary">
            ご回答ありがとうございます。第1回セッション前に内容を確認し、できる限りお役に立てる授業を準備いたします。
          </p>
        </div>
      </div>
    );
  }

  return (
    // data-theme="light" scopes light-mode CSS variables to this subtree
    <div data-theme="light" className="min-h-screen bg-bg-primary px-5 py-12">
      <div className="mx-auto max-w-[600px]">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent-teal">
            HonuVibe.AI × Vertice Society
          </p>
          <h1 className="mb-2 font-serif text-3xl text-fg-primary">
            AI Essentials — Pre-Course Survey
          </h1>
          <p className="text-sm text-fg-secondary">
            AIエッセンシャルズ — 受講前アンケート
          </p>
          <p className="mt-4 text-sm text-fg-tertiary">
            13 questions · 3–5 min · <span className="text-accent-teal">*</span> = required
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            13問 · 所要時間3〜5分 · <span className="text-accent-teal">*</span> は必須項目
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">

          {/* ── Section 1 ── */}
          <section>
            <SectionHeader en="About You" jp="あなたについて" />

            <div className="mb-8">
              <QuestionLabel num={1} en="What is your name?" jp="お名前をお聞かせください。" required />
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Your name / お名前"
                data-error={errors.name ? true : undefined}
                className={cn(
                  'h-12 w-full rounded-lg border bg-bg-secondary px-4 text-[16px] text-fg-primary',
                  'placeholder:text-fg-muted focus:outline-none focus:ring-1',
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border-default focus:border-accent-teal focus:ring-accent-teal',
                )}
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="mb-8" data-error={errors.professional_background ? true : undefined}>
              <QuestionLabel num={2} en="Which best describes your professional background?" jp="あなたの職業・バックグラウンドに最も近いものを選んでください。" required />
              <RadioGroup name="professional_background" options={PROFESSIONAL_BACKGROUNDS} value={form.professional_background} onChange={(v) => set('professional_background', v)} />
              {errors.professional_background && <p className="mt-1.5 text-sm text-red-500">{errors.professional_background}</p>}
            </div>

            <div className="mb-2" data-error={errors.role_description ? true : undefined}>
              <QuestionLabel num={3} en="Which best describes what you do day-to-day?" jp="日常の業務内容に最も近いものを選んでください。" required />
              <RadioGroup name="role_description" options={ROLE_DESCRIPTIONS} value={form.role_description} onChange={(v) => set('role_description', v)} />
              {errors.role_description && <p className="mt-1.5 text-sm text-red-500">{errors.role_description}</p>}
            </div>
          </section>

          {/* ── Section 2 ── */}
          <section>
            <SectionHeader en="Your AI Experience" jp="AIの使用経験" />

            <div className="mb-8" data-error={errors.ai_knowledge_level ? true : undefined}>
              <QuestionLabel num={4} en="How would you describe your current knowledge of AI tools?" jp="現在のAIツールに関する理解度を教えてください。" required />
              <RadioGroup name="ai_knowledge_level" options={AI_KNOWLEDGE_LEVELS} value={form.ai_knowledge_level} onChange={(v) => set('ai_knowledge_level', v)} />
              {errors.ai_knowledge_level && <p className="mt-1.5 text-sm text-red-500">{errors.ai_knowledge_level}</p>}
            </div>

            <div className="mb-8" data-error={errors.ai_tools_used ? true : undefined}>
              <QuestionLabel num={5} en="Which AI tools have you tried? (Select all that apply)" jp="これまでに使ったことがあるAIツールを選んでください（複数選択可）。" required />
              <CheckboxGroup options={AI_TOOLS} values={form.ai_tools_used} onChange={(v) => set('ai_tools_used', v)} />
              {errors.ai_tools_used && <p className="mt-1.5 text-sm text-red-500">{errors.ai_tools_used}</p>}
            </div>

            <div className="mb-2" data-error={errors.ai_usage_frequency ? true : undefined}>
              <QuestionLabel num={6} en="How often do you currently use AI tools?" jp="現在、どのくらいの頻度でAIツールを使用していますか？" required />
              <RadioGroup name="ai_usage_frequency" options={USAGE_FREQUENCIES} value={form.ai_usage_frequency} onChange={(v) => set('ai_usage_frequency', v)} />
              {errors.ai_usage_frequency && <p className="mt-1.5 text-sm text-red-500">{errors.ai_usage_frequency}</p>}
            </div>
          </section>

          {/* ── Section 3 ── */}
          <section>
            <SectionHeader en="Your Goals" jp="受講の目的" />

            <div className="mb-8" data-error={errors.learning_reasons ? true : undefined}>
              <QuestionLabel num={7} en="Why do you want to learn AI? (Select all that apply)" jp="AIを学びたい理由を教えてください（複数選択可）。" required />
              <CheckboxGroup options={LEARNING_REASONS} values={form.learning_reasons} onChange={(v) => set('learning_reasons', v)} />
              {errors.learning_reasons && <p className="mt-1.5 text-sm text-red-500">{errors.learning_reasons}</p>}
            </div>

            <div className="mb-2" data-error={errors.ai_help_with ? true : undefined}>
              <QuestionLabel num={8} en="What do you most want AI to help you with? (Choose up to 3)" jp="AIに最も役立ててほしいことは何ですか？（最大3つ選択）" required />
              {form.ai_help_with.length >= 3 && (
                <p className="mb-2 text-xs text-fg-tertiary">Maximum 3 selected · 最大3つまで選択できます</p>
              )}
              <CheckboxGroup options={AI_HELP_WITH} values={form.ai_help_with} onChange={(v) => set('ai_help_with', v)} maxItems={3} />
              {errors.ai_help_with && <p className="mt-1.5 text-sm text-red-500">{errors.ai_help_with}</p>}
            </div>
          </section>

          {/* ── Section 4 ── */}
          <section>
            <SectionHeader en="Your Expectations" jp="期待すること" />

            <div className="mb-8" data-error={errors.success_definition ? true : undefined}>
              <QuestionLabel num={9} en="After this course, success for me would look like…" jp="このコースを終えた後、こうなっていれば成功だと思う。" required />
              <RadioGroup name="success_definition" options={SUCCESS_DEFINITIONS} value={form.success_definition} onChange={(v) => set('success_definition', v)} />
              {errors.success_definition && <p className="mt-1.5 text-sm text-red-500">{errors.success_definition}</p>}
            </div>

            <div className="mb-2" data-error={errors.current_feeling ? true : undefined}>
              <QuestionLabel num={10} en="How do you feel right now about learning AI?" jp="今、AIを学ぶことに対してどんな気持ちですか？" required />
              <RadioGroup name="current_feeling" options={CURRENT_FEELINGS} value={form.current_feeling} onChange={(v) => set('current_feeling', v)} />
              {errors.current_feeling && <p className="mt-1.5 text-sm text-red-500">{errors.current_feeling}</p>}
            </div>
          </section>

          {/* ── Section 5 ── */}
          <section>
            <SectionHeader en="Free Writing (Optional)" jp="自由記述（任意）" />
            <div className="mb-2">
              <QuestionLabel num={11} en="Is there anything specific you're hoping to learn or any context you'd like us to know?" jp="特に学びたいことや、事前に知っておいてほしいことがあれば自由にご記入ください。" />
              <textarea
                value={form.specific_interests}
                onChange={(e) => set('specific_interests', e.target.value)}
                rows={4}
                placeholder="Optional / 任意"
                className={cn(
                  'w-full rounded-lg border border-border-default bg-bg-secondary',
                  'px-4 py-3 text-[16px] text-fg-primary placeholder:text-fg-muted',
                  'focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal',
                  'resize-y leading-relaxed',
                )}
              />
            </div>
          </section>

          {/* ── Section 6 ── */}
          <section>
            <SectionHeader en="Logistics" jp="確認事項" />

            <div className="mb-8" data-error={errors.has_laptop ? true : undefined}>
              <QuestionLabel num={12} en="Will you have a laptop available during the course sessions?" jp="コースのセッション中、ノートパソコンを使用できますか？" required />
              <RadioGroup name="has_laptop" options={HAS_LAPTOP_OPTIONS} value={form.has_laptop} onChange={(v) => set('has_laptop', v)} />
              {errors.has_laptop && <p className="mt-1.5 text-sm text-red-500">{errors.has_laptop}</p>}
            </div>

            <div className="mb-2" data-error={errors.used_zoom_before ? true : undefined}>
              <QuestionLabel num={13} en="Have you used Zoom for video calls before?" jp="Zoomを使ったビデオ通話の経験はありますか？" required />
              <RadioGroup name="used_zoom_before" options={ZOOM_OPTIONS} value={form.used_zoom_before} onChange={(v) => set('used_zoom_before', v)} />
              {errors.used_zoom_before && <p className="mt-1.5 text-sm text-red-500">{errors.used_zoom_before}</p>}
            </div>
          </section>

          {/* ── Submit ── */}
          <div className="pt-4">
            {status === 'error' && (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={cn(
                'h-14 w-full rounded-lg font-semibold text-white transition-all duration-200',
                'bg-accent-teal hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {status === 'submitting' ? 'Submitting… / 送信中…' : 'Submit Survey / アンケートを送信'}
            </button>
            <p className="mt-3 text-center text-xs text-fg-muted">
              Your responses help us tailor the course to your cohort. · ご回答はコース内容のカスタマイズに活用されます。
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
