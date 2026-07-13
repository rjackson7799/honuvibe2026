import type {
  AuditFinding,
  AuditPsi,
  GeneratedAuditNarrative,
  HeuristicResult,
} from './schemas';

// The copy-paste artifact for the outreach email / proposal. Built from the
// deterministic heuristics + PSI, with the Claude narrative appended when it
// exists. Works with narrative === null (the `partial` path) — scores, findings,
// PSI, and tech still produce a usable summary.

const CATEGORY_LABEL: Record<AuditFinding['category'], string> = {
  security: 'Security',
  seo: 'SEO',
  mobile: 'Mobile',
  conversion: 'Conversion',
  freshness: 'Freshness',
  accessibility: 'Accessibility',
};

const SEVERITY_RANK: Record<AuditFinding['severity'], number> = {
  critical: 0,
  warn: 1,
  info: 2,
  pass: 3,
};

const MAX_SUMMARY_FINDINGS = 8;

export function buildSummaryMd(
  heur: HeuristicResult,
  psi: AuditPsi | null,
  narrative: GeneratedAuditNarrative | null,
): string {
  const { scores, findings, tech } = heur;
  const lines: string[] = [];

  lines.push(`# Website audit — ${tech.finalUrl}`);
  lines.push('');
  lines.push(`**Overall score: ${scores.overall}/100**`);
  lines.push('');
  lines.push('**By category**');
  (Object.keys(CATEGORY_LABEL) as AuditFinding['category'][]).forEach((c) => {
    lines.push(`- ${CATEGORY_LABEL[c]}: ${scores.categories[c]}/100`);
  });

  const flagged = findings
    .filter((f) => f.severity !== 'pass')
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_SUMMARY_FINDINGS);
  if (flagged.length > 0) {
    lines.push('');
    lines.push('**Top findings**');
    for (const f of flagged) {
      const ev = f.evidence ? ` — ${f.evidence}` : '';
      lines.push(`- ${f.severity.toUpperCase()} · ${CATEGORY_LABEL[f.category]}: ${f.title}${ev}`);
    }
  }

  const techRows: string[] = [];
  if (tech.cms) techRows.push(`- CMS: ${tech.cms}`);
  if (tech.generator) techRows.push(`- Generator: ${tech.generator}`);
  if (tech.builders.length) techRows.push(`- Page builders: ${tech.builders.join(', ')}`);
  if (tech.jquery) techRows.push(`- jQuery: ${tech.jquery}`);
  if (tech.copyrightYear) techRows.push(`- Copyright year: ${tech.copyrightYear}`);
  techRows.push(`- Pages analyzed: ${tech.pagesFetched}`);
  if (techRows.length > 0) {
    lines.push('');
    lines.push('**Tech detected**');
    lines.push(...techRows);
  }

  lines.push('');
  lines.push('**PageSpeed (Lighthouse, mobile)**');
  if (psi) {
    const fmt = (n: number | null) => (n === null ? 'n/a' : String(n));
    lines.push(`- Performance: ${fmt(psi.categories.performance)}`);
    lines.push(`- Accessibility: ${fmt(psi.categories.accessibility)}`);
    lines.push(`- Best practices: ${fmt(psi.categories.best_practices)}`);
    lines.push(`- SEO: ${fmt(psi.categories.seo)}`);
  } else {
    lines.push('- PageSpeed unavailable.');
  }

  if (narrative) {
    lines.push('');
    lines.push('## Summary');
    lines.push(narrative.one_liner);
    lines.push('');
    lines.push('### Current state');
    lines.push(narrative.current_state_md);
    lines.push('');
    lines.push('### Opportunities');
    lines.push(narrative.opportunities_md);
    lines.push('');
    lines.push('### Competitive picture');
    lines.push(narrative.competitive_md);
    lines.push('');
    lines.push('### Suggested next step');
    lines.push(narrative.next_steps_md);
  }

  return lines.join('\n');
}
