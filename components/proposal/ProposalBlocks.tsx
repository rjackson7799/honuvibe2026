// The HTML renderer of proposal-markdown's blocks — used by the client page
// (slice B) AND the admin editor's preview, so what Ryan previews is what the
// client sees. NOT CommunityMarkdown: that accepts a superset (links, HTML,
// tables) and would break parity with the PDF. Every span is a text node;
// nothing here ever interprets HTML. Server-safe (no hooks), also fine in a
// client component.

import type { Block, Span } from '@/lib/studio/engagement/proposal-markdown';

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </>
  );
}

export function ProposalBlocks({ blocks, className }: { blocks: Block[]; className?: string }) {
  return (
    <div className={className} data-proposal-blocks>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return b.level === 1 ? (
            <h3 key={i}>
              <Spans spans={b.spans} />
            </h3>
          ) : (
            <h4 key={i}>
              <Spans spans={b.spans} />
            </h4>
          );
        }
        if (b.type === 'bullets') {
          return (
            <ul key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Spans spans={b.spans} />
          </p>
        );
      })}
    </div>
  );
}
