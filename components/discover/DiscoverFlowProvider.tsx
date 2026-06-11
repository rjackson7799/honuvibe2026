'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useCallback,
} from 'react';
import { priceFromAnswers, type LeadIntake } from '@/lib/discover/derive';
import type { PricingResult } from '@/lib/pricing';
import type { QuestionDef } from '@/lib/questions';

interface State {
  intake: LeadIntake;
  answers: Record<string, unknown>;
  currentStep: number;
  hydrated: boolean;
  error: string | null;
}

type Action =
  | {
      type: 'hydrate';
      intake: LeadIntake;
      answers: Record<string, unknown>;
      currentStep: number;
    }
  | { type: 'error'; message: string }
  | { type: 'set'; field: string; value: unknown }
  | { type: 'step'; step: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        intake: action.intake,
        answers: action.answers,
        currentStep: action.currentStep,
        hydrated: true,
      };
    case 'error':
      return { ...state, error: action.message, hydrated: true };
    case 'set':
      return { ...state, answers: { ...state.answers, [action.field]: action.value } };
    case 'step':
      return { ...state, currentStep: action.step };
    default:
      return state;
  }
}

interface FlowContextValue {
  sessionId: string;
  intake: LeadIntake;
  answers: Record<string, unknown>;
  currentStep: number;
  hydrated: boolean;
  error: string | null;
  pricing: PricingResult;
  setAnswer: (q: QuestionDef, value: unknown, decide?: boolean) => void;
  goToStep: (step: number) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used within DiscoverFlowProvider');
  return ctx;
}

const MIN_LOADER_MS = 1100;
const SAVE_DEBOUNCE_MS = 550;

export function DiscoverFlowProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    intake: {},
    answers: {},
    currentStep: 1,
    hydrated: false,
    error: null,
  });

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const stepRef = useRef(state.currentStep);
  stepRef.current = state.currentStep;

  // Hydrate from the server (also the resume path). A minimum loader delay keeps
  // the "analysis" beat calm rather than flashing.
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    (async () => {
      try {
        const res = await fetch(`/api/discover/review/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('hydrate failed');
        const data = await res.json();
        const wait = Math.max(0, MIN_LOADER_MS - (Date.now() - started));
        await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        dispatch({
          type: 'hydrate',
          intake: {
            location_type: data.lead?.locationType ?? null,
            tier_interest: data.lead?.tierInterest ?? null,
            industry: data.lead?.industry ?? null,
          },
          answers: data.answers ?? {},
          currentStep: data.currentStep ?? 1,
        });
      } catch {
        if (!cancelled) dispatch({ type: 'error', message: 'Could not load your session.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const setAnswer = useCallback(
    (q: QuestionDef, value: unknown, decide = false) => {
      dispatch({ type: 'set', field: q.capturesField, value });
      clearTimeout(timers.current[q.id]);
      timers.current[q.id] = setTimeout(() => {
        void fetch('/api/discover/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: q.id,
            answer: value,
            isDecideForMe: decide,
            step: stepRef.current,
          }),
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [sessionId],
  );

  const goToStep = useCallback((step: number) => dispatch({ type: 'step', step }), []);

  const pricing = useMemo(
    () => priceFromAnswers(state.answers, state.intake),
    [state.answers, state.intake],
  );

  const value: FlowContextValue = {
    sessionId,
    intake: state.intake,
    answers: state.answers,
    currentStep: state.currentStep,
    hydrated: state.hydrated,
    error: state.error,
    pricing,
    setAnswer,
    goToStep,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
