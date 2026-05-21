'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Trash2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createVaultPrompt,
  updateVaultPrompt,
  deleteVaultPrompt,
  swapVaultPromptOrder,
} from '@/lib/vault/actions';
import type { VaultPrompt, VaultRecommendedModel } from '@/lib/vault/types';

type VaultPromptListEditorProps = {
  contentItemId: string;
  prompts: VaultPrompt[];
};

const MODELS: (VaultRecommendedModel | '')[] = ['', 'openai', 'anthropic', 'google', 'any'];

const MODEL_LABEL: Record<string, string> = {
  '': 'None',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  any: 'Any',
};

type DraftPrompt = {
  title_en: string;
  title_jp: string;
  prompt_text_en: string;
  prompt_text_jp: string;
  use_case_en: string;
  use_case_jp: string;
  recommended_model: VaultRecommendedModel | '';
};

const emptyDraft = (): DraftPrompt => ({
  title_en: '',
  title_jp: '',
  prompt_text_en: '',
  prompt_text_jp: '',
  use_case_en: '',
  use_case_jp: '',
  recommended_model: '',
});

export function VaultPromptListEditor({ contentItemId, prompts }: VaultPromptListEditorProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<DraftPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!newDraft || !newDraft.title_en.trim() || !newDraft.prompt_text_en.trim()) {
      setError('Title (EN) and prompt text (EN) are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createVaultPrompt(contentItemId, {
        title_en: newDraft.title_en,
        title_jp: newDraft.title_jp || undefined,
        prompt_text_en: newDraft.prompt_text_en,
        prompt_text_jp: newDraft.prompt_text_jp || undefined,
        use_case_en: newDraft.use_case_en || undefined,
        use_case_jp: newDraft.use_case_jp || undefined,
        recommended_model: newDraft.recommended_model || null,
      });
      setNewDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add prompt');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this prompt?')) return;
    setBusy(true);
    try {
      await deleteVaultPrompt(id);
      if (expandedId === id) setExpandedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(promptId: string, direction: 'up' | 'down') {
    const idx = prompts.findIndex((p) => p.id === promptId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= prompts.length) return;
    setBusy(true);
    try {
      await swapVaultPromptOrder(promptId, prompts[swapIdx].id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {prompts.length === 0 && !newDraft && (
        <p className="text-xs text-fg-tertiary">No prompts yet.</p>
      )}

      {prompts.map((p, idx) => (
        <PromptRow
          key={p.id}
          prompt={p}
          isExpanded={expandedId === p.id}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onDelete={() => handleDelete(p.id)}
          onMoveUp={idx > 0 ? () => handleMove(p.id, 'up') : null}
          onMoveDown={idx < prompts.length - 1 ? () => handleMove(p.id, 'down') : null}
          busy={busy}
          onSaved={() => router.refresh()}
        />
      ))}

      {newDraft ? (
        <PromptDraftForm
          draft={newDraft}
          onChange={setNewDraft}
          onCancel={() => { setNewDraft(null); setError(''); }}
          onSubmit={handleCreate}
          submitLabel="Add Prompt"
          busy={busy}
          error={error}
        />
      ) : (
        <button
          type="button"
          onClick={() => setNewDraft(emptyDraft())}
          className="flex items-center gap-1.5 text-sm text-accent-teal hover:text-accent-teal/80 transition-colors"
        >
          <Plus size={14} />
          Add Prompt
        </button>
      )}

      {error && !newDraft && (
        <p className="text-xs text-accent-coral">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-prompt row (collapsed summary + expanded edit form)
// ---------------------------------------------------------------------------

type PromptRowProps = {
  prompt: VaultPrompt;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
  busy: boolean;
  onSaved: () => void;
};

function PromptRow({ prompt, isExpanded, onToggle, onDelete, onMoveUp, onMoveDown, busy, onSaved }: PromptRowProps) {
  const [draft, setDraft] = useState<DraftPrompt>({
    title_en: prompt.title_en,
    title_jp: prompt.title_jp ?? '',
    prompt_text_en: prompt.prompt_text_en,
    prompt_text_jp: prompt.prompt_text_jp ?? '',
    use_case_en: prompt.use_case_en ?? '',
    use_case_jp: prompt.use_case_jp ?? '',
    recommended_model: (prompt.recommended_model ?? '') as VaultRecommendedModel | '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await updateVaultPrompt(prompt.id, {
        title_en: draft.title_en,
        title_jp: draft.title_jp,
        prompt_text_en: draft.prompt_text_en,
        prompt_text_jp: draft.prompt_text_jp,
        use_case_en: draft.use_case_en,
        use_case_jp: draft.use_case_jp,
        recommended_model: draft.recommended_model || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-bg-tertiary border border-border-default">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left text-sm text-fg-primary font-medium truncate"
        >
          {prompt.title_en || 'Untitled prompt'}
          {prompt.recommended_model && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-bg-secondary text-fg-tertiary">
              {MODEL_LABEL[prompt.recommended_model] ?? prompt.recommended_model}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!onMoveUp || busy}
            onClick={() => onMoveUp?.()}
            className="p-1 text-fg-tertiary hover:text-fg-primary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            disabled={!onMoveDown || busy}
            onClick={() => onMoveDown?.()}
            className="p-1 text-fg-tertiary hover:text-fg-primary disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="p-1 text-fg-tertiary hover:text-accent-coral disabled:opacity-30"
            aria-label="Delete prompt"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border-default p-3">
          <PromptFields draft={draft} onChange={setDraft} />
          {error && <p className="text-xs text-accent-coral mt-2">{error}</p>}
          <div className="flex items-center gap-2 mt-3">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <button
              type="button"
              onClick={onToggle}
              className="text-xs text-fg-tertiary hover:text-fg-primary"
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable field set + new-draft form
// ---------------------------------------------------------------------------

type PromptDraftFormProps = {
  draft: DraftPrompt;
  onChange: (d: DraftPrompt) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  error: string;
};

function PromptDraftForm({ draft, onChange, onCancel, onSubmit, submitLabel, busy, error }: PromptDraftFormProps) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-bg-tertiary border border-border-default">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-fg-primary">New Prompt</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-fg-tertiary hover:text-fg-primary"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
      <PromptFields draft={draft} onChange={onChange} />
      {error && <p className="text-xs text-accent-coral">{error}</p>}
      <Button variant="primary" size="sm" onClick={onSubmit} disabled={busy}>
        <Plus size={14} className="mr-1" />
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );
}

function PromptFields({ draft, onChange }: { draft: DraftPrompt; onChange: (d: DraftPrompt) => void }) {
  const set = <K extends keyof DraftPrompt>(key: K, value: DraftPrompt[K]) =>
    onChange({ ...draft, [key]: value });
  const input =
    'w-full px-3 py-2 text-sm rounded-lg bg-bg-secondary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal';
  const textarea = `${input} font-mono resize-y`;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Title (EN) *</label>
          <input
            type="text"
            value={draft.title_en}
            onChange={(e) => set('title_en', e.target.value)}
            placeholder="Generate marketing copy"
            className={input}
          />
        </div>
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Title (JP)</label>
          <input
            type="text"
            value={draft.title_jp}
            onChange={(e) => set('title_jp', e.target.value)}
            placeholder="マーケティングコピーを生成"
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Use case (EN)</label>
          <input
            type="text"
            value={draft.use_case_en}
            onChange={(e) => set('use_case_en', e.target.value)}
            placeholder="When to use this prompt"
            className={input}
          />
        </div>
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Use case (JP)</label>
          <input
            type="text"
            value={draft.use_case_jp}
            onChange={(e) => set('use_case_jp', e.target.value)}
            placeholder="使用場面"
            className={input}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-fg-tertiary mb-1">Prompt text (EN) *</label>
        <textarea
          value={draft.prompt_text_en}
          onChange={(e) => set('prompt_text_en', e.target.value)}
          rows={6}
          placeholder="You are a marketing expert. Generate a..."
          className={textarea}
        />
      </div>

      <div>
        <label className="block text-xs text-fg-tertiary mb-1">Prompt text (JP)</label>
        <textarea
          value={draft.prompt_text_jp}
          onChange={(e) => set('prompt_text_jp', e.target.value)}
          rows={6}
          placeholder="あなたはマーケティングの専門家です..."
          className={textarea}
        />
      </div>

      <div>
        <label className="block text-xs text-fg-tertiary mb-1">Recommended model</label>
        <select
          value={draft.recommended_model}
          onChange={(e) => set('recommended_model', e.target.value as VaultRecommendedModel | '')}
          className={input}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {MODEL_LABEL[m]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
