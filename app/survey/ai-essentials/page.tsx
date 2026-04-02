'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ─── Option sets ──────────────────────────────────────────────────────────────

const PROFESSIONAL_BACKGROUNDS = [
  'Business Owner / Entrepreneur',
  'Corporate Employee (Non-Technical)',
  'Engineer / Developer',
  'Designer / Creative',
  'Marketing / Sales',
  'Finance / Accounting',
  'Healthcare / Medical',
  'Education / Academia',
  'Legal / Compliance',
  'Consultant / Freelancer',
  'Student',
  'Government / Public Sector',
  'Non-Profit',
  'Other',
];

const ROLE_DESCRIPTIONS = [
  'I manage a team or business',
  'I work independently on projects',
  'I support others (admin, operations)',
  'I create content or designs',
  'I analyze data or write reports',
  'I build or maintain technical systems',
  'I am studying or in training',
  'Other',
];

const AI_KNOWLEDGE_LEVELS = [
  "Complete beginner — I've never used AI tools",
  "Curious — I've heard of ChatGPT but barely tried it",
  "Occasional user — I try AI tools sometimes but don't rely on them",
  "Regular user — I use AI tools weekly and want to go deeper",
];

const AI_TOOLS = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Copilot (Microsoft)',
  'Midjourney / DALL·E / image AI',
  'Notion AI',
  'Grammarly / writing AI',
  'AI in Google Docs / Gmail',
  'Voice assistants (Alexa, Siri)',
  'None yet',
];

const USAGE_FREQUENCIES = [
  'Never',
  'Once or twice total',
  'A few times a month',
  'A few times a week',
  'Daily',
];

const LEARNING_REASONS = [
  'Save time on repetitive tasks',
  'Improve my writing or communication',
  'Understand AI well enough to lead teams using it',
  'Stay competitive in my industry',
  'Build or launch something new',
  'Help my business or clients',
  'Personal curiosity and growth',
  'Prepare for a career change',
  'Keep up with colleagues who already use AI',
  'Reduce costs in my work',
  'Better understand the AI tools my company is adopting',
  'Other',
];

const AI_HELP_WITH = [
  'Writing and editing',
  'Research and summarizing information',
  'Planning and organizing',
  'Customer communication',
  'Marketing and content creation',
  'Data analysis',
  'Coding or technical tasks',
  'Learning new skills faster',
  'Automating repetitive work',
  'Decision making support',
  'Creating presentations or visuals',
  'Other',
];

const SUCCESS_DEFINITIONS = [
  'I can use at least 2–3 AI tools confidently in my daily work',
  'I understand enough to teach others on my team',
  'I have a clear plan for where AI fits in my work or business',
  'I built or prototyped something using AI',
  'I feel less intimidated and more excited about AI',
  'I can have informed conversations about AI with clients or stakeholders',
];

const CURRENT_FEELINGS = [
  'Excited — I want to dive in as fast as possible',
  'Curious but cautious — I want to understand before I commit',
  'A little nervous — I worry it might be too technical for me',
  "Skeptical — I'm not sure AI is as useful as people say",
  "Overwhelmed — There is so much out there, I don't know where to start",
];

const HAS_LAPTOP_OPTIONS = [
  'Yes, I will bring my own laptop',
  'No, I will need to borrow one',
  "I'm not sure yet",
];

const ZOOM_OPTIONS = [
  'Yes, I use Zoom regularly',
  "I've used it once or twice",
  "No, I've never used Zoom",
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
    <div className="mb-6 border-b border-[var(--border-primary)] pb-3">
      <h2 className="font-['DM_Serif_Display'] text-xl text-[var(--fg-primary)]">{en}</h2>
      <p className="mt-0.5 font-['Noto_Sans_JP'] text-sm text-[var(--fg-tertiary)]">{jp}</p>
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
      <p className="text-sm font-semibold text-[var(--fg-secondary)]">
        {num}. {en}
        {required && <span className="ml-1 text-[var(--accent-teal)]">*</span>}
      </p>
      <p className="mt-0.5 font-['Noto_Sans_JP'] text-xs text-[var(--fg-tertiary)]">{jp}</p>
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
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={cn(
            'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors duration-[var(--duration-fast)]',
            value === opt
              ? 'border-[var(--accent-teal)] bg-[var(--bg-glass)] text-[var(--fg-primary)]'
              : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--fg-secondary)] hover:border-[var(--border-hover)]',
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="sr-only"
          />
          <span
            className={cn(
              'h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
              value === opt
                ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]'
                : 'border-[var(--border-primary)]',
            )}
          />
          <span className="text-sm leading-snug">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  values,
  onChange,
  maxItems,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  maxItems?: number;
}) {
  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else if (!maxItems || values.length < maxItems) {
      onChange([...values, opt]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = values.includes(opt);
        const disabled = !checked && !!maxItems && values.length >= maxItems;
        return (
          <label
            key={opt}
            className={cn(
              'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors duration-[var(--duration-fast)]',
              checked
                ? 'border-[var(--accent-teal)] bg-[var(--bg-glass)] text-[var(--fg-primary)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--fg-secondary)]',
              disabled && 'cursor-not-allowed opacity-40',
              !checked && !disabled && 'hover:border-[var(--border-hover)]',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(opt)}
              className="sr-only"
            />
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                checked
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]'
                  : 'border-[var(--border-primary)]',
              )}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="text-sm leading-snug">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiEssentialsSurveyPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};

    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!form.professional_background) next.professional_background = 'Please select an option.';
    if (!form.role_description) next.role_description = 'Please select an option.';
    if (!form.ai_knowledge_level) next.ai_knowledge_level = 'Please select an option.';
    if (form.ai_tools_used.length === 0) next.ai_tools_used = 'Please select at least one.';
    if (!form.ai_usage_frequency) next.ai_usage_frequency = 'Please select an option.';
    if (form.learning_reasons.length === 0) next.learning_reasons = 'Please select at least one.';
    if (form.ai_help_with.length === 0) next.ai_help_with = 'Please select at least one.';
    if (!form.success_definition) next.success_definition = 'Please select an option.';
    if (!form.current_feeling) next.current_feeling = 'Please select an option.';
    if (!form.has_laptop) next.has_laptop = 'Please select an option.';
    if (!form.used_zoom_before) next.used_zoom_before = 'Please select an option.';

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
        body: JSON.stringify(form),
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
      <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-16">
        <div className="mx-auto max-w-[600px] text-center">
          <div className="mb-6 text-5xl">🌺</div>
          <h1 className="mb-3 font-['DM_Serif_Display'] text-3xl text-[var(--fg-primary)]">
            Thank you!
          </h1>
          <p className="mb-2 text-[var(--fg-secondary)]">
            Your response has been received. We&apos;ll review it before Session 1 to make the
            course as relevant as possible for your background and goals.
          </p>
          <p className="font-['Noto_Sans_JP'] text-sm text-[var(--fg-tertiary)]">
            ご回答ありがとうございます。第1回セッション前に内容を確認し、できる限りお役に立てる授業を準備いたします。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-12">
      <div className="mx-auto max-w-[600px]">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">
            HonuVibe.AI × Vertice Society
          </p>
          <h1 className="mb-2 font-['DM_Serif_Display'] text-3xl text-[var(--fg-primary)]">
            AI Essentials — Pre-Course Survey
          </h1>
          <p className="font-['Noto_Sans_JP'] text-sm text-[var(--fg-secondary)]">
            AIエッセンシャルズ — 受講前アンケート
          </p>
          <p className="mt-4 text-sm text-[var(--fg-tertiary)]">
            13 questions · 3–5 min · <span className="text-[var(--accent-teal)]">*</span> = required
          </p>
          <p className="mt-1 font-['Noto_Sans_JP'] text-xs text-[var(--fg-muted)]">
            13問 · 所要時間3〜5分 · <span className="text-[var(--accent-teal)]">*</span> は必須項目
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">

          {/* ── Section 1: About You ── */}
          <section>
            <SectionHeader en="About You" jp="あなたについて" />

            {/* Q1 */}
            <div className="mb-8">
              <QuestionLabel num={1} en="What is your name?" jp="お名前をお聞かせください。" required />
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Your name / お名前"
                data-error={errors.name ? true : undefined}
                className={cn(
                  'h-12 w-full rounded-lg border bg-[var(--bg-secondary)] px-4 text-[16px] text-[var(--fg-primary)]',
                  'placeholder:text-[var(--fg-muted)]',
                  'focus:outline-none focus:ring-1',
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-[var(--border-primary)] focus:border-[var(--accent-teal)] focus:ring-[var(--accent-teal)]',
                )}
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Q2 */}
            <div className="mb-8" data-error={errors.professional_background ? true : undefined}>
              <QuestionLabel
                num={2}
                en="Which best describes your professional background?"
                jp="あなたの職業・バックグラウンドに最も近いものを選んでください。"
                required
              />
              <RadioGroup
                name="professional_background"
                options={PROFESSIONAL_BACKGROUNDS}
                value={form.professional_background}
                onChange={(v) => set('professional_background', v)}
              />
              {errors.professional_background && (
                <p className="mt-1.5 text-sm text-red-500">{errors.professional_background}</p>
              )}
            </div>

            {/* Q3 */}
            <div className="mb-2" data-error={errors.role_description ? true : undefined}>
              <QuestionLabel
                num={3}
                en="Which best describes what you do day-to-day?"
                jp="日常の業務内容に最も近いものを選んでください。"
                required
              />
              <RadioGroup
                name="role_description"
                options={ROLE_DESCRIPTIONS}
                value={form.role_description}
                onChange={(v) => set('role_description', v)}
              />
              {errors.role_description && (
                <p className="mt-1.5 text-sm text-red-500">{errors.role_description}</p>
              )}
            </div>
          </section>

          {/* ── Section 2: AI Experience ── */}
          <section>
            <SectionHeader en="Your AI Experience" jp="AIの使用経験" />

            {/* Q4 */}
            <div className="mb-8" data-error={errors.ai_knowledge_level ? true : undefined}>
              <QuestionLabel
                num={4}
                en="How would you describe your current knowledge of AI tools?"
                jp="現在のAIツールに関する理解度を教えてください。"
                required
              />
              <RadioGroup
                name="ai_knowledge_level"
                options={AI_KNOWLEDGE_LEVELS}
                value={form.ai_knowledge_level}
                onChange={(v) => set('ai_knowledge_level', v)}
              />
              {errors.ai_knowledge_level && (
                <p className="mt-1.5 text-sm text-red-500">{errors.ai_knowledge_level}</p>
              )}
            </div>

            {/* Q5 */}
            <div className="mb-8" data-error={errors.ai_tools_used ? true : undefined}>
              <QuestionLabel
                num={5}
                en="Which AI tools have you tried? (Select all that apply)"
                jp="これまでに使ったことがあるAIツールを選んでください（複数選択可）。"
                required
              />
              <CheckboxGroup
                options={AI_TOOLS}
                values={form.ai_tools_used}
                onChange={(v) => set('ai_tools_used', v)}
              />
              {errors.ai_tools_used && (
                <p className="mt-1.5 text-sm text-red-500">{errors.ai_tools_used}</p>
              )}
            </div>

            {/* Q6 */}
            <div className="mb-2" data-error={errors.ai_usage_frequency ? true : undefined}>
              <QuestionLabel
                num={6}
                en="How often do you currently use AI tools?"
                jp="現在、どのくらいの頻度でAIツールを使用していますか？"
                required
              />
              <RadioGroup
                name="ai_usage_frequency"
                options={USAGE_FREQUENCIES}
                value={form.ai_usage_frequency}
                onChange={(v) => set('ai_usage_frequency', v)}
              />
              {errors.ai_usage_frequency && (
                <p className="mt-1.5 text-sm text-red-500">{errors.ai_usage_frequency}</p>
              )}
            </div>
          </section>

          {/* ── Section 3: Goals ── */}
          <section>
            <SectionHeader en="Your Goals" jp="受講の目的" />

            {/* Q7 */}
            <div className="mb-8" data-error={errors.learning_reasons ? true : undefined}>
              <QuestionLabel
                num={7}
                en="Why do you want to learn AI? (Select all that apply)"
                jp="AIを学びたい理由を教えてください（複数選択可）。"
                required
              />
              <CheckboxGroup
                options={LEARNING_REASONS}
                values={form.learning_reasons}
                onChange={(v) => set('learning_reasons', v)}
              />
              {errors.learning_reasons && (
                <p className="mt-1.5 text-sm text-red-500">{errors.learning_reasons}</p>
              )}
            </div>

            {/* Q8 */}
            <div className="mb-2" data-error={errors.ai_help_with ? true : undefined}>
              <QuestionLabel
                num={8}
                en="What do you most want AI to help you with? (Choose up to 3)"
                jp="AIに最も役立ててほしいことは何ですか？（最大3つ選択）"
                required
              />
              {form.ai_help_with.length >= 3 && (
                <p className="mb-2 text-xs text-[var(--fg-tertiary)]">
                  Maximum 3 selected · 最大3つまで選択できます
                </p>
              )}
              <CheckboxGroup
                options={AI_HELP_WITH}
                values={form.ai_help_with}
                onChange={(v) => set('ai_help_with', v)}
                maxItems={3}
              />
              {errors.ai_help_with && (
                <p className="mt-1.5 text-sm text-red-500">{errors.ai_help_with}</p>
              )}
            </div>
          </section>

          {/* ── Section 4: Expectations ── */}
          <section>
            <SectionHeader en="Your Expectations" jp="期待すること" />

            {/* Q9 */}
            <div className="mb-8" data-error={errors.success_definition ? true : undefined}>
              <QuestionLabel
                num={9}
                en="After this course, success for me would look like…"
                jp="このコースを終えた後、こうなっていれば成功だと思う。"
                required
              />
              <RadioGroup
                name="success_definition"
                options={SUCCESS_DEFINITIONS}
                value={form.success_definition}
                onChange={(v) => set('success_definition', v)}
              />
              {errors.success_definition && (
                <p className="mt-1.5 text-sm text-red-500">{errors.success_definition}</p>
              )}
            </div>

            {/* Q10 */}
            <div className="mb-2" data-error={errors.current_feeling ? true : undefined}>
              <QuestionLabel
                num={10}
                en="How do you feel right now about learning AI?"
                jp="今、AIを学ぶことに対してどんな気持ちですか？"
                required
              />
              <RadioGroup
                name="current_feeling"
                options={CURRENT_FEELINGS}
                value={form.current_feeling}
                onChange={(v) => set('current_feeling', v)}
              />
              {errors.current_feeling && (
                <p className="mt-1.5 text-sm text-red-500">{errors.current_feeling}</p>
              )}
            </div>
          </section>

          {/* ── Section 5: Free Writing ── */}
          <section>
            <SectionHeader en="Free Writing (Optional)" jp="自由記述（任意）" />

            {/* Q11 */}
            <div className="mb-2">
              <QuestionLabel
                num={11}
                en="Is there anything specific you're hoping to learn or any context you'd like us to know?"
                jp="特に学びたいことや、事前に知っておいてほしいことがあれば自由にご記入ください。"
              />
              <textarea
                value={form.specific_interests}
                onChange={(e) => set('specific_interests', e.target.value)}
                rows={4}
                placeholder="Optional / 任意"
                className={cn(
                  'w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]',
                  'px-4 py-3 text-[16px] text-[var(--fg-primary)]',
                  'placeholder:text-[var(--fg-muted)]',
                  'focus:border-[var(--accent-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)]',
                  'resize-y font-[\'Noto_Sans_JP\'] leading-[1.75]',
                )}
              />
            </div>
          </section>

          {/* ── Section 6: Logistics ── */}
          <section>
            <SectionHeader en="Logistics" jp="確認事項" />

            {/* Q12 */}
            <div className="mb-8" data-error={errors.has_laptop ? true : undefined}>
              <QuestionLabel
                num={12}
                en="Will you have a laptop available during the course sessions?"
                jp="コースのセッション中、ノートパソコンを使用できますか？"
                required
              />
              <RadioGroup
                name="has_laptop"
                options={HAS_LAPTOP_OPTIONS}
                value={form.has_laptop}
                onChange={(v) => set('has_laptop', v)}
              />
              {errors.has_laptop && (
                <p className="mt-1.5 text-sm text-red-500">{errors.has_laptop}</p>
              )}
            </div>

            {/* Q13 */}
            <div className="mb-2" data-error={errors.used_zoom_before ? true : undefined}>
              <QuestionLabel
                num={13}
                en="Have you used Zoom for video calls before?"
                jp="Zoomを使ったビデオ通話の経験はありますか？"
                required
              />
              <RadioGroup
                name="used_zoom_before"
                options={ZOOM_OPTIONS}
                value={form.used_zoom_before}
                onChange={(v) => set('used_zoom_before', v)}
              />
              {errors.used_zoom_before && (
                <p className="mt-1.5 text-sm text-red-500">{errors.used_zoom_before}</p>
              )}
            </div>
          </section>

          {/* ── Submit ── */}
          <div className="pt-4">
            {status === 'error' && (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={cn(
                'h-14 w-full rounded-lg font-semibold text-white transition-all duration-[var(--duration-normal)]',
                'bg-[var(--accent-teal)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {status === 'submitting' ? 'Submitting… / 送信中…' : 'Submit Survey / アンケートを送信'}
            </button>
            <p className="mt-3 text-center text-xs text-[var(--fg-muted)]">
              Your responses help us tailor the course to your cohort. · ご回答はコース内容のカスタマイズに活用されます。
            </p>
          </div>

        </form>
      </div>
    </main>
  );
}
