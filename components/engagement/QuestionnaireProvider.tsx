'use client';

// The third question renderer's state + autosave engine. Borrows WITHOUT
// importing: the reducer + per-question `timers.current[id]` debounce +
// per-question timers from components/discover/DiscoverFlowProvider.tsx. Tripwire:
// if a FOURTH renderer appears, consolidate on a shared QuestionField.
//
// Autosave contract (plan, "Autosave is an API route"):
//   - choice questions save at 0 ms, text debounces 600 ms;
//   - flush on blur, on section change, before submit, and on pagehide /
//     visibilitychange via navigator.sendBeacon (best-effort by construction —
//     a beforeunload guard fires while anything is dirty);
//   - per-question inflight serialization: two debounced saves to one
//     question can never land out of order, and retries COALESCE — only the
//     latest value per question is ever sent;
//   - a failed save retries with bounded backoff 1 s → 3 s → 8 s, then holds
//     with a manual Retry; an `online` listener and a tab refocus re-trigger
//     the queue;
//   - submit flushes every pending save and is blocked while any is failed;
//   - every save carries questions_version; 409 stale_manifest reloads the
//     page (a stale tab cannot save against a newer manifest).
// One chip in the sticky header — never a toast.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { OTHER_VALUE } from '@/lib/studio/engagement/questions-schema';
import { isAnswerPresent } from '@/lib/studio/engagement/validate-answers';
import type {
  AnswerValue,
  EngagementQuestion,
  QuestionnaireSection,
  StoredAnswer,
} from '@/lib/studio/engagement/questions-schema';
import type { QuestionnaireStatus } from '@/lib/studio/engagement/types';
import { T, type Copy } from './copy';

export interface ClientQuestionnaire {
  id: string;
  locale: 'en' | 'ja';
  title: string;
  intro_md: string | null;
  sections: QuestionnaireSection[];
  questions: EngagementQuestion[];
  questions_version: number;
  status: QuestionnaireStatus;
  submitted_at: string | null;
}

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';
export type FatalKind = 'forbidden' | 'expired' | 'stale' | 'unavailable';

interface AnswerState {
  value: AnswerValue;
  other: string;
}

interface State {
  answers: Record<string, AnswerState>;
  saves: Record<string, { status: SaveStatus; attempts: number }>;
  lastSavedAt: number | null;
  currentSection: string;
  submitted: boolean;
  submitting: boolean;
  submitError: string | null;
  missing: Record<string, true>;
  fatal: FatalKind | null;
  online: boolean;
}

type Action =
  | { type: 'set'; id: string; value: AnswerValue; other: string }
  | { type: 'save'; id: string; status: SaveStatus; attempts?: number; at?: number }
  | { type: 'section'; key: string }
  | { type: 'submitting'; value: boolean }
  | { type: 'submitted' }
  | { type: 'submitError'; message: string | null }
  | { type: 'missing'; ids: string[] }
  | { type: 'fatal'; kind: FatalKind }
  | { type: 'online'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set': {
      const missing = { ...state.missing };
      delete missing[action.id];
      return {
        ...state,
        answers: { ...state.answers, [action.id]: { value: action.value, other: action.other } },
        saves: { ...state.saves, [action.id]: { status: 'dirty', attempts: state.saves[action.id]?.attempts ?? 0 } },
        missing,
        submitError: null,
      };
    }
    case 'save':
      return {
        ...state,
        saves: {
          ...state.saves,
          [action.id]: { status: action.status, attempts: action.attempts ?? state.saves[action.id]?.attempts ?? 0 },
        },
        lastSavedAt: action.status === 'saved' ? (action.at ?? Date.now()) : state.lastSavedAt,
      };
    case 'section':
      return { ...state, currentSection: action.key };
    case 'submitting':
      return { ...state, submitting: action.value };
    case 'submitted':
      return { ...state, submitted: true, submitting: false, submitError: null };
    case 'submitError':
      return { ...state, submitError: action.message, submitting: false };
    case 'missing': {
      const missing: Record<string, true> = {};
      for (const id of action.ids) missing[id] = true;
      return { ...state, missing };
    }
    case 'fatal':
      return { ...state, fatal: action.kind, submitting: false };
    case 'online':
      return { ...state, online: action.value };
    default:
      return state;
  }
}

function emptyValue(q: EngagementQuestion): AnswerValue {
  return q.qtype === 'multi' ? [] : '';
}

export function isPresent(q: EngagementQuestion, a: AnswerState | undefined): boolean {
  if (!a) return false;
  return isAnswerPresent(a.value, a.other);
}

export type ChipState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'offline' }
  | { kind: 'unsaved' };

interface ContextValue {
  questionnaire: ClientQuestionnaire;
  t: Copy;
  answers: Record<string, AnswerState>;
  saves: State['saves'];
  chip: ChipState;
  currentSection: string;
  sectionIndex: number;
  submitted: boolean;
  submitting: boolean;
  submitError: string | null;
  missing: Record<string, true>;
  fatal: FatalKind | null;
  answeredCount: number;
  setAnswer: (q: EngagementQuestion, value: AnswerValue, other?: string) => void;
  flush: () => Promise<void>;
  goToSection: (key: string) => void;
  submit: () => Promise<void>;
  retryFailed: () => void;
  sectionState: (key: string) => 'active' | 'done' | 'upcoming';
}

const Ctx = createContext<ContextValue | null>(null);

export function useQuestionnaire(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQuestionnaire must be used within QuestionnaireProvider');
  return ctx;
}

export const TEXT_DEBOUNCE_MS = 600;
export const BACKOFF_MS = [1_000, 3_000, 8_000] as const;

interface Pending {
  timer: ReturnType<typeof setTimeout> | null;
}

export function QuestionnaireProvider({
  questionnaire,
  initialAnswers,
  children,
}: {
  questionnaire: ClientQuestionnaire;
  initialAnswers: Pick<StoredAnswer, 'question_id' | 'answer' | 'other_text'>[];
  children: React.ReactNode;
}) {
  const t = T[questionnaire.locale];

  const [state, dispatch] = useReducer(reducer, undefined, (): State => {
    const answers: Record<string, AnswerState> = {};
    const byId = new Map(initialAnswers.map((a) => [a.question_id, a]));
    for (const q of questionnaire.questions) {
      const a = byId.get(q.id);
      answers[q.id] = a ? { value: a.answer, other: a.other_text ?? '' } : { value: emptyValue(q), other: '' };
    }
    return {
      answers,
      saves: {},
      lastSavedAt: null,
      currentSection: questionnaire.sections[0]?.key ?? '',
      submitted: questionnaire.status === 'submitted',
      submitting: false,
      submitError: null,
      missing: {},
      fatal: null,
      online: true,
    };
  });

  // Engine refs — the latest answers, per-question debounce timers, per-question
  // inflight chains, and the retry timers. Refs, not state: the engine must
  // read the LATEST value at send time (retries coalesce) without re-rendering.
  const answersRef = useRef(state.answers);
  answersRef.current = state.answers;
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<Record<string, Pending>>({});
  const inflight = useRef<Record<string, Promise<void> | undefined>>({});
  const queued = useRef<Record<string, boolean>>({});
  const retryTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const attempts = useRef<Record<string, number>>({});
  const lastSent = useRef<Record<string, string>>({});
  const aliveRef = useRef(true);
  // Save statuses mirrored SYNCHRONOUSLY at every dispatch. stateRef only
  // refreshes on re-render, so code that awaits a flush and then reads
  // stateRef would still see the pre-render 'saving' statuses (a real bug
  // caught by the browser smoke: "unsaved" reported with everything saved).
  const savesRef = useRef<Record<string, SaveStatus>>({});
  const setSave = useCallback(
    (id: string, status: SaveStatus, attemptsMade?: number, at?: number) => {
      savesRef.current = { ...savesRef.current, [id]: status };
      dispatch({ type: 'save', id, status, attempts: attemptsMade, at });
    },
    [],
  );
  const anyUnsaved = useCallback((): boolean => {
    if (Object.values(savesRef.current).some((s) => s === 'dirty' || s === 'saving' || s === 'failed')) return true;
    return Object.values(timers.current).some((p) => p.timer !== null) || Object.keys(retryTimers.current).length > 0;
  }, []);

  const questionById = useMemo(() => new Map(questionnaire.questions.map((q) => [q.id, q])), [questionnaire.questions]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      for (const p of Object.values(timers.current)) if (p.timer) clearTimeout(p.timer);
      for (const r of Object.values(retryTimers.current)) clearTimeout(r);
    };
  }, []);

  const body = useCallback(
    (id: string) => {
      const a = answersRef.current[id];
      return JSON.stringify({
        question_id: id,
        answer: a?.value ?? '',
        other_text: a?.other?.trim() ? a.other.trim() : null,
        questions_version: questionnaire.questions_version,
      });
    },
    [questionnaire.questions_version],
  );

  /** The one place a save is sent. Serialized per question; retries coalesce. */
  const send = useCallback(
    (id: string): Promise<void> => {
      const existing = inflight.current[id];
      if (existing) {
        // Serialize: remember that a newer value is waiting; the running send
        // will re-send the LATEST value when it finishes.
        queued.current[id] = true;
        return existing;
      }
      const run = (async () => {
        const st = stateRef.current;
        if (st.fatal || st.submitted) return;
        setSave(id, 'saving');
        const payload = body(id);
        let ok = false;
        let retryable = true;
        let holdMs: number | null = null;
        try {
          const res = await fetch(`/api/engagement/${questionnaire.id}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
          if (res.ok) {
            ok = true;
            lastSent.current[id] = payload;
          } else if (res.status === 403) {
            retryable = false;
            dispatch({ type: 'fatal', kind: 'forbidden' });
          } else if (res.status === 410) {
            retryable = false;
            dispatch({ type: 'fatal', kind: 'expired' });
          } else if (res.status === 409) {
            retryable = false;
            const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
            if (data.error === 'stale_manifest') {
              dispatch({ type: 'fatal', kind: 'stale' });
              setTimeout(() => window.location.reload(), 1_200);
            } else if (data.status === 'submitted') {
              dispatch({ type: 'submitted' }); // not_open because it was submitted underneath us
            } else {
              // not_open for any other reason (start over → draft): this link no
              // longer opens anything — never render a thank-you for it.
              dispatch({ type: 'fatal', kind: 'forbidden' });
            }
          } else if (res.status === 429) {
            // Rate limited: hold for Retry-After (default 60 s) without burning
            // the bounded retries, then send the LATEST value once.
            const secs = Number(res.headers.get('retry-after') ?? 60);
            holdMs = Math.min(300_000, Math.max(5_000, (Number.isFinite(secs) ? secs : 60) * 1000));
          } else if (res.status === 400) {
            retryable = false; // the UI enforces caps; a 400 means a bug, not a blip
          } else if (res.status === 503) {
            dispatch({ type: 'fatal', kind: 'unavailable' });
            retryable = false;
          }
        } catch {
          ok = false; // network — retryable
        }
        if (!aliveRef.current) return;

        if (ok) {
          attempts.current[id] = 0;
          setSave(id, 'saved', 0, Date.now());
        } else if (retryable && holdMs !== null) {
          setSave(id, 'dirty', attempts.current[id] ?? 0);
          retryTimers.current[id] = setTimeout(() => {
            delete retryTimers.current[id];
            void send(id);
          }, holdMs);
        } else if (retryable) {
          const n = (attempts.current[id] ?? 0) + 1;
          attempts.current[id] = n;
          if (n <= BACKOFF_MS.length) {
            setSave(id, 'dirty', n);
            retryTimers.current[id] = setTimeout(() => {
              delete retryTimers.current[id];
              void send(id);
            }, BACKOFF_MS[n - 1]);
          } else {
            setSave(id, 'failed', n);
          }
        } else {
          setSave(id, 'failed', attempts.current[id] ?? 0);
        }
      })().finally(() => {
        delete inflight.current[id];
        if (queued.current[id]) {
          delete queued.current[id];
          // A newer value arrived while we were sending: send it now (the
          // payload is rebuilt from the latest state, so intermediate values
          // are never sent — coalesced).
          if (lastSent.current[id] !== body(id)) void send(id);
        }
      });
      inflight.current[id] = run;
      return run;
    },
    [body, questionnaire.id, setSave],
  );

  const schedule = useCallback(
    (id: string, delay: number) => {
      const p = timers.current[id] ?? (timers.current[id] = { timer: null });
      if (p.timer) clearTimeout(p.timer);
      if (retryTimers.current[id]) {
        clearTimeout(retryTimers.current[id]);
        delete retryTimers.current[id];
      }
      attempts.current[id] = 0;
      p.timer = setTimeout(() => {
        p.timer = null;
        void send(id);
      }, delay);
    },
    [send],
  );

  const setAnswer = useCallback(
    (q: EngagementQuestion, value: AnswerValue, other = '') => {
      if (stateRef.current.submitted || stateRef.current.fatal) return;
      dispatch({ type: 'set', id: q.id, value, other });
      // Need the NEW value at send time: update the refs synchronously too.
      answersRef.current = { ...answersRef.current, [q.id]: { value, other } };
      savesRef.current = { ...savesRef.current, [q.id]: 'dirty' };
      schedule(q.id, q.qtype === 'text' ? TEXT_DEBOUNCE_MS : 0);
    },
    [schedule],
  );

  /** Fire every pending debounce now and wait for the inflight chains. */
  const flush = useCallback(async (): Promise<void> => {
    for (const [id, p] of Object.entries(timers.current)) {
      if (p.timer) {
        clearTimeout(p.timer);
        p.timer = null;
        void send(id);
      }
    }
    // Retry timers are pending saves too — fire them now.
    for (const [id, r] of Object.entries(retryTimers.current)) {
      clearTimeout(r);
      delete retryTimers.current[id];
      void send(id);
    }
    await Promise.all(Object.values(inflight.current).filter(Boolean));
    // A queued re-send may have started while we waited.
    await Promise.all(Object.values(inflight.current).filter(Boolean));
  }, [send]);

  const retryFailed = useCallback(() => {
    for (const [id, s] of Object.entries(savesRef.current)) {
      if (s === 'failed' || s === 'dirty') {
        attempts.current[id] = 0;
        void send(id);
      }
    }
  }, [send]);

  // Online + refocus re-trigger the queue; pagehide / hidden → beacon what is
  // pending (best-effort); beforeunload guards while anything is unsaved.
  useEffect(() => {
    const onOnline = () => {
      dispatch({ type: 'online', value: true });
      retryFailed();
    };
    const onOffline = () => dispatch({ type: 'online', value: false });
    const beaconPending = () => {
      const st = stateRef.current;
      if (st.submitted || st.fatal || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
      for (const [id, s] of Object.entries(savesRef.current)) {
        const pending = timers.current[id]?.timer !== null && timers.current[id]?.timer !== undefined;
        if (s === 'dirty' || s === 'failed' || s === 'saving' || pending) {
          // text/plain avoids any preflight; the route parses the text body.
          navigator.sendBeacon(`/api/engagement/${questionnaire.id}/answer`, new Blob([body(id)], { type: 'text/plain' }));
        }
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') beaconPending();
      else retryFailed();
    };
    const onFocus = () => retryFailed();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const st = stateRef.current;
      if (st.submitted || st.fatal) return;
      if (anyUnsaved()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pagehide', beaconPending);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pagehide', beaconPending);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [anyUnsaved, body, questionnaire.id, retryFailed]);

  const goToSection = useCallback(
    (key: string) => {
      if (!questionnaire.sections.some((s) => s.key === key)) return;
      void flush();
      dispatch({ type: 'section', key });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [flush, questionnaire.sections],
  );

  const submit = useCallback(async (): Promise<void> => {
    const st = stateRef.current;
    if (st.submitted || st.submitting || st.fatal) return;
    dispatch({ type: 'submitting', value: true });
    await flush();
    if (stateRef.current.fatal) return;
    if (anyUnsaved()) {
      dispatch({ type: 'submitError', message: t.unsavedBlock });
      return;
    }
    // Client-side required check first (jump to the first missing question).
    const answersNow = answersRef.current;
    const missing = questionnaire.questions.filter((q) => q.required && !isPresent(q, answersNow[q.id])).map((q) => q.id);
    if (missing.length > 0) {
      dispatch({ type: 'missing', ids: missing });
      const first = questionById.get(missing[0]);
      if (first) dispatch({ type: 'section', key: first.section_key });
      dispatch({ type: 'submitError', message: t.missingIntro(missing.length) });
      return;
    }
    try {
      const honeypot = (document.querySelector('input[name="company_url"]') as HTMLInputElement | null)?.value ?? '';
      const res = await fetch(`/api/engagement/${questionnaire.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_url: honeypot, questions_version: questionnaire.questions_version }),
      });
      if (res.ok) {
        dispatch({ type: 'submitted' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string; missing?: { section_key: string; question_ids: string[] }[] };
      if (res.status === 400 && data.error === 'required_missing' && data.missing?.length) {
        const ids = data.missing.flatMap((m) => m.question_ids);
        dispatch({ type: 'missing', ids });
        dispatch({ type: 'section', key: data.missing[0].section_key });
        dispatch({ type: 'submitError', message: t.missingIntro(ids.length) });
        return;
      }
      if (res.status === 403) return dispatch({ type: 'fatal', kind: 'forbidden' });
      if (res.status === 410) return dispatch({ type: 'fatal', kind: 'expired' });
      if (res.status === 409 && data.error === 'stale_manifest') {
        dispatch({ type: 'fatal', kind: 'stale' });
        setTimeout(() => window.location.reload(), 1_200);
        return;
      }
      if (res.status === 409 && data.error === 'not_open') {
        if (data.status === 'submitted') return dispatch({ type: 'submitted' });
        return dispatch({ type: 'fatal', kind: 'forbidden' });
      }
      if (res.status === 409 && data.error === 'brief_in_flight') return dispatch({ type: 'submitError', message: t.briefInFlight });
      dispatch({ type: 'submitError', message: t.submitFailed });
    } catch {
      dispatch({ type: 'submitError', message: t.submitFailed });
    }
  }, [anyUnsaved, flush, questionById, questionnaire.id, questionnaire.questions, questionnaire.questions_version, t]);

  // Derived: the chip, section states, answered count.
  const chip: ChipState = useMemo(() => {
    const saves = Object.values(state.saves);
    if (saves.some((s) => s.status === 'failed')) return { kind: 'unsaved' };
    if (!state.online && saves.some((s) => s.status === 'dirty' || s.status === 'saving')) return { kind: 'offline' };
    if (saves.some((s) => s.status === 'saving' || s.status === 'dirty')) return { kind: 'saving' };
    if (state.lastSavedAt) return { kind: 'saved', at: state.lastSavedAt };
    return { kind: 'idle' };
  }, [state.saves, state.online, state.lastSavedAt]);

  const sectionIndex = Math.max(0, questionnaire.sections.findIndex((s) => s.key === state.currentSection));

  const sectionState = useCallback(
    (key: string): 'active' | 'done' | 'upcoming' => {
      if (key === state.currentSection && !state.submitted) return 'active';
      const qs = questionnaire.questions.filter((q) => q.section_key === key);
      if (qs.length === 0) return 'upcoming';
      const requiredDone = qs.filter((q) => q.required).every((q) => isPresent(q, state.answers[q.id]));
      const anyDone = qs.some((q) => isPresent(q, state.answers[q.id]));
      return requiredDone && anyDone ? 'done' : 'upcoming';
    },
    [questionnaire.questions, state.answers, state.currentSection, state.submitted],
  );

  const answeredCount = useMemo(
    () => questionnaire.questions.filter((q) => isPresent(q, state.answers[q.id])).length,
    [questionnaire.questions, state.answers],
  );

  const value: ContextValue = {
    questionnaire,
    t,
    answers: state.answers,
    saves: state.saves,
    chip,
    currentSection: state.currentSection,
    sectionIndex,
    submitted: state.submitted,
    submitting: state.submitting,
    submitError: state.submitError,
    missing: state.missing,
    fatal: state.fatal,
    answeredCount,
    setAnswer,
    flush,
    goToSection,
    submit,
    retryFailed,
    sectionState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { OTHER_VALUE };
