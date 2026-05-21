'use client';

import { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import type { VaultPrompt } from '@/lib/vault/types';

type VaultPromptPackRendererProps = {
  prompts: VaultPrompt[];
  locale: string;
  isPremium: boolean;
};

const MODEL_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  any: 'Any model',
};

const MODEL_CHIP_CLASS: Record<string, string> = {
  openai: 'bg-emerald-500/10 text-emerald-500',
  anthropic: 'bg-amber-500/10 text-amber-500',
  google: 'bg-blue-500/10 text-blue-500',
  any: 'bg-bg-tertiary text-fg-tertiary',
};

export function VaultPromptPackRenderer({ prompts, locale, isPremium }: VaultPromptPackRendererProps) {
  const [localeOverride, setLocaleOverride] = useState<'en' | 'ja' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (prompts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-6 text-center text-fg-tertiary text-sm">
        {isPremium
          ? 'Premium subscribers can view the prompts in this pack.'
          : 'This pack has no prompts yet.'}
      </div>
    );
  }

  const effectiveLocale: 'en' | 'ja' = localeOverride ?? (locale === 'ja' ? 'ja' : 'en');
  const someHaveJp = prompts.some((p) => p.title_jp || p.prompt_text_jp);

  function getPromptText(p: VaultPrompt): string {
    if (effectiveLocale === 'ja' && p.prompt_text_jp) return p.prompt_text_jp;
    return p.prompt_text_en;
  }
  function getPromptTitle(p: VaultPrompt): string {
    if (effectiveLocale === 'ja' && p.title_jp) return p.title_jp;
    return p.title_en;
  }
  function getUseCase(p: VaultPrompt): string | null {
    if (effectiveLocale === 'ja' && p.use_case_jp) return p.use_case_jp;
    return p.use_case_en;
  }

  async function handleCopy(p: VaultPrompt) {
    const text = getPromptText(p);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(p.id);
      trackEvent('vault_prompt_copy');
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts; ignore quietly.
    }
  }

  async function handleCopyAll() {
    const bundle = prompts
      .map((p) => `### ${getPromptTitle(p)}\n\n${getPromptText(p)}`)
      .join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(bundle);
      setCopiedAll(true);
      trackEvent('vault_prompt_copy_all');
      window.setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // Ignore — same caveat as above.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-fg-tertiary">
          <Sparkles size={14} className="text-accent-teal" />
          <span>{prompts.length} prompt{prompts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex items-center gap-2">
          {someHaveJp && (
            <div className="inline-flex rounded-md border border-border-default overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setLocaleOverride('en')}
                className={
                  'px-2.5 py-1 transition-colors ' +
                  (effectiveLocale === 'en'
                    ? 'bg-accent-teal text-white'
                    : 'text-fg-tertiary hover:text-fg-primary')
                }
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocaleOverride('ja')}
                className={
                  'px-2.5 py-1 transition-colors ' +
                  (effectiveLocale === 'ja'
                    ? 'bg-accent-teal text-white'
                    : 'text-fg-tertiary hover:text-fg-primary')
                }
              >
                日本語
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border-default text-fg-secondary hover:text-fg-primary hover:border-border-hover transition-colors"
          >
            {copiedAll ? <Check size={12} /> : <Copy size={12} />}
            {copiedAll ? 'Copied all' : 'Copy all'}
          </button>
        </div>
      </div>

      {prompts.map((p) => {
        const title = getPromptTitle(p);
        const text = getPromptText(p);
        const useCase = getUseCase(p);
        const modelChip =
          p.recommended_model && MODEL_LABEL[p.recommended_model]
            ? { label: MODEL_LABEL[p.recommended_model], cls: MODEL_CHIP_CLASS[p.recommended_model] }
            : null;
        const isCopied = copiedId === p.id;
        return (
          <div
            key={p.id}
            className="rounded-lg bg-bg-secondary border border-border-default p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
                {useCase && (
                  <p className="text-xs text-fg-tertiary mt-1">{useCase}</p>
                )}
              </div>
              {modelChip && (
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${modelChip.cls}`}>
                  {modelChip.label}
                </span>
              )}
            </div>
            <pre className="text-xs font-mono text-fg-secondary bg-bg-tertiary border border-border-default rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {text}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(p)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-bg-tertiary hover:bg-bg-tertiary/80 text-fg-primary transition-colors"
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              {isCopied ? 'Copied' : 'Copy prompt'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
