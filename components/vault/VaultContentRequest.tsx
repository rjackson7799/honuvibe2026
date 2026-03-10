'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle } from 'lucide-react';
import { submitContentRequest } from '@/lib/vault/actions';

export function VaultContentRequest() {
  const t = useTranslations('vault');
  const [topicText, setTopicText] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await submitContentRequest(topicText.trim(), tagArray.length > 0 ? tagArray : undefined);
      setSubmitted(true);
      setTopicText('');
      setTags('');
    } catch {
      // Silently fail — user still sees form
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-accent-teal/10 border border-accent-teal/20">
        <CheckCircle size={18} className="text-accent-teal shrink-0" />
        <p className="text-sm text-accent-teal">{t('content_request_success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg bg-bg-secondary border border-border-default">
      <h3 className="text-sm font-semibold text-fg-primary">{t('content_request_title')}</h3>
      <div>
        <textarea
          value={topicText}
          onChange={(e) => setTopicText(e.target.value)}
          placeholder={t('content_request_placeholder')}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal resize-none"
        />
      </div>
      <div>
        <label className="block text-xs text-fg-tertiary mb-1">{t('content_request_tags_label')}</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="python, automation, ai"
          className="w-full max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
        />
      </div>
      <button
        type="submit"
        disabled={!topicText.trim() || submitting}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent-teal text-white hover:bg-accent-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={14} />
        {t('content_request_submit')}
      </button>
    </form>
  );
}
