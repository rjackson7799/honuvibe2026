// Phase 1 of the discovery brief: the deterministic answers document,
// rendered in code from the PINNED snapshot (section headings, prompt → answer,
// option labels resolved from the pinned manifest, "Other:" values marked,
// unanswered as "—", angle brackets neutralised). It is written to
// engagement_briefs.digest_md immediately after submission and NEVER
// overwritten (finalize_engagement_brief COALESCEs), so Ryan always has a
// readable record within a second of submission even when the model layer
// fails. Built from the UNTRUNCATED snapshot — only the model input is
// budgeted (context-budget.ts). Renders through CommunityMarkdown in the panel
// (sanitized), never dangerouslySetInnerHTML; the neutralize here is belt and
// braces on top of that, and it also keeps the digest safe as prompt input.

import { OTHER_VALUE, type AnswerSnapshot } from './questions-schema';
import { renderSnapshot } from './validate-answers';
import { neutralize } from './context-budget';

const UNANSWERED = '—';

function md(value: string): string {
  return neutralize(value);
}

/** Under engagement_briefs.digest_md's 200,000-char CHECK, with room for the marker. */
export const DIGEST_MAX_CHARS = 180_000;
const DIGEST_TRUNCATED = '\n\n[… digest truncated — the full answers are on the questionnaire]\n';

export function buildDigestMd(snapshot: AnswerSnapshot): string {
  const rendered = renderSnapshot(snapshot);
  const lines: string[] = [];
  lines.push(`# Discovery answers — ${md(rendered.title) || 'Discovery questionnaire'}`);
  lines.push('');
  lines.push(`_Manifest v${rendered.questions_version} · ${rendered.locale} · ${rendered.sections.reduce((n, s) => n + s.items.length, 0)} questions_`);

  for (const section of rendered.sections) {
    lines.push('');
    lines.push(`## ${section.key === '_unsectioned' ? 'Other questions' : md(section.title) || section.key}`);
    if (section.blurb) {
      lines.push('');
      lines.push(`_${md(section.blurb)}_`);
    }
    for (const item of section.items) {
      lines.push('');
      lines.push(`**${md(item.prompt)}**${item.required ? ' \\*' : ''}`);
      lines.push('');
      if (!item.answered) {
        lines.push(UNANSWERED);
        continue;
      }
      if (item.qtype === 'text') {
        // Preserve the client's paragraphs; neutralize per line.
        const text = (item.text ?? '').split(/\r?\n/).map((l) => neutralize(l)).join('\n');
        lines.push(text === '' ? UNANSWERED : text);
        continue;
      }
      for (const choice of item.selected) {
        if (choice.value === OTHER_VALUE) {
          lines.push(`- Other: ${md(item.other_text ?? '')}`);
        } else {
          lines.push(`- ${md(choice.label)}`);
        }
      }
    }
  }

  const out = lines.join('\n').trimEnd() + '\n';
  return out.length > DIGEST_MAX_CHARS ? out.slice(0, DIGEST_MAX_CHARS) + DIGEST_TRUNCATED : out;
}
