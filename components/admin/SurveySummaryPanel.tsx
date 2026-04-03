export type SurveySummary = {
  id: string;
  survey_id: string;
  response_count: number;
  stats: {
    ai_knowledge_level?: Record<string, number>;
    ai_usage_frequency?: Record<string, number>;
    ai_tools_used?: Record<string, number>;
    learning_reasons?: Record<string, number>;
    ai_help_with?: Record<string, number>;
  };
  summary_text: string;
  key_takeaways: string[];
  tool_recommendations: string;
  instructor_notes: string;
  generated_at: string;
};

function topN(counts: Record<string, number> | undefined, n: number): [string, number][] {
  if (!counts) return [];
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n);
}

type Props = {
  summary: SurveySummary | null;
  responseCount: number;
};

export default function SurveySummaryPanel({ summary, responseCount }: Props) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-secondary px-6 py-8 text-center">
        <p className="text-sm text-fg-tertiary">
          AI summary will appear after the first survey submission.
        </p>
      </div>
    );
  }

  const knowledgeLevelChips = summary.stats.ai_knowledge_level
    ? Object.entries(summary.stats.ai_knowledge_level)
    : [];
  const topToolChips = topN(summary.stats.ai_tools_used, 3);

  const formattedDate = new Date(summary.generated_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          COHORT SUMMARY
        </span>
        <span className="text-xs text-fg-tertiary">
          Generated from {responseCount} responses
        </span>
      </div>

      {/* Stat chips row */}
      {(knowledgeLevelChips.length > 0 || topToolChips.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {knowledgeLevelChips.map(([label, count]) => (
            <span
              key={`knowledge-${label}`}
              className="rounded-full bg-bg-tertiary border border-border-primary px-3 py-1 text-xs text-fg-secondary"
            >
              {label}: {count}
            </span>
          ))}
          {topToolChips.map(([label, count]) => (
            <span
              key={`tool-${label}`}
              className="rounded-full bg-bg-tertiary border border-border-primary px-3 py-1 text-xs text-fg-secondary"
            >
              {label}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Key takeaways */}
      {summary.key_takeaways.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-fg-primary mb-2">Key Takeaways</p>
          <ul className="list-disc list-inside space-y-1">
            {summary.key_takeaways.map((item, i) => (
              <li key={i} className="text-sm text-fg-secondary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Narrative summary */}
      <p className="text-sm text-fg-secondary leading-relaxed">{summary.summary_text}</p>

      {/* Teal callout — AI Tool Recommendations */}
      <div className="rounded-lg bg-accent-teal/10 border border-accent-teal/30 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-teal">
          AI Tool Recommendations
        </p>
        <p className="text-sm text-fg-secondary">{summary.tool_recommendations}</p>
      </div>

      {/* Amber callout — Instructor Notes */}
      <div className="rounded-lg bg-accent-gold/10 border border-accent-gold/30 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-gold">
          Instructor Notes
        </p>
        <p className="text-sm text-fg-secondary">{summary.instructor_notes}</p>
      </div>

      {/* Footer */}
      <p className="text-xs text-fg-muted">Generated {formattedDate}</p>
    </div>
  );
}
