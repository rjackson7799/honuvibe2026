'use client';

// COPIED from components/admin/event-survey/QuestionList.tsx (not imported):
// keeps `move(index, dir)`, `editing: string | 'new' | null`, useTransition +
// inline error, and the row chrome. Differences: the questionnaire is a
// DOCUMENT (one saveManifest call replaces the whole manifest — questions are
// jsonb on the row, not child rows), questions are grouped by section, the
// instance is single-locale, and after send the editor drops to reword-only
// (the action rejects anything structural anyway).
//
// Every save from draft/ready clears test-fill answers and bumps
// questions_version (plan: draft test-fills are throwaway).

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { saveManifest } from '@/lib/studio/engagement/questionnaire-actions';
import type { EngagementQuestion, QuestionnaireSection } from '@/lib/studio/engagement/questions-schema';
import type { EngagementQuestionnaire } from '@/lib/admin/types';
import { QuestionnaireQuestionEditor, blankDraft, type QuestionDraft } from './QuestionnaireQuestionEditor';

const QTYPE_LABEL: Record<EngagementQuestion['qtype'], string> = {
  single: 'Single choice',
  multi: 'Multiple choice',
  text: 'Free text',
};

const INPUT =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none disabled:opacity-60';

function toDraft(q: EngagementQuestion): QuestionDraft {
  return {
    id: q.id,
    section_key: q.section_key,
    qtype: q.qtype,
    prompt: q.prompt,
    help: q.help ?? '',
    required: q.required,
    options: q.options.map((o) => ({ value: o.value, label: o.label })),
    allow_other: q.allow_other,
    max_select: q.max_select,
    long: q.long,
  };
}

function slugId(prompt: string, taken: Set<string>): string {
  const base =
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'q';
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}_${n++}`;
  return id;
}

function fromDraft(d: QuestionDraft, id: string): EngagementQuestion {
  return {
    id,
    section_key: d.section_key,
    qtype: d.qtype,
    prompt: d.prompt,
    help: d.help === '' ? null : d.help,
    required: d.required,
    options: d.options,
    allow_other: d.allow_other,
    max_select: d.max_select,
    long: d.long,
  };
}

interface Manifest {
  title: string;
  intro_md: string;
  sections: QuestionnaireSection[];
  questions: EngagementQuestion[];
}

export function QuestionnaireEditor({
  questionnaire,
  mode,
}: {
  questionnaire: EngagementQuestionnaire;
  /** full: draft/ready. reword: sent/in_progress. */
  mode: 'full' | 'reword';
}) {
  // A tailoring run replaces the manifest when it finishes; a save racing it
  // is rejected server-side (CAS) — so do not offer one.
  const tailoring = questionnaire.tailoring_status === 'generating';
  const router = useRouter();
  const rewordOnly = mode === 'reword';
  const [m, setM] = useState<Manifest>(() => ({
    title: questionnaire.title,
    intro_md: questionnaire.intro_md ?? '',
    sections: questionnaire.sections,
    questions: questionnaire.questions,
  }));
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [newSection, setNewSection] = useState<string>(questionnaire.sections[0]?.key ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);

  const bySection = useMemo(() => {
    const map = new Map<string, EngagementQuestion[]>();
    for (const s of m.sections) map.set(s.key, []);
    for (const q of m.questions) map.set(q.section_key, [...(map.get(q.section_key) ?? []), q]);
    return map;
  }, [m]);

  /** Flat order is always sections × questions-in-section. */
  function flatten(map: Map<string, EngagementQuestion[]>): EngagementQuestion[] {
    return m.sections.flatMap((s) => map.get(s.key) ?? []);
  }

  function update(next: Partial<Manifest>) {
    setM((prev) => ({ ...prev, ...next }));
    setDirty(true);
    setError(null);
  }

  function move(sectionKey: string, index: number, dir: -1 | 1) {
    const list = [...(bySection.get(sectionKey) ?? [])];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const map = new Map(bySection);
    map.set(sectionKey, list);
    update({ questions: flatten(map) });
  }

  function remove(id: string) {
    if (!window.confirm('Delete this question from the draft?')) return;
    update({ questions: m.questions.filter((q) => q.id !== id) });
    if (editing === id) setEditing(null);
  }

  function saveQuestion(draft: QuestionDraft) {
    if (editing === 'new') {
      const taken = new Set(m.questions.map((q) => q.id));
      const q = fromDraft(draft, slugId(draft.prompt, taken));
      const map = new Map(bySection);
      map.set(q.section_key, [...(map.get(q.section_key) ?? []), q]);
      update({ questions: flatten(map) });
    } else if (editing) {
      const id = editing;
      const prev = m.questions.find((q) => q.id === id);
      if (!prev) return;
      const nextQ = fromDraft(draft, id);
      if (prev.section_key === nextQ.section_key) {
        update({ questions: m.questions.map((q) => (q.id === id ? nextQ : q)) });
      } else {
        const map = new Map(bySection);
        map.set(prev.section_key, (map.get(prev.section_key) ?? []).filter((q) => q.id !== id));
        map.set(nextQ.section_key, [...(map.get(nextQ.section_key) ?? []), nextQ]);
        update({ questions: flatten(map) });
      }
    }
    setEditing(null);
  }

  function updateSection(key: string, patch: Partial<QuestionnaireSection>) {
    update({ sections: m.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  }

  function saveAll() {
    setError(null);
    startTransition(async () => {
      try {
        await saveManifest(questionnaire.id, {
          title: m.title,
          intro_md: m.intro_md || null,
          sections: m.sections.map((s) => ({ ...s, blurb: s.blurb?.trim() ? s.blurb.trim() : null })),
          questions: m.questions,
        });
        setDirty(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save the questionnaire.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[13px] font-bold text-fg-primary">
          Questions ({m.questions.length}) · v{questionnaire.questions_version}
          {dirty && <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--accent-coral)]">unsaved</span>}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMeta((v) => !v)}
            className="inline-flex items-center gap-1 min-h-[44px] px-2 text-[12px] text-fg-tertiary hover:text-fg-secondary"
          >
            <ChevronDown size={13} className={showMeta ? 'rotate-180 transition-transform' : 'transition-transform'} />
            Title &amp; intro
          </button>
          {!rewordOnly && editing !== 'new' && (
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3 min-h-[44px] text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90"
            >
              <Plus size={15} /> Add question
            </button>
          )}
          <button
            type="button"
            onClick={saveAll}
            disabled={pending || !dirty || tailoring}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[12.5px] font-semibold shadow-sm disabled:opacity-50 transition-all"
          >
            {pending ? 'Saving…' : tailoring ? 'Tailoring… (wait to save)' : rewordOnly ? 'Save wording' : 'Save questionnaire'}
          </button>
        </div>
      </div>

      {!rewordOnly && (
        <p className="text-[12px] text-fg-tertiary">
          Saving clears any test-fill answers and bumps the version — the client never sees a draft.
        </p>
      )}
      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {showMeta && (
        <div className="grid gap-3 rounded-xl border border-border-default bg-bg-primary p-3">
          <label className="block">
            <span className="block text-[12px] font-semibold text-fg-secondary mb-1">Title</span>
            <input className={INPUT} value={m.title} maxLength={200} onChange={(e) => update({ title: e.target.value })} />
          </label>
          <label className="block">
            <span className="block text-[12px] font-semibold text-fg-secondary mb-1">Intro (markdown, shown above the first section)</span>
            <textarea className={INPUT} rows={4} maxLength={5000} value={m.intro_md} onChange={(e) => update({ intro_md: e.target.value })} />
          </label>
        </div>
      )}

      {editing === 'new' && (
        <div className="space-y-2">
          <label className="block sm:max-w-[280px]">
            <span className="block text-[12px] font-semibold text-fg-secondary mb-1">Add to section</span>
            <select className={INPUT} value={newSection} onChange={(e) => setNewSection(e.target.value)}>
              {m.sections.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <QuestionnaireQuestionEditor
            key={`new-${newSection}`}
            initial={blankDraft(newSection)}
            sections={m.sections}
            rewordOnly={false}
            onSave={saveQuestion}
            onCancel={() => setEditing(null)}
            pending={pending}
          />
        </div>
      )}

      {m.sections.map((s, si) => {
        const list = bySection.get(s.key) ?? [];
        return (
          <div key={s.key} className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap border-b border-border-default pb-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-fg-tertiary">{si + 1}.</span>
              <input
                className="min-w-[200px] flex-1 bg-transparent text-[13.5px] font-semibold text-fg-primary outline-none border-b border-transparent focus:border-accent-teal"
                value={s.title}
                maxLength={120}
                onChange={(e) => updateSection(s.key, { title: e.target.value })}
                aria-label={`Section ${si + 1} title`}
              />
              <span className="text-[11px] text-fg-tertiary">{list.length} question{list.length === 1 ? '' : 's'}</span>
            </div>
            <input
              className="w-full bg-transparent text-[12.5px] text-fg-tertiary outline-none border-b border-transparent focus:border-accent-teal"
              value={s.blurb ?? ''}
              maxLength={500}
              placeholder="Section intro (optional)"
              onChange={(e) => updateSection(s.key, { blurb: e.target.value })}
              aria-label={`Section ${si + 1} intro`}
            />

            {list.length === 0 && editing !== 'new' ? (
              <p className="rounded-xl border border-dashed border-border-default py-4 text-center text-[12.5px] text-fg-tertiary">
                No questions in this section.
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((q, i) =>
                  editing === q.id ? (
                    <li key={q.id}>
                      <QuestionnaireQuestionEditor
                        initial={toDraft(q)}
                        sections={m.sections}
                        rewordOnly={rewordOnly}
                        onSave={saveQuestion}
                        onCancel={() => setEditing(null)}
                        pending={pending}
                      />
                    </li>
                  ) : (
                    <li key={q.id} className="flex items-start gap-3 rounded-xl border border-border-default bg-bg-primary p-3">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={pending || rewordOnly || i === 0}
                          onClick={() => move(s.key, i, -1)}
                          className="text-fg-tertiary transition-colors hover:text-fg-primary disabled:opacity-30 min-h-[22px] min-w-[44px] inline-flex justify-center"
                          aria-label="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={pending || rewordOnly || i === list.length - 1}
                          onClick={() => move(s.key, i, 1)}
                          className="text-fg-tertiary transition-colors hover:text-fg-primary disabled:opacity-30 min-h-[22px] min-w-[44px] inline-flex justify-center"
                          aria-label="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-fg-primary">{q.prompt}</p>
                        {q.help && <p className="text-[12.5px] text-fg-tertiary">{q.help}</p>}
                        <p className="mt-1 text-[12px] text-fg-tertiary">
                          <span className="font-mono">{q.id}</span> · {QTYPE_LABEL[q.qtype]}
                          {q.required ? ' · required' : ' · optional'}
                          {q.qtype !== 'text' ? ` · ${q.options.length} options${q.allow_other ? ' + Other' : ''}` : q.long ? ' · long' : ''}
                          {q.qtype === 'multi' && q.max_select ? ` · max ${q.max_select}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setEditing(q.id)}
                          className="text-fg-tertiary transition-colors hover:text-accent-teal disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          aria-label="Edit question"
                        >
                          <Pencil size={15} />
                        </button>
                        {!rewordOnly && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(q.id)}
                            className="text-fg-tertiary transition-colors hover:text-red-600 disabled:opacity-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                            aria-label="Delete question"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
