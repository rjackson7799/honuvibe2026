// Shared (client + server) adapters between stored discovery responses and the
// pricing calculator. Keep free of server-only imports — the flow provider uses
// these on the client, and the /review + /complete routes use them on the server.

import {
  answersToPricingInput,
  calculatePricing,
  type DiscoveryAnswers,
  type PricingAddons,
  type PricingResult,
  type TierInterest,
  type LocationType,
  type ContentReadiness,
  type ImageryApproach,
  type Timeline,
} from '@/lib/pricing';
import { QUESTIONS, BRANCHES } from '@/lib/questions';

/** question_id → capturesField (backbone + branches). */
const FIELD_BY_QID: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const q of QUESTIONS) m[q.id] = q.capturesField;
  for (const b of BRANCHES) m[b.question.id] = b.question.capturesField;
  return m;
})();

export interface StoredResponse {
  question_id: string;
  answer: unknown;
}

/** Re-key stored responses (by question_id) into an answer map (by capturesField). */
export function responsesToAnswerMap(responses: StoredResponse[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const r of responses) {
    const field = FIELD_BY_QID[r.question_id] ?? r.question_id;
    map[field] = r.answer;
  }
  return map;
}

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : [];

/**
 * Derive the opt-in pricing add-ons from questionnaire answers. Scheduling,
 * invoicing/subscriptions, and AI chat come from Q9 features; GBP from the Q15
 * local branch. These apply on any priced tier (GBP still gates to physical/both).
 */
export function deriveAddons(answers: Record<string, unknown>): PricingAddons {
  const features = strArr(answers.features);
  const gbp = strArr(answers.gbp);
  return {
    booking: features.includes('booking'),
    payments: features.includes('invoicing') || features.includes('subscriptions'),
    aiChat: features.includes('chat') || features.includes('ai_chat'),
    gbpSetup: gbp.includes('gbp_setup'),
    gbpManage: gbp.includes('gbp_manage'),
  };
}

export interface LeadIntake {
  location_type?: LocationType | null;
  tier_interest?: TierInterest | null;
  industry?: string | null;
}

/** Build the typed DiscoveryAnswers the calculator expects from an answer map + intake. */
export function buildDiscoveryAnswers(
  answerMap: Record<string, unknown>,
  lead: LeadIntake,
): DiscoveryAnswers {
  const realDetails = answerMap.real_details as { timeline?: Timeline } | undefined;
  return {
    tier_interest:
      (answerMap.tier_interest as TierInterest) ?? lead.tier_interest ?? undefined,
    pages: strArr(answerMap.pages),
    features: strArr(answerMap.features),
    content_readiness: (answerMap.content_readiness as ContentReadiness) ?? null,
    imagery_approach: (answerMap.imagery_approach as ImageryApproach) ?? null,
    additional_languages: strArr(answerMap.additional_languages),
    location_type: lead.location_type ?? null,
    timeline: realDetails?.timeline ?? null,
    addons: deriveAddons(answerMap),
  };
}

/** One-shot: answer map + intake → priced result. Used by the live panel and the server. */
export function priceFromAnswers(
  answerMap: Record<string, unknown>,
  lead: LeadIntake,
): PricingResult {
  const answers = buildDiscoveryAnswers(answerMap, lead);
  const input = answersToPricingInput(answers, {
    tier_interest: lead.tier_interest ?? undefined,
    location_type: lead.location_type ?? null,
  });
  return calculatePricing(input);
}
