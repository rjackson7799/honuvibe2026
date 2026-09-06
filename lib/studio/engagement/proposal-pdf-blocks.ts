// The PDF renderer of proposal-markdown's blocks, kept separate from
// generate-proposal-pdf.ts so the parity test can drive it with stub
// primitives (the real @react-pdf/renderer needs a Node host with fonts).
// Takes the react-pdf primitives as parameters; emits plain React elements.

import React from 'react';
import type { Block, Span } from './proposal-markdown';
import type { EngagementLocale } from './types';

export interface PdfPrimitives {
  Text: React.ElementType;
  View: React.ElementType;
  styles: {
    h1: object;
    h2: object;
    p: object;
    bullet: object;
    bulletDot: object;
    bulletText: object;
    bold: object;
  };
}

const h = React.createElement;

function spans(items: Span[], prim: PdfPrimitives): React.ReactNode[] {
  return items.map((s, i) => (s.bold ? h(prim.Text, { key: i, style: prim.styles.bold }, s.text) : s.text));
}

export function blocksToPdf(blocks: Block[], locale: EngagementLocale, prim: PdfPrimitives): React.ReactNode[] {
  void locale; // typography is carried by the styles the caller built for the locale
  return blocks.map((b, i) => {
    if (b.type === 'heading') {
      return h(prim.Text, { key: i, style: b.level === 1 ? prim.styles.h1 : prim.styles.h2 }, ...spans(b.spans, prim));
    }
    if (b.type === 'bullets') {
      return h(
        prim.View,
        { key: i },
        ...b.items.map((item, j) =>
          h(
            prim.View,
            { key: j, style: prim.styles.bullet },
            h(prim.Text, { style: prim.styles.bulletDot }, '•'),
            h(prim.Text, { style: prim.styles.bulletText }, ...spans(item, prim)),
          ),
        ),
      );
    }
    return h(prim.Text, { key: i, style: prim.styles.p }, ...spans(b.spans, prim));
  });
}
