'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Loader2, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type {
  VocabularyItem,
  GrammarPoint,
  CulturalNote,
  ComprehensionItem,
  ESLLesson,
} from '@/lib/esl/types';

type ESLReviewPanelProps = {
  eslLessonId: string;
  onBack: () => void;
};

export function ESLReviewPanel({ eslLessonId, onBack }: ESLReviewPanelProps) {
  const t = useTranslations('esl');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [grammar, setGrammar] = useState<GrammarPoint[]>([]);
  const [culturalNotes, setCulturalNotes] = useState<CulturalNote[]>([]);
  const [comprehension, setComprehension] = useState<ComprehensionItem[]>([]);

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/esl/${eslLessonId}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to load lesson');
      }
      const { data } = (await res.json()) as { data: ESLLesson };
      setVocabulary(data.vocabulary_json ?? []);
      setGrammar(data.grammar_json ?? []);
      setCulturalNotes(data.cultural_notes_json ?? []);
      setComprehension(data.comprehension_json ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [eslLessonId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/esl/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eslLessonId,
          vocabulary_json: vocabulary,
          grammar_json: grammar,
          cultural_notes_json: culturalNotes,
          comprehension_json: comprehension,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Save failed');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // --- Vocabulary helpers ---
  function updateVocab(index: number, patch: Partial<VocabularyItem>) {
    setVocabulary((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }
  function removeVocab(index: number) {
    setVocabulary((prev) => prev.filter((_, i) => i !== index));
  }
  function addVocab() {
    const id = `vocab_${vocabulary.length}`;
    setVocabulary((prev) => [
      ...prev,
      {
        id,
        term_en: '',
        reading_en: '',
        definition_en: '',
        definition_jp: '',
        term_jp: '',
        part_of_speech: 'noun',
        difficulty: 'essential',
        usage_sentences: [],
        audio_keys: { word: `${id}_word`, sentences: [] },
      },
    ]);
  }

  // --- Grammar helpers ---
  function updateGrammar(index: number, patch: Partial<GrammarPoint>) {
    setGrammar((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }
  function removeGrammar(index: number) {
    setGrammar((prev) => prev.filter((_, i) => i !== index));
  }
  function addGrammar() {
    const id = `grammar_${grammar.length}`;
    setGrammar((prev) => [
      ...prev,
      {
        id,
        title_en: '',
        title_jp: '',
        explanation_en: '',
        explanation_jp: '',
        pattern: '',
        examples: [],
        audio_keys: { examples: [] },
      },
    ]);
  }

  // --- Cultural notes helpers ---
  function updateCultural(index: number, patch: Partial<CulturalNote>) {
    setCulturalNotes((prev) => prev.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  }
  function removeCultural(index: number) {
    setCulturalNotes((prev) => prev.filter((_, i) => i !== index));
  }
  function addCultural() {
    const id = `culture_${culturalNotes.length}`;
    setCulturalNotes((prev) => [
      ...prev,
      { id, title_en: '', title_jp: '', content_en: '', content_jp: '', category: 'professional' },
    ]);
  }

  // --- Comprehension helpers ---
  function updateComprehension(index: number, patch: Partial<ComprehensionItem>) {
    setComprehension((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function removeComprehension(index: number) {
    setComprehension((prev) => prev.filter((_, i) => i !== index));
  }
  function addComprehension() {
    const id = `check_${comprehension.length}`;
    setComprehension((prev) => [
      ...prev,
      {
        id,
        type: 'vocabulary_match',
        question_en: '',
        question_jp: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        explanation_jp: '',
      },
    ]);
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm text-[var(--fg-primary)] focus:border-[var(--border-accent)] focus:outline-none';
  const labelClass = 'text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
        >
          <ArrowLeft size={16} />
          Back to ESL Dashboard
        </button>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : (
              <Save size={14} className="mr-1.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--fg-muted)]" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ========== Vocabulary ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">
                {t('vocabulary_heading')} ({vocabulary.length})
              </h3>
              <button
                type="button"
                onClick={addVocab}
                className="flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
              >
                <Plus size={14} /> Add Word
              </button>
            </div>
            <div className="space-y-4">
              {vocabulary.map((item, i) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                      <div>
                        <label className={labelClass}>Term (EN)</label>
                        <input
                          className={inputClass}
                          value={item.term_en}
                          onChange={(e) => updateVocab(i, { term_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Term (JP)</label>
                        <input
                          className={inputClass}
                          value={item.term_jp}
                          onChange={(e) => updateVocab(i, { term_jp: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Part of Speech</label>
                        <select
                          className={inputClass}
                          value={item.part_of_speech}
                          onChange={(e) =>
                            updateVocab(i, {
                              part_of_speech: e.target.value as VocabularyItem['part_of_speech'],
                            })
                          }
                        >
                          <option value="noun">noun</option>
                          <option value="verb">verb</option>
                          <option value="adjective">adjective</option>
                          <option value="adverb">adverb</option>
                          <option value="phrase">phrase</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Difficulty</label>
                        <select
                          className={inputClass}
                          value={item.difficulty}
                          onChange={(e) =>
                            updateVocab(i, {
                              difficulty: e.target.value as VocabularyItem['difficulty'],
                            })
                          }
                        >
                          <option value="essential">essential</option>
                          <option value="intermediate">intermediate</option>
                          <option value="advanced">advanced</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVocab(i)}
                      className="ml-2 p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Definition (EN)</label>
                      <input
                        className={inputClass}
                        value={item.definition_en}
                        onChange={(e) => updateVocab(i, { definition_en: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Definition (JP)</label>
                      <input
                        className={inputClass}
                        value={item.definition_jp}
                        onChange={(e) => updateVocab(i, { definition_jp: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>IPA Reading</label>
                    <input
                      className={inputClass}
                      value={item.reading_en}
                      onChange={(e) => updateVocab(i, { reading_en: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ========== Grammar ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">
                {t('grammar_heading')} ({grammar.length})
              </h3>
              <button
                type="button"
                onClick={addGrammar}
                className="flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
              >
                <Plus size={14} /> Add Grammar Point
              </button>
            </div>
            <div className="space-y-4">
              {grammar.map((point, i) => (
                <div
                  key={point.id}
                  className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                      <div>
                        <label className={labelClass}>Title (EN)</label>
                        <input
                          className={inputClass}
                          value={point.title_en}
                          onChange={(e) => updateGrammar(i, { title_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Title (JP)</label>
                        <input
                          className={inputClass}
                          value={point.title_jp}
                          onChange={(e) => updateGrammar(i, { title_jp: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGrammar(i)}
                      className="ml-2 p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <label className={labelClass}>Pattern</label>
                    <input
                      className={inputClass}
                      value={point.pattern}
                      onChange={(e) => updateGrammar(i, { pattern: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Explanation (EN)</label>
                      <textarea
                        className={inputClass + ' min-h-[60px]'}
                        value={point.explanation_en}
                        onChange={(e) => updateGrammar(i, { explanation_en: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Explanation (JP)</label>
                      <textarea
                        className={inputClass + ' min-h-[60px]'}
                        value={point.explanation_jp}
                        onChange={(e) => updateGrammar(i, { explanation_jp: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ========== Cultural Notes ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">
                {t('cultural_heading')} ({culturalNotes.length})
              </h3>
              <button
                type="button"
                onClick={addCultural}
                className="flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
              >
                <Plus size={14} /> Add Note
              </button>
            </div>
            <div className="space-y-4">
              {culturalNotes.map((note, i) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                      <div>
                        <label className={labelClass}>Title (EN)</label>
                        <input
                          className={inputClass}
                          value={note.title_en}
                          onChange={(e) => updateCultural(i, { title_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Title (JP)</label>
                        <input
                          className={inputClass}
                          value={note.title_jp}
                          onChange={(e) => updateCultural(i, { title_jp: e.target.value })}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCultural(i)}
                      className="ml-2 p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      className={inputClass + ' w-auto'}
                      value={note.category}
                      onChange={(e) =>
                        updateCultural(i, {
                          category: e.target.value as CulturalNote['category'],
                        })
                      }
                    >
                      <option value="professional">professional</option>
                      <option value="cultural">cultural</option>
                      <option value="linguistic">linguistic</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Content (EN)</label>
                      <textarea
                        className={inputClass + ' min-h-[60px]'}
                        value={note.content_en}
                        onChange={(e) => updateCultural(i, { content_en: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Content (JP)</label>
                      <textarea
                        className={inputClass + ' min-h-[60px]'}
                        value={note.content_jp}
                        onChange={(e) => updateCultural(i, { content_jp: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ========== Comprehension ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--fg-primary)]">
                {t('comprehension_heading')} ({comprehension.length})
              </h3>
              <button
                type="button"
                onClick={addComprehension}
                className="flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>
            <div className="space-y-4">
              {comprehension.map((item, i) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <label className={labelClass}>Type</label>
                        <select
                          className={inputClass + ' w-auto'}
                          value={item.type}
                          onChange={(e) =>
                            updateComprehension(i, {
                              type: e.target.value as ComprehensionItem['type'],
                            })
                          }
                        >
                          <option value="vocabulary_match">vocabulary_match</option>
                          <option value="fill_in_blank">fill_in_blank</option>
                          <option value="sentence_order">sentence_order</option>
                          <option value="translation">translation</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeComprehension(i)}
                      className="ml-2 p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Question (EN)</label>
                      <input
                        className={inputClass}
                        value={item.question_en}
                        onChange={(e) => updateComprehension(i, { question_en: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Question (JP)</label>
                      <input
                        className={inputClass}
                        value={item.question_jp}
                        onChange={(e) => updateComprehension(i, { question_jp: e.target.value })}
                      />
                    </div>
                  </div>
                  {item.options && (
                    <div>
                      <label className={labelClass}>Options (comma-separated)</label>
                      <input
                        className={inputClass}
                        value={item.options.join(', ')}
                        onChange={(e) =>
                          updateComprehension(i, {
                            options: e.target.value.split(',').map((s) => s.trim()),
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Correct Answer</label>
                      <input
                        className={inputClass}
                        value={String(item.correct_answer)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = Number(val);
                          updateComprehension(i, {
                            correct_answer: isNaN(num) ? val : num,
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Explanation (JP)</label>
                      <input
                        className={inputClass}
                        value={item.explanation_jp}
                        onChange={(e) => updateComprehension(i, { explanation_jp: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
