'use client';

import { useState, useTransition } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '@/lib/admin/event-survey-actions';
import type { QuestionInput } from '@/lib/admin/event-survey-schema';
import type { EventSurveyQuestion } from '@/lib/survey/event-surveys';
import { QuestionEditor, blankDraft, type QuestionDraft } from './QuestionEditor';

const QTYPE_LABEL: Record<EventSurveyQuestion['qtype'], string> = {
  single: 'Single choice',
  multi: 'Multiple choice',
  text: 'Free text',
};

function toDraft(q: EventSurveyQuestion): QuestionDraft {
  return {
    qtype: q.qtype,
    promptEn: q.promptEn,
    promptJp: q.promptJp,
    helpEn: q.helpEn ?? '',
    helpJp: q.helpJp ?? '',
    required: q.required,
    maxSelect: q.maxSelect,
    options: q.options.map((o) => ({ value: o.value, labelEn: o.labelEn, labelJp: o.labelJp })),
  };
}

function toInput(d: QuestionDraft): QuestionInput {
  return {
    qtype: d.qtype,
    promptEn: d.promptEn,
    promptJp: d.promptJp,
    helpEn: d.helpEn || null,
    helpJp: d.helpJp || null,
    required: d.required,
    maxSelect: d.qtype === 'multi' ? d.maxSelect : null,
    options: d.qtype === 'text' ? [] : d.options,
  };
}

export function QuestionList({
  surveyId,
  questions,
  hasResponses,
}: {
  surveyId: string;
  questions: EventSurveyQuestion[];
  hasResponses: boolean;
}) {
  // null = not editing; 'new' = adding; otherwise the question id being edited.
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setEditing(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed');
      }
    });
  }

  function save(draft: QuestionDraft) {
    run(async () => {
      const input = toInput(draft);
      if (editing === 'new') await createQuestion(surveyId, input);
      else if (editing) await updateQuestion(editing, input);
    });
  }

  function remove(id: string) {
    if (!window.confirm('Delete this question? Existing answers to it will be orphaned.')) return;
    run(() => deleteQuestion(id));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...questions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() =>
      reorderQuestions(
        surveyId,
        next.map((q) => q.id),
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-fg-primary">Questions ({questions.length})</h2>
        {editing !== 'new' && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-teal/90"
          >
            <Plus size={15} /> Add question
          </button>
        )}
      </div>

      {hasResponses && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700">
          This survey has responses. You can edit prompts, help text, option labels, and order, and
          add new options. Changing a question’s type, removing/renaming option values, and deleting
          questions are blocked to keep collected answers valid.
        </p>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {editing === 'new' && (
        <QuestionEditor
          initial={blankDraft()}
          onSave={save}
          onCancel={() => setEditing(null)}
          pending={pending}
        />
      )}

      {questions.length === 0 && editing !== 'new' ? (
        <p className="rounded-xl border border-dashed border-border-default py-8 text-center text-sm text-fg-tertiary">
          No questions yet. Add the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q, i) =>
            editing === q.id ? (
              <li key={q.id}>
                <QuestionEditor
                  initial={toDraft(q)}
                  onSave={save}
                  onCancel={() => setEditing(null)}
                  pending={pending}
                />
              </li>
            ) : (
              <li
                key={q.id}
                className="flex items-start gap-3 rounded-xl border border-border-default bg-bg-primary p-3"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => move(i, -1)}
                    className="text-fg-tertiary transition-colors hover:text-fg-primary disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === questions.length - 1}
                    onClick={() => move(i, 1)}
                    className="text-fg-tertiary transition-colors hover:text-fg-primary disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg-primary">
                    {i + 1}. {q.promptEn}
                  </p>
                  <p className="text-[13px] text-fg-tertiary">{q.promptJp}</p>
                  <p className="mt-1 text-[12px] text-fg-tertiary">
                    {QTYPE_LABEL[q.qtype]}
                    {q.required ? ' · required' : ' · optional'}
                    {q.qtype !== 'text' ? ` · ${q.options.length} options` : ''}
                    {q.qtype === 'multi' && q.maxSelect ? ` · max ${q.maxSelect}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setEditing(q.id)}
                    className="text-fg-tertiary transition-colors hover:text-accent-teal disabled:opacity-50"
                    aria-label="Edit question"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(q.id)}
                    className="text-fg-tertiary transition-colors hover:text-red-600 disabled:opacity-50"
                    aria-label="Delete question"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
