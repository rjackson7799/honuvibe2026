import { z } from 'zod';

// Shared schemas + inferred types for the website-audit pipeline. The category
// union is kept in exact sync with LeadAuditFinding.category (lib/admin/types.ts)
// and the 060_lead_audits.sql column comment. Code computes every score and
// finding; the only Zod *parse* on untrusted input is the Claude narrative
// (auditNarrativeSchema) — the rest are types the pipeline constructs.

export const AUDIT_CATEGORIES = [
  'security',
  'seo',
  'mobile',
  'conversion',
  'freshness',
  'accessibility',
] as const;

export const auditCategorySchema = z.enum(AUDIT_CATEGORIES);
export type AuditCategory = z.infer<typeof auditCategorySchema>;

export const auditSeveritySchema = z.enum(['critical', 'warn', 'info', 'pass']);
export type AuditSeverity = z.infer<typeof auditSeveritySchema>;

export const fetchedPageSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  html: z.string(),
});
export type FetchedPage = z.infer<typeof fetchedPageSchema>;

export const auditFindingSchema = z.object({
  id: z.string(),
  category: auditCategorySchema,
  severity: auditSeveritySchema,
  title: z.string(),
  evidence: z.string(),
});
export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const auditScoresSchema = z.object({
  overall: z.number(),
  categories: z.object({
    security: z.number(),
    seo: z.number(),
    mobile: z.number(),
    conversion: z.number(),
    freshness: z.number(),
    accessibility: z.number(),
  }),
});
export type AuditScores = z.infer<typeof auditScoresSchema>;

// The deterministic half of an audit — what computeHeuristics returns and what
// buildSummaryMd/generateAuditNarrative consume.
export interface HeuristicResult {
  scores: AuditScores;
  findings: AuditFinding[];
  tech: AuditTech;
}

export const auditTechSchema = z.object({
  generator: z.string().nullable(),
  cms: z.string().nullable(),
  builders: z.array(z.string()),
  jquery: z.string().nullable(),
  copyrightYear: z.number().nullable(),
  pagesFetched: z.number(),
  finalUrl: z.string(),
});
export type AuditTech = z.infer<typeof auditTechSchema>;

export const auditPsiSchema = z.object({
  strategy: z.literal('mobile'),
  categories: z.object({
    performance: z.number().nullable(),
    accessibility: z.number().nullable(),
    best_practices: z.number().nullable(),
    seo: z.number().nullable(),
  }),
  metrics: z.record(z.string(), z.number().nullable()).optional(),
});
export type AuditPsi = z.infer<typeof auditPsiSchema>;

// The one schema that parses attacker-derived model output. `.min(1)` on every
// field so an empty section is rejected (→ the run marks the audit `partial`).
export const auditNarrativeSchema = z.object({
  one_liner: z.string().min(1),
  current_state_md: z.string().min(1),
  opportunities_md: z.string().min(1),
  competitive_md: z.string().min(1),
  next_steps_md: z.string().min(1),
});
export type GeneratedAuditNarrative = z.infer<typeof auditNarrativeSchema>;

// Forced tool_use definition (mirror of lib/studio/outreach-generator.ts's tool
// shape). input_schema mirrors auditNarrativeSchema so the model returns exactly
// the five markdown fields.
export const AUDIT_NARRATIVE_TOOL = {
  name: 'submit_website_audit',
  description:
    'Submit the website-audit sales narrative as five short markdown sections.',
  input_schema: {
    type: 'object' as const,
    properties: {
      one_liner: {
        type: 'string' as const,
        description:
          'A single plain sentence summarizing the state of the site and the opportunity. No markdown.',
      },
      current_state_md: {
        type: 'string' as const,
        description:
          'Markdown: what the current site does well and where it falls short, grounded ONLY in the provided findings. A few sentences or a short bullet list.',
      },
      opportunities_md: {
        type: 'string' as const,
        description:
          'Markdown: the concrete improvements a rebuild would deliver, tied to the findings. A short bullet list.',
      },
      competitive_md: {
        type: 'string' as const,
        description:
          'Markdown: qualitative competitive framing ("businesses in this category increasingly do X"). Never name a real competitor or invent competitor data.',
      },
      next_steps_md: {
        type: 'string' as const,
        description:
          'Markdown: a low-pressure suggested next step. No prices, timelines, or testimonials.',
      },
    },
    required: [
      'one_liner',
      'current_state_md',
      'opportunities_md',
      'competitive_md',
      'next_steps_md',
    ],
  },
};
