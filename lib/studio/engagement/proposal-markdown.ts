// ONE markdown block parser for the proposal, so page = PDF = editor preview
// by construction. Supports EXACTLY: paragraphs, `#` / `##` headings, `-`
// bullet lists, and inline `**bold**`. Anything else — links, images,
// tables, HTML, code fences, `###`, `*` bullets, underscores, backticks — is
// rendered as its LITERAL TEXT in all three renderers (ProposalBlocks.tsx and
// blocksToPdf consume these blocks; neither ever interprets HTML). The AI
// system prompt names this subset. Pure.

export interface Span {
  text: string;
  bold: boolean;
}

export type Block =
  | { type: 'heading'; level: 1 | 2; spans: Span[] }
  | { type: 'paragraph'; spans: Span[] }
  | { type: 'bullets'; items: Span[][] };

/** Inline: `**bold**` pairs only; an unterminated or empty pair stays literal. */
export function parseSpans(text: string): Span[] {
  const spans: Span[] = [];
  let buffer = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2);
      if (close > i + 2) {
        if (buffer) spans.push({ text: buffer, bold: false });
        buffer = '';
        spans.push({ text: text.slice(i + 2, close), bold: true });
        i = close + 2;
        continue;
      }
    }
    buffer += text[i];
    i += 1;
  }
  if (buffer) spans.push({ text: buffer, bold: false });
  return spans;
}

export function parseProposalMarkdown(bodyMd: string): Block[] {
  const lines = (bodyMd ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', spans: parseSpans(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ type: 'bullets', items: bullets.map((b) => parseSpans(b)) });
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      flushBullets();
      continue;
    }
    const heading = /^(#{1,2}) (.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushBullets();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2, spans: parseSpans(heading[2].trim()) });
      continue;
    }
    if (line.startsWith('- ')) {
      flushParagraph();
      bullets.push(line.slice(2).trim());
      continue;
    }
    flushBullets();
    paragraph.push(line);
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

function spansText(spans: Span[]): string {
  return spans.map((s) => s.text).join('');
}

/** The text content of the blocks, joined by single spaces — the parity oracle for the renderers. */
export function blocksToText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'bullets') parts.push(...b.items.map(spansText));
    else parts.push(spansText(b.spans));
  }
  return parts.join(' ');
}
